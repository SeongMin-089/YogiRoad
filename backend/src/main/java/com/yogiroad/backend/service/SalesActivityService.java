package com.yogiroad.backend.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteBatch;
import com.yogiroad.backend.dto.SalesActivityCreateRequest;
import com.yogiroad.backend.exception.FirestoreOperationException;
import com.yogiroad.backend.exception.SalesActivityNotFoundException;
import com.yogiroad.backend.exception.SalesTargetNotFoundException;
import com.yogiroad.backend.model.SalesActivity;
import com.yogiroad.backend.model.SalesActivityType;
import com.yogiroad.backend.util.FirestoreDocumentIds;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import org.springframework.stereotype.Service;

@Service
public class SalesActivityService {

	private static final String SALES_TARGETS_COLLECTION = "salesTargets";
	private static final String ACTIVITIES_COLLECTION = "salesActivities";
	private static final int FIRESTORE_BATCH_LIMIT = 500;

	private final Firestore firestore;

	public SalesActivityService(Firestore firestore) {
		this.firestore = firestore;
	}

	public SalesActivity create(String userId, String storeId, SalesActivityCreateRequest request) {
		requireSalesTarget(userId, storeId);

		DocumentReference document = firestore.collection(ACTIVITIES_COLLECTION).document();
		SalesActivity activity = new SalesActivity(
				document.getId(),
				userId,
				storeId,
				request.type(),
				request.content().trim(),
				request.nextActionAt(),
				Instant.now()
		);

		await(document.create(toDocument(activity)), "영업 활동 등록 중 오류가 발생했습니다.");
		return activity;
	}

	public List<SalesActivity> findAll(String userId, String storeId) {
		requireSalesTarget(userId, storeId);
		return findAll(userId).stream()
				.filter(activity -> activity.storeId().equals(storeId))
				.sorted(Comparator.comparing(SalesActivity::createdAt).reversed())
				.toList();
	}

	public List<SalesActivity> findAll(String userId) {
		QuerySnapshot snapshot = await(
				firestore.collection(ACTIVITIES_COLLECTION).whereEqualTo("userId", userId).get(),
				"영업 활동 목록 조회 중 오류가 발생했습니다."
		);
		return snapshot.getDocuments().stream().map(this::fromDocument).toList();
	}

	public List<SalesActivity> findUpcoming(String userId, Instant from, Instant to, int limit) {
		return findAll(userId).stream()
				.filter(activity -> activity.nextActionAt() != null)
				.filter(activity -> !activity.nextActionAt().isBefore(from))
				.filter(activity -> !activity.nextActionAt().isAfter(to))
				.sorted(Comparator.comparing(SalesActivity::nextActionAt))
				.limit(limit)
				.toList();
	}

	public void delete(String userId, String storeId, String activityId) {
		requireSalesTarget(userId, storeId);
		DocumentReference document = firestore.collection(ACTIVITIES_COLLECTION).document(activityId);
		DocumentSnapshot snapshot = await(document.get(), "영업 활동 삭제 전 조회 중 오류가 발생했습니다.");
		if (!snapshot.exists()
				|| !userId.equals(snapshot.getString("userId"))
				|| !storeId.equals(snapshot.getString("storeId"))) {
			throw new SalesActivityNotFoundException(activityId);
		}

		await(document.delete(), "영업 활동 삭제 중 오류가 발생했습니다.");
	}

	public void deleteAllByStoreId(String userId, String storeId) {
		QuerySnapshot snapshot = await(
				firestore.collection(ACTIVITIES_COLLECTION).whereEqualTo("userId", userId).get(),
				"영업 대상의 활동 기록 조회 중 오류가 발생했습니다."
		);
		List<QueryDocumentSnapshot> documents = snapshot.getDocuments().stream()
				.filter(document -> storeId.equals(document.getString("storeId")))
				.toList();

		for (int start = 0; start < documents.size(); start += FIRESTORE_BATCH_LIMIT) {
			int end = Math.min(start + FIRESTORE_BATCH_LIMIT, documents.size());
			WriteBatch batch = firestore.batch();
			documents.subList(start, end).forEach(document -> batch.delete(document.getReference()));
			await(batch.commit(), "영업 대상의 활동 기록 삭제 중 오류가 발생했습니다.");
		}
	}

	private void requireSalesTarget(String userId, String storeId) {
		DocumentSnapshot snapshot = await(
				firestore.collection(SALES_TARGETS_COLLECTION)
						.document(FirestoreDocumentIds.salesTarget(userId, storeId))
						.get(),
				"영업 대상 확인 중 오류가 발생했습니다."
		);
		if (!snapshot.exists() || !userId.equals(snapshot.getString("userId"))) {
			throw new SalesTargetNotFoundException(storeId);
		}
	}

	private Map<String, Object> toDocument(SalesActivity activity) {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("id", activity.id());
		data.put("userId", activity.userId());
		data.put("storeId", activity.storeId());
		data.put("type", activity.type().name());
		data.put("content", activity.content());
		data.put("nextActionAt", toTimestamp(activity.nextActionAt()));
		data.put("createdAt", toTimestamp(activity.createdAt()));
		return data;
	}

	private Timestamp toTimestamp(Instant value) {
		if (value == null) return null;
		return Timestamp.ofTimeSecondsAndNanos(value.getEpochSecond(), value.getNano());
	}

	private SalesActivity fromDocument(DocumentSnapshot document) {
		try {
			String userId = document.getString("userId");
			String storeId = document.getString("storeId");
			String type = document.getString("type");
			String content = document.getString("content");
			Timestamp createdAt = document.getTimestamp("createdAt");
			if (userId == null || storeId == null || type == null || content == null || createdAt == null) {
				throw new IllegalStateException("필수 필드가 없습니다.");
			}

			Timestamp nextActionAt = document.getTimestamp("nextActionAt");
			String id = document.getString("id");
			return new SalesActivity(
					id == null ? document.getId() : id,
					userId,
					storeId,
					SalesActivityType.valueOf(type),
					content,
					nextActionAt == null ? null : nextActionAt.toSqlTimestamp().toInstant(),
					createdAt.toSqlTimestamp().toInstant()
			);
		} catch (RuntimeException exception) {
			throw new FirestoreOperationException("영업 활동 데이터를 읽는 중 오류가 발생했습니다.", exception);
		}
	}

	private <T> T await(ApiFuture<T> future, String errorMessage) {
		try {
			return future.get();
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw new FirestoreOperationException(errorMessage, exception);
		} catch (ExecutionException exception) {
			throw new FirestoreOperationException(errorMessage, exception.getCause());
		}
	}
}
