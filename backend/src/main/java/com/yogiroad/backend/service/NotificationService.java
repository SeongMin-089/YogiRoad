package com.yogiroad.backend.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.FieldValue;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.SetOptions;
import com.yogiroad.backend.dto.NotificationPageResponse;
import com.yogiroad.backend.dto.NotificationResponse;
import com.yogiroad.backend.dto.RestaurantLicenseCandidate;
import com.yogiroad.backend.exception.FirestoreOperationException;
import com.yogiroad.backend.exception.NotificationNotFoundException;
import com.yogiroad.backend.util.FirestoreDocumentIds;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

	public static final String NEW_RESTAURANT_LICENSE = "NEW_RESTAURANT_LICENSE";
	private static final String COLLECTION_NAME = "userNotifications";
	private static final String ITEMS_COLLECTION = "items";
	private static final int READ_ALL_BATCH_SIZE = 400;

	private final Firestore firestore;

	public NotificationService(Firestore firestore) {
		this.firestore = firestore;
	}

	public NotificationPageResponse findAll(String userId, int page, int size) {
		QuerySnapshot snapshot = await(
				items(userId)
						.orderBy("createdAt", Query.Direction.DESCENDING)
						.offset(page * size)
						.limit(size + 1)
						.get(),
				"알림 목록을 불러오지 못했습니다."
		);
		boolean hasNext = snapshot.size() > size;
		List<NotificationResponse> notifications = snapshot.getDocuments().stream()
				.limit(size)
				.map(this::fromDocument)
				.toList();
		return new NotificationPageResponse(notifications, page, size, hasNext);
	}

	public long unreadCount(String userId) {
		DocumentSnapshot snapshot = await(userDocument(userId).get(), "읽지 않은 알림 수를 불러오지 못했습니다.");
		Long value = snapshot.getLong("unreadCount");
		return value == null ? 0 : Math.max(0, value);
	}

	public void markRead(String userId, String notificationId) {
		DocumentReference parent = userDocument(userId);
		DocumentReference notification = parent.collection(ITEMS_COLLECTION).document(notificationId);
		await(firestore.runTransaction(transaction -> {
			DocumentSnapshot snapshot = await(transaction.get(notification), "알림을 확인하지 못했습니다.");
			DocumentSnapshot parentSnapshot = await(transaction.get(parent), "읽지 않은 알림 수를 확인하지 못했습니다.");
			if (!snapshot.exists() || !userId.equals(snapshot.getString("userId"))) {
				throw new NotificationNotFoundException();
			}
			if (Boolean.TRUE.equals(snapshot.getBoolean("isRead"))) return null;
			Instant now = Instant.now();
			Long currentUnreadCount = parentSnapshot.getLong("unreadCount");
			transaction.update(notification, Map.of("isRead", true, "readAt", toTimestamp(now)));
			transaction.set(parent, Map.of(
					"userId", userId,
					"unreadCount", Math.max(0, (currentUnreadCount == null ? 0 : currentUnreadCount) - 1),
					"updatedAt", toTimestamp(now)
			), SetOptions.merge());
			return null;
		}), "알림을 읽음 처리하지 못했습니다.");
	}

	public void markAllRead(String userId) {
		DocumentReference parent = userDocument(userId);
		while (true) {
			QuerySnapshot unread = await(
					parent.collection(ITEMS_COLLECTION).whereEqualTo("isRead", false)
							.limit(READ_ALL_BATCH_SIZE).get(),
					"읽지 않은 알림을 불러오지 못했습니다."
			);
			if (unread.isEmpty()) return;
			int changed = await(firestore.runTransaction(transaction -> {
				DocumentSnapshot parentSnapshot = await(transaction.get(parent), "읽지 않은 알림 수를 확인하지 못했습니다.");
				DocumentReference[] references = unread.getDocuments().stream()
						.map(DocumentSnapshot::getReference).toArray(DocumentReference[]::new);
				List<DocumentSnapshot> currentSnapshots = await(
						transaction.getAll(references), "알림 상태를 확인하지 못했습니다.");
				List<DocumentReference> stillUnread = new java.util.ArrayList<>();
				for (DocumentSnapshot current : currentSnapshots) {
					if (current.exists() && !Boolean.TRUE.equals(current.getBoolean("isRead"))) {
						stillUnread.add(current.getReference());
					}
				}
				if (stillUnread.isEmpty()) return 0;
				Instant now = Instant.now();
				Long currentUnreadCount = parentSnapshot.getLong("unreadCount");
				stillUnread.forEach(document -> transaction.update(
						document, Map.of("isRead", true, "readAt", toTimestamp(now))));
				transaction.set(parent, Map.of(
						"userId", userId,
						"unreadCount", Math.max(0,
								(currentUnreadCount == null ? 0 : currentUnreadCount) - stillUnread.size()),
						"updatedAt", toTimestamp(now)
				), SetOptions.merge());
				return stillUnread.size();
			}), "알림을 모두 읽음 처리하지 못했습니다.");
			if (changed == 0) return;
		}
	}

	public boolean createRestaurantLicenseNotification(
			String userId,
			RestaurantLicenseCandidate candidate,
			String regionKey,
			Instant createdAt
	) {
		DocumentReference parent = userDocument(userId);
		String id = FirestoreDocumentIds.notification(
				userId, NEW_RESTAURANT_LICENSE, candidate.managementNumber());
		DocumentReference notification = parent.collection(ITEMS_COLLECTION).document(id);
		return await(firestore.runTransaction(transaction -> {
			DocumentSnapshot existing = await(transaction.get(notification), "알림 중복 여부를 확인하지 못했습니다.");
			if (existing.exists()) return false;
			transaction.set(notification, toDocument(userId, candidate, regionKey, createdAt));
			transaction.set(parent, Map.of(
					"userId", userId,
					"unreadCount", FieldValue.increment(1),
					"updatedAt", toTimestamp(createdAt)
			), SetOptions.merge());
			return true;
		}), "신규 음식점 알림을 저장하지 못했습니다.");
	}

	private DocumentReference userDocument(String userId) {
		return firestore.collection(COLLECTION_NAME).document(FirestoreDocumentIds.notificationUser(userId));
	}

	private com.google.cloud.firestore.CollectionReference items(String userId) {
		return userDocument(userId).collection(ITEMS_COLLECTION);
	}

	private Map<String, Object> toDocument(
			String userId,
			RestaurantLicenseCandidate candidate,
			String regionKey,
			Instant createdAt
	) {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("userId", userId);
		data.put("type", NEW_RESTAURANT_LICENSE);
		data.put("managementNumber", candidate.managementNumber());
		data.put("storeName", candidate.storeName());
		data.put("businessType", candidate.businessType());
		data.put("address", candidate.address());
		data.put("roadAddress", candidate.roadAddress());
		data.put("lotNumberAddress", candidate.lotNumberAddress());
		data.put("licenseDate", candidate.licenseDate().toString());
		data.put("regionKey", regionKey);
		data.put("latitude", candidate.latitude());
		data.put("longitude", candidate.longitude());
		data.put("isRead", false);
		data.put("createdAt", toTimestamp(createdAt));
		return data;
	}

	private NotificationResponse fromDocument(DocumentSnapshot document) {
		try {
			Timestamp createdAt = document.getTimestamp("createdAt");
			Timestamp readAt = document.getTimestamp("readAt");
			String licenseDate = document.getString("licenseDate");
			if (createdAt == null || licenseDate == null) throw new IllegalStateException("필수 필드가 없습니다.");
			return new NotificationResponse(
					document.getId(),
					document.getString("type"),
					document.getString("managementNumber"),
					document.getString("storeName"),
					document.getString("businessType"),
					document.getString("address"),
					document.getString("roadAddress"),
					document.getString("lotNumberAddress"),
					LocalDate.parse(licenseDate),
					document.getString("regionKey"),
					document.getDouble("latitude"),
					document.getDouble("longitude"),
					Boolean.TRUE.equals(document.getBoolean("isRead")),
					createdAt.toSqlTimestamp().toInstant(),
					readAt == null ? null : readAt.toSqlTimestamp().toInstant()
			);
		} catch (DateTimeParseException | IllegalStateException exception) {
			throw new FirestoreOperationException("알림 데이터를 읽는 중 오류가 발생했습니다.", exception);
		}
	}

	private Timestamp toTimestamp(Instant value) {
		return Timestamp.ofTimeSecondsAndNanos(value.getEpochSecond(), value.getNano());
	}

	private <T> T await(ApiFuture<T> future, String errorMessage) {
		try {
			return future.get();
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw new FirestoreOperationException(errorMessage, exception);
		} catch (ExecutionException exception) {
			if (exception.getCause() instanceof RuntimeException runtimeException) throw runtimeException;
			throw new FirestoreOperationException(errorMessage, exception.getCause());
		}
	}
}
