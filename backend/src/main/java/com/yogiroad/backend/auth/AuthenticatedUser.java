package com.yogiroad.backend.auth;

public record AuthenticatedUser(
		String userId,
		String provider,
		String nickname,
		String profileImageUrl
) {
}
