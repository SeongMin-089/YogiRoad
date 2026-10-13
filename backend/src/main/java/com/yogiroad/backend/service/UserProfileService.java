package com.yogiroad.backend.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.SetOptions;
import com.yogiroad.backend.auth.AuthenticatedUser;
import com.yogiroad.backend.dto.UserProfileResponse;
import com.yogiroad.backend.dto.UserProfileUpdateRequest;
import com.yogiroad.backend.exception.FirestoreOperationException;
import com.yogiroad.backend.util.FirestoreDocumentIds;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import org.springframework.stereotype.Service;

@Service
public class UserProfileService {
	private static final String COLLECTION_NAME = "userProfiles";

	private final Firestore firestore;

	public UserProfileService(Firestore firestore) {
		this.firestore = firestore;
	}

	public UserProfileResponse find(AuthenticatedUser user) {
		DocumentSnapshot document = await(profileDocument(user.userId()).get(), "사용자 정보를 불러오지 못했습니다.");
		return toResponse(user, document);
	}

	public UserProfileResponse update(AuthenticatedUser user, UserProfileUpdateRequest request) {
		Instant updatedAt = Instant.now();
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("userId", user.userId());
		data.put("displayName", normalize(request.displayName()));
		data.put("managedRegion", regionDocument(request.managedRegion()));
		data.put("updatedAt", Timestamp.ofTimeSecondsAndNanos(updatedAt.getEpochSecond(), updatedAt.getNano()));
		await(profileDocument(user.userId()).set(data, SetOptions.merge()), "사용자 정보를 저장하지 못했습니다.");
		return find(user);
	}

	private DocumentReference profileDocument(String userId) {
		return firestore.collection(COLLECTION_NAME).document(FirestoreDocumentIds.userProfile(userId));
	}

	private Map<String, Object> regionDocument(UserProfileUpdateRequest.ManagedRegion region) {
		if (region == null) return null;
		String first = normalize(region.region1DepthName());
		String second = normalize(region.region2DepthName());
		String third = normalize(region.region3DepthName());
		if (first == null && second == null && third == null) return null;
		if (first == null || second == null) {
			throw new IllegalArgumentException("담당 지역의 시·도와 시·군·구를 입력해 주세요.");
		}
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("region1DepthName", first);
		result.put("region2DepthName", second);
		result.put("region3DepthName", third);
		return result;
	}

	private UserProfileResponse toResponse(AuthenticatedUser user, DocumentSnapshot document) {
		String displayName = document.exists() ? normalize(document.getString("displayName")) : null;
		String kakaoNickname = normalize(user.nickname());
		String kakaoProfileImageUrl = normalize(user.profileImageUrl());
		UserProfileResponse.ManagedRegion managedRegion = readRegion(document);
		Timestamp updatedAt = document.exists() ? document.getTimestamp("updatedAt") : null;
		return new UserProfileResponse(
				user.userId(),
				user.provider(),
				kakaoNickname,
				kakaoProfileImageUrl,
				displayName,
				displayName != null ? displayName : kakaoNickname,
				null,
				kakaoProfileImageUrl,
				managedRegion,
				updatedAt == null ? null : updatedAt.toSqlTimestamp().toInstant()
		);
	}

	@SuppressWarnings("unchecked")
	private UserProfileResponse.ManagedRegion readRegion(DocumentSnapshot document) {
		if (!document.exists()) return null;
		Object value = document.get("managedRegion");
		if (!(value instanceof Map<?, ?> raw)) return null;
		Map<String, Object> region = (Map<String, Object>) raw;
		String first = normalize(asString(region.get("region1DepthName")));
		String second = normalize(asString(region.get("region2DepthName")));
		String third = normalize(asString(region.get("region3DepthName")));
		if (first == null && second == null && third == null) return null;
		String displayName = String.join(" ", java.util.stream.Stream.of(first, second, third)
				.filter(valuePart -> valuePart != null && !valuePart.isBlank()).toList());
		return new UserProfileResponse.ManagedRegion(first, second, third, displayName);
	}

	private String asString(Object value) {
		return value instanceof String string ? string : null;
	}

	private String normalize(String value) {
		if (value == null) return null;
		String normalized = value.trim();
		return normalized.isEmpty() ? null : normalized;
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
