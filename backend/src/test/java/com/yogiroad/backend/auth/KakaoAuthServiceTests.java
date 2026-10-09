package com.yogiroad.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class KakaoAuthServiceTests {

	@Test
	void kakaoIdMapsToStableNamespacedUserId() {
		assertEquals("kakao:987654321", KakaoAuthService.toUserId(987654321L));
	}

	@Test
	void invalidKakaoIdIsRejected() {
		assertThrows(IllegalArgumentException.class, () -> KakaoAuthService.toUserId(0));
	}
}
