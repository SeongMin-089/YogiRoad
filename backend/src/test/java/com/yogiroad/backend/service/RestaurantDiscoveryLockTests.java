package com.yogiroad.backend.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.google.api.core.ApiFutures;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.SetOptions;
import com.google.cloud.firestore.Transaction;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RestaurantDiscoveryLockTests {

	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-13T00:00:00Z"), ZoneOffset.UTC);

	private final Firestore firestore = mock(Firestore.class);
	private final CollectionReference locks = mock(CollectionReference.class);
	private final DocumentReference lock = mock(DocumentReference.class);
	private final Transaction transaction = mock(Transaction.class);
	private final AtomicReference<Lease> lease = new AtomicReference<>();

	@BeforeEach
	@SuppressWarnings({"unchecked", "rawtypes"})
	void setUpTransactionalLockStore() {
		when(firestore.collection("restaurantDiscoveryLocks")).thenReturn(locks);
		when(locks.document("global")).thenReturn(lock);
		when(transaction.get(lock)).thenAnswer(ignored -> {
			Lease current = lease.get();
			DocumentSnapshot snapshot = mock(DocumentSnapshot.class);
			when(snapshot.exists()).thenReturn(current != null);
			when(snapshot.getString("holder")).thenReturn(current == null ? null : current.holder());
			when(snapshot.getTimestamp("expiresAt")).thenReturn(current == null ? null : current.expiresAt());
			return ApiFutures.immediateFuture(snapshot);
		});
		when(transaction.set(eq(lock), anyMap())).thenAnswer(invocation -> {
			Map<String, Object> value = invocation.getArgument(1);
			lease.set(new Lease((String) value.get("holder"), (Timestamp) value.get("expiresAt")));
			return transaction;
		});
		when(transaction.set(eq(lock), anyMap(), any(SetOptions.class))).thenAnswer(invocation -> {
			Map<String, Object> value = invocation.getArgument(1);
			lease.set(new Lease((String) value.get("holder"), (Timestamp) value.get("expiresAt")));
			return transaction;
		});
		when(transaction.update(eq(lock), eq("expiresAt"), any())).thenAnswer(invocation -> {
			Lease current = lease.get();
			lease.set(new Lease(current.holder(), invocation.getArgument(2)));
			return transaction;
		});
		when(firestore.runTransaction(any())).thenAnswer(invocation -> {
			Transaction.Function callback = invocation.getArgument(0);
			synchronized (lease) {
				return ApiFutures.immediateFuture(callback.updateCallback(transaction));
			}
		});
	}

	@Test
	void onlyOneInstanceOwnsAndRenewsTheLeaseAtATime() {
		RestaurantDiscoveryService first = service();
		RestaurantDiscoveryService second = service();

		assertTrue(first.acquireLock());
		assertFalse(second.acquireLock());
		assertTrue(first.renewLock());
		assertFalse(second.renewLock());

		first.releaseLock();

		assertTrue(second.acquireLock());
	}

	private RestaurantDiscoveryService service() {
		return new RestaurantDiscoveryService(
				firestore, mock(RestaurantLicenseService.class), mock(NotificationService.class),
				50, 600_000, Duration.ofMinutes(15), CLOCK);
	}

	private record Lease(String holder, Timestamp expiresAt) {
	}
}
