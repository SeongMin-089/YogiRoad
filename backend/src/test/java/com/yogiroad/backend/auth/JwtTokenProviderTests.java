package com.yogiroad.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.jsonwebtoken.JwtException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class JwtTokenProviderTests {

	private static final String SECRET = "test-secret-that-is-longer-than-thirty-two-bytes";

	@Test
	void issuedTokenCanBeVerified() {
		Clock clock = Clock.fixed(Instant.parse("2026-10-09T00:00:00Z"), ZoneOffset.UTC);
		JwtTokenProvider provider = new JwtTokenProvider(SECRET, Duration.ofDays(7), clock);
		AuthenticatedUser expected = new AuthenticatedUser("kakao:123", "kakao", "테스터", "https://image.test/profile.png");

		AuthenticatedUser actual = provider.verify(provider.issue(expected));

		assertEquals(expected, actual);
	}

	@Test
	void tokenSignedWithAnotherSecretIsRejected() {
		Clock clock = Clock.fixed(Instant.parse("2026-10-09T00:00:00Z"), ZoneOffset.UTC);
		JwtTokenProvider issuer = new JwtTokenProvider(SECRET, Duration.ofDays(7), clock);
		JwtTokenProvider verifier = new JwtTokenProvider(
				"another-test-secret-that-is-longer-than-thirty-two-bytes", Duration.ofDays(7), clock);
		String token = issuer.issue(new AuthenticatedUser("kakao:123", "kakao", "테스터", null));

		assertThrows(JwtException.class, () -> verifier.verify(token));
	}
}
