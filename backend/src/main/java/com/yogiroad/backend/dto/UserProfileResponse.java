package com.yogiroad.backend.dto;

import java.time.Instant;

public record UserProfileResponse(
		String userId,
		String provider,
		String kakaoNickname,
		String kakaoProfileImageUrl,
		String displayName,
		String effectiveName,
		String customProfileImageUrl,
		String effectiveProfileImageUrl,
		ManagedRegion managedRegion,
		Instant updatedAt
) {
	public record ManagedRegion(
			String region1DepthName,
			String region2DepthName,
			String region3DepthName,
			String displayName
	) {
	}
}
