package com.yogiroad.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.yogiroad.backend.dto.LoginSessionStatusResponse;
import com.yogiroad.backend.exception.InvalidOAuthStateException;
import com.yogiroad.backend.exception.LoginSessionNotFoundException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class LoginSessionStoreTests {

	@Test
	void newSessionIsPending() {
		LoginSessionStore store = new LoginSessionStore(Duration.ofMinutes(5),
				Clock.fixed(Instant.parse("2026-10-09T00:00:00Z"), ZoneOffset.UTC));
		LoginSessionStore.LoginSession session = store.create();

		LoginSessionStatusResponse status = store.poll(session.loginId());

		assertEquals(LoginSessionStatus.PENDING, status.status());
		assertNotNull(store.stateForLogin(session.loginId()));
	}

	@Test
	void expiredSessionReturnsExpiredOnce() {
		MutableClock clock = new MutableClock(Instant.parse("2026-10-09T00:00:00Z"));
		LoginSessionStore store = new LoginSessionStore(Duration.ofMinutes(5), clock);
		LoginSessionStore.LoginSession session = store.create();
		clock.advance(Duration.ofMinutes(6));

		assertEquals(LoginSessionStatus.EXPIRED, store.poll(session.loginId()).status());
		assertThrows(LoginSessionNotFoundException.class, () -> store.poll(session.loginId()));
	}

	@Test
	void mismatchedStateIsRejected() {
		LoginSessionStore store = new LoginSessionStore(Duration.ofMinutes(5), Clock.systemUTC());
		store.create();

		assertThrows(InvalidOAuthStateException.class, () -> store.beginCallback("wrong-state"));
	}

	@Test
	void successfulTokenIsReturnedOnlyOnce() {
		LoginSessionStore store = new LoginSessionStore(Duration.ofMinutes(5), Clock.systemUTC());
		LoginSessionStore.LoginSession session = store.create();
		String loginId = store.beginCallback(session.state());
		store.completeSuccess(loginId, "app-jwt");

		assertEquals("app-jwt", store.poll(loginId).accessToken());
		assertThrows(LoginSessionNotFoundException.class, () -> store.poll(loginId));
	}

	private static final class MutableClock extends Clock {
		private Instant instant;

		private MutableClock(Instant instant) {
			this.instant = instant;
		}

		private void advance(Duration duration) {
			instant = instant.plus(duration);
		}

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}

		@Override
		public Instant instant() {
			return instant;
		}
	}
}
