package com.yogiroad.backend.auth;

import com.yogiroad.backend.dto.LoginSessionStatusResponse;
import com.yogiroad.backend.exception.InvalidOAuthStateException;
import com.yogiroad.backend.exception.LoginSessionNotFoundException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class LoginSessionStore {

	private static final SecureRandom SECURE_RANDOM = new SecureRandom();
	private final Map<String, Session> sessions = new ConcurrentHashMap<>();
	private final Map<String, String> loginIdsByState = new ConcurrentHashMap<>();
	private final Duration ttl;
	private final Clock clock;

	@Autowired
	public LoginSessionStore(@Value("${yogiroad.auth.session-ttl}") Duration ttl) {
		this(ttl, Clock.systemUTC());
	}

	LoginSessionStore(Duration ttl, Clock clock) {
		this.ttl = ttl;
		this.clock = clock;
	}

	public LoginSession create() {
		byte[] stateBytes = new byte[32];
		SECURE_RANDOM.nextBytes(stateBytes);
		String loginId = UUID.randomUUID().toString();
		String state = Base64.getUrlEncoder().withoutPadding().encodeToString(stateBytes);
		Session session = new Session(loginId, state, clock.instant().plus(ttl));
		sessions.put(loginId, session);
		loginIdsByState.put(state, loginId);
		return new LoginSession(loginId, state);
	}

	public synchronized String stateForLogin(String loginId) {
		Session session = requireSession(loginId);
		if (expireIfNecessary(session)) throw new LoginSessionNotFoundException("로그인 세션이 만료되었습니다.");
		if (session.status != LoginSessionStatus.PENDING || session.callbackStarted) {
			throw new LoginSessionNotFoundException("이미 처리된 로그인 세션입니다.");
		}
		return session.state;
	}

	public synchronized String beginCallback(String state) {
		String loginId = state == null ? null : loginIdsByState.get(state);
		Session session = loginId == null ? null : sessions.get(loginId);
		if (session == null || !session.state.equals(state) || expireIfNecessary(session)) {
			throw new InvalidOAuthStateException();
		}
		if (session.status != LoginSessionStatus.PENDING || session.callbackStarted) {
			throw new InvalidOAuthStateException();
		}
		session.callbackStarted = true;
		return loginId;
	}

	public synchronized void completeSuccess(String loginId, String accessToken) {
		Session session = requireSession(loginId);
		if (expireIfNecessary(session)) return;
		session.status = LoginSessionStatus.SUCCESS;
		session.accessToken = accessToken;
		loginIdsByState.remove(session.state);
	}

	public synchronized void completeFailure(String loginId, String message) {
		Session session = sessions.get(loginId);
		if (session == null || expireIfNecessary(session)) return;
		session.status = LoginSessionStatus.FAILED;
		session.message = message;
		loginIdsByState.remove(session.state);
	}

	public synchronized void rejectByState(String state, String message) {
		String loginId = beginCallback(state);
		completeFailure(loginId, message);
	}

	public synchronized LoginSessionStatusResponse poll(String loginId) {
		Session session = requireSession(loginId);
		if (expireIfNecessary(session)) {
			removeSession(session);
			return new LoginSessionStatusResponse(LoginSessionStatus.EXPIRED, null, "로그인 세션이 만료되었습니다.");
		}
		if (session.status == LoginSessionStatus.SUCCESS) {
			LoginSessionStatusResponse response = new LoginSessionStatusResponse(
					LoginSessionStatus.SUCCESS, session.accessToken, null);
			removeSession(session);
			return response;
		}
		if (session.status == LoginSessionStatus.FAILED) {
			LoginSessionStatusResponse response = new LoginSessionStatusResponse(
					LoginSessionStatus.FAILED, null, session.message);
			removeSession(session);
			return response;
		}
		return new LoginSessionStatusResponse(LoginSessionStatus.PENDING, null, null);
	}

	private Session requireSession(String loginId) {
		Session session = sessions.get(loginId);
		if (session == null) throw new LoginSessionNotFoundException("로그인 세션을 찾을 수 없습니다.");
		return session;
	}

	private boolean expireIfNecessary(Session session) {
		if (clock.instant().isBefore(session.expiresAt)) return false;
		session.status = LoginSessionStatus.EXPIRED;
		loginIdsByState.remove(session.state);
		return true;
	}

	private void removeSession(Session session) {
		sessions.remove(session.loginId);
		loginIdsByState.remove(session.state);
		session.accessToken = null;
	}

	public record LoginSession(String loginId, String state) {
	}

	private static final class Session {
		private final String loginId;
		private final String state;
		private final Instant expiresAt;
		private LoginSessionStatus status = LoginSessionStatus.PENDING;
		private boolean callbackStarted;
		private String accessToken;
		private String message;

		private Session(String loginId, String state, Instant expiresAt) {
			this.loginId = loginId;
			this.state = state;
			this.expiresAt = expiresAt;
		}
	}
}
