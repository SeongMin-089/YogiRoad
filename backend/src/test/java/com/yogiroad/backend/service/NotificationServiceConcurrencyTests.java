package com.yogiroad.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.api.core.ApiFutures;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.FieldValue;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.SetOptions;
import com.google.cloud.firestore.Transaction;
import com.yogiroad.backend.dto.RestaurantLicenseCandidate;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class NotificationServiceConcurrencyTests {

	private final Firestore firestore = mock(Firestore.class);
	private final CollectionReference users = mock(CollectionReference.class);
	private final DocumentReference parent = mock(DocumentReference.class);
	private final CollectionReference items = mock(CollectionReference.class);
	private final DocumentReference notification = mock(DocumentReference.class);
	private final Transaction transaction = mock(Transaction.class);
	private final AtomicBoolean exists = new AtomicBoolean(false);
	private final AtomicBoolean read = new AtomicBoolean(false);
	private final AtomicLong unreadCount = new AtomicLong(0);
	private final Object transactionLock = new Object();
	private final NotificationService service = new NotificationService(firestore);

	@BeforeEach
	@SuppressWarnings({"unchecked", "rawtypes"})
	void setUpTransactionalStore() {
		when(firestore.collection("userNotifications")).thenReturn(users);
		when(users.document(anyString())).thenReturn(parent);
		when(parent.collection("items")).thenReturn(items);
		when(items.document(anyString())).thenReturn(notification);

		when(transaction.get(notification)).thenAnswer(ignored -> {
			DocumentSnapshot snapshot = mock(DocumentSnapshot.class);
			when(snapshot.exists()).thenReturn(exists.get());
			when(snapshot.getString("userId")).thenReturn("user-a");
			when(snapshot.getBoolean("isRead")).thenReturn(read.get());
			return ApiFutures.immediateFuture(snapshot);
		});
		when(transaction.get(parent)).thenAnswer(ignored -> {
			DocumentSnapshot snapshot = mock(DocumentSnapshot.class);
			when(snapshot.getLong("unreadCount")).thenReturn(unreadCount.get());
			return ApiFutures.immediateFuture(snapshot);
		});
		when(transaction.set(eq(notification), anyMap())).thenAnswer(invocation -> {
			Map<String, Object> document = invocation.getArgument(1);
			exists.set(true);
			read.set(Boolean.TRUE.equals(document.get("isRead")));
			return transaction;
		});
		when(transaction.update(eq(notification), anyMap())).thenAnswer(invocation -> {
			Map<String, Object> updates = invocation.getArgument(1);
			if (Boolean.TRUE.equals(updates.get("isRead"))) read.set(true);
			return transaction;
		});
		when(transaction.set(eq(parent), anyMap(), any(SetOptions.class))).thenAnswer(invocation -> {
			Map<String, Object> updates = invocation.getArgument(1);
			Object nextUnread = updates.get("unreadCount");
			if (nextUnread instanceof Number number) unreadCount.set(number.longValue());
			else if (nextUnread instanceof FieldValue) unreadCount.incrementAndGet();
			return transaction;
		});
		when(firestore.runTransaction(any())).thenAnswer(invocation -> {
			Transaction.Function callback = invocation.getArgument(0);
			synchronized (transactionLock) {
				return ApiFutures.immediateFuture(callback.updateCallback(transaction));
			}
		});
	}

	@Test
	void deterministicNotificationCreationIncrementsUnreadCountOnlyOnce() {
		assertTrue(service.createRestaurantLicenseNotification(
				"user-a", candidate(), "경기도|남양주시", Instant.parse("2026-10-13T00:00:00Z")));
		assertFalse(service.createRestaurantLicenseNotification(
				"user-a", candidate(), "경기도|남양주시", Instant.parse("2026-10-13T00:01:00Z")));

		assertEquals(1, unreadCount.get());
		ArgumentCaptor<String> ids = ArgumentCaptor.forClass(String.class);
		verify(items, org.mockito.Mockito.times(2)).document(ids.capture());
		assertEquals(1, ids.getAllValues().stream().distinct().count());
	}

	@Test
	void repeatedReadRequestsDoNotDecrementBelowTheStoredState() {
		service.createRestaurantLicenseNotification(
				"user-a", candidate(), "경기도|남양주시", Instant.parse("2026-10-13T00:00:00Z"));

		service.markRead("user-a", "notification-id");
		service.markRead("user-a", "notification-id");

		assertTrue(read.get());
		assertEquals(0, unreadCount.get());
	}

	@Test
	void concurrentDuplicateCreationAndReadKeepUnreadCountConsistent() {
		service.createRestaurantLicenseNotification(
				"user-a", candidate(), "경기도|남양주시", Instant.parse("2026-10-13T00:00:00Z"));

		CompletableFuture<Boolean> duplicate = CompletableFuture.supplyAsync(() ->
				service.createRestaurantLicenseNotification(
						"user-a", candidate(), "경기도|남양주시", Instant.parse("2026-10-13T00:01:00Z")));
		CompletableFuture<Void> markRead = CompletableFuture.runAsync(() ->
				service.markRead("user-a", "notification-id"));
		CompletableFuture.allOf(duplicate, markRead).join();

		assertFalse(duplicate.join());
		assertTrue(read.get());
		assertEquals(0, unreadCount.get());
	}

	@Test
	void staleZeroCounterIsClampedWhenAnUnreadDocumentIsRead() {
		exists.set(true);
		read.set(false);
		unreadCount.set(0);

		service.markRead("user-a", "notification-id");

		assertEquals(0, unreadCount.get());
	}

	private RestaurantLicenseCandidate candidate() {
		return new RestaurantLicenseCandidate(
				"MNG-1", "license:MNG-1", "테스트 식당", LocalDate.of(2026, 10, 13),
				"01", "영업/정상", "한식", "경기도 남양주시 진접읍 1",
				"경기도 남양주시 진접읍 1", "", "", null, null, "ADDRESS_REQUIRED");
	}
}
