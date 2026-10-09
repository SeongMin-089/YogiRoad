package com.yogiroad.backend.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

	private final SecretKey key;
	private final Duration expiration;
	private final Clock clock;

	public JwtTokenProvider(
			@Value("${yogiroad.jwt.secret}") String secret,
			@Value("${yogiroad.jwt.expiration}") Duration expiration
	) {
		this(secret, expiration, Clock.systemUTC());
	}

	JwtTokenProvider(String secret, Duration expiration, Clock clock) {
		byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
		if (secretBytes.length < 32) {
			throw new IllegalArgumentException("YOGIROAD_JWT_SECRET은 32바이트 이상이어야 합니다.");
		}
		this.key = Keys.hmacShaKeyFor(secretBytes);
		this.expiration = expiration;
		this.clock = clock;
	}

	public String issue(AuthenticatedUser user) {
		Instant issuedAt = clock.instant();
		return Jwts.builder()
				.subject(user.userId())
				.claim("provider", user.provider())
				.claim("nickname", user.nickname())
				.claim("profileImageUrl", user.profileImageUrl())
				.issuedAt(Date.from(issuedAt))
				.expiration(Date.from(issuedAt.plus(expiration)))
				.signWith(key)
				.compact();
	}

	public AuthenticatedUser verify(String token) {
		Claims claims = Jwts.parser()
				.verifyWith(key)
				.clock(() -> Date.from(clock.instant()))
				.build()
				.parseSignedClaims(token)
				.getPayload();
		String userId = claims.getSubject();
		if (userId == null || userId.isBlank()) throw new IllegalArgumentException("JWT subject가 없습니다.");
		return new AuthenticatedUser(
				userId,
				claims.get("provider", String.class),
				claims.get("nickname", String.class),
				claims.get("profileImageUrl", String.class)
		);
	}
}
