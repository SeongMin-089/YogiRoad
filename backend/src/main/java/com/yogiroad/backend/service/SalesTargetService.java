package com.yogiroad.backend.service;

import com.google.api.core.ApiFuture;
import com.google.api.gax.rpc.ApiException;
import com.google.api.gax.rpc.StatusCode;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QuerySnapshot;
import com.yogiroad.backend.dto.SalesTargetCreateRequest;
import com.yogiroad.backend.dto.SalesTargetUpdateRequest;
import com.yogiroad.backend.exception.DuplicateSalesTargetException;
import com.yogiroad.backend.exception.FirestoreOperationException;
import com.yogiroad.backend.exception.SalesTargetNotFoundException;
import com.yogiroad.backend.model.SalesStatus;
import com.yogiroad.backend.model.SalesTarget;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import org.springframework.stereotype.Service;

@Service
public class SalesTargetService {

	private static final String COLLECTION_NAME = "salesTargets";

	private final Firestore firestore;
	private final SalesActivityService salesActivityService;

	public SalesTargetService(Firestore firestore, SalesActivityService salesActivityService) {
		this.firestore = firestore;
		this.salesActivityService = salesActivityService;
	}

	public SalesTarget register(SalesTargetCreateRequest request) {
		SalesTarget salesTarget = new SalesTarget(
				request.storeId(),
				request.storeName(),
				request.category(),
				request.address(),
				request.latitude(),
				request.longitude(),
				SalesStatus.미방문,
				"",
				Instant.now()
		);

		DocumentReference document = firestore.collection(COLLECTION_NAME)
				.document(salesTarget.storeId());

		try {
			document.create(toDocument(salesTarget)).get();
			return salesTarget;
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw new FirestoreOperationException("영업 대상 등록 중 오류가 발생했습니다.", exception);
		} catch (ExecutionException exception) {
			if (isAlreadyExists(exception.getCause())) {
				throw new DuplicateSalesTargetException();
			}
			throw new FirestoreOperationException("영업 대상 등록 중 오류가 발생했습니다.", exception.getCause());
		}
	}

	public List<SalesTarget> findAll() {
		ApiFuture<QuerySnapshot> future = firestore.collection(COLLECTION_NAME)
				.orderBy("registeredAt", Query.Direction.DESCENDING)
				.get();
		QuerySnapshot snapshot = await(future, "영업 대상 목록 조회 중 오류가 발생했습니다.");

		return snapshot.getDocuments().stream()
				.map(this::fromDocument)
				.toList();
	}

	public SalesTarget findByStoreId(String storeId) {
		DocumentReference reference = firestore.collection(COLLECTION_NAME).document(storeId);
		DocumentSnapshot document = await(
				reference.get(),
				"영업 대상 조회 중 오류가 발생했습니다."
		);

		if (!document.exists()) {
			throw new SalesTargetNotFoundException(storeId);
		}

		return fromDocument(document);
	}

	public SalesTarget update(String storeId, SalesTargetUpdateRequest request) {
		DocumentReference document = firestore.collection(COLLECTION_NAME).document(storeId);
		requireExisting(document, storeId, "영업 대상 수정 전 조회 중 오류가 발생했습니다.");

		Map<String, Object> updates = new LinkedHashMap<>();
		updates.put("status", request.status().name());
		updates.put("memo", request.memo());
		await(document.update(updates), "영업 대상 수정 중 오류가 발생했습니다.");

		return findByStoreId(storeId);
	}

	public void delete(String storeId) {
		DocumentReference document = firestore.collection(COLLECTION_NAME).document(storeId);
		requireExisting(document, storeId, "영업 대상 삭제 전 조회 중 오류가 발생했습니다.");
		salesActivityService.deleteAllByStoreId(storeId);
		await(document.delete(), "영업 대상 삭제 중 오류가 발생했습니다.");
	}

	private void requireExisting(DocumentReference document, String storeId, String errorMessage) {
		DocumentSnapshot snapshot = await(document.get(), errorMessage);
		if (!snapshot.exists()) {
			throw new SalesTargetNotFoundException(storeId);
		}
	}

	private Map<String, Object> toDocument(SalesTarget salesTarget) {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("storeId", salesTarget.storeId());
		data.put("storeName", salesTarget.storeName());
		data.put("category", salesTarget.category());
		data.put("address", salesTarget.address());
		data.put("latitude", salesTarget.latitude());
		data.put("longitude", salesTarget.longitude());
		data.put("status", salesTarget.status().name());
		data.put("memo", salesTarget.memo());
		data.put("registeredAt", Timestamp.ofTimeSecondsAndNanos(
				salesTarget.registeredAt().getEpochSecond(),
				salesTarget.registeredAt().getNano()
		));
		return data;
	}

	private SalesTarget fromDocument(DocumentSnapshot document) {
		try {
			String status = document.getString("status");
			Timestamp registeredAt = document.getTimestamp("registeredAt");
			if (status == null || registeredAt == null) {
				throw new IllegalStateException("필수 필드가 없습니다.");
			}

			String storeId = document.getString("storeId");
			return new SalesTarget(
					storeId == null ? document.getId() : storeId,
					document.getString("storeName"),
					document.getString("category"),
					document.getString("address"),
					document.getDouble("latitude"),
					document.getDouble("longitude"),
					SalesStatus.valueOf(status),
					document.getString("memo"),
					registeredAt.toSqlTimestamp().toInstant()
			);
		} catch (RuntimeException exception) {
			throw new FirestoreOperationException("영업 대상 데이터를 읽는 중 오류가 발생했습니다.", exception);
		}
	}

	private boolean isAlreadyExists(Throwable cause) {
		return cause instanceof ApiException apiException
				&& apiException.getStatusCode().getCode() == StatusCode.Code.ALREADY_EXISTS;
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
