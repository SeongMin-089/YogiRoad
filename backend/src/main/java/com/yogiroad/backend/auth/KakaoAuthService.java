package com.yogiroad.backend.auth;

import com.yogiroad.backend.exception.KakaoLoginException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class KakaoAuthService {
	private static final Logger log = LoggerFactory.getLogger(KakaoAuthService.class);

	private final LoginSessionStore sessionStore;
	private final KakaoOAuthClient kakaoOAuthClient;
	private final JwtTokenProvider jwtTokenProvider;

	public KakaoAuthService(
			LoginSessionStore sessionStore,
			KakaoOAuthClient kakaoOAuthClient,
			JwtTokenProvider jwtTokenProvider
	) {
		this.sessionStore = sessionStore;
		this.kakaoOAuthClient = kakaoOAuthClient;
		this.jwtTokenProvider = jwtTokenProvider;
	}

	public void completeLogin(String code, String state) {
		String loginId = sessionStore.beginCallback(state);
		try {
			KakaoOAuthClient.KakaoUser kakaoUser = kakaoOAuthClient.fetchUser(code);
			KakaoOAuthClient.Profile profile = kakaoUser.kakaoAccount() == null
					? null : kakaoUser.kakaoAccount().profile();
			String nickname = profile == null || profile.nickname() == null || profile.nickname().isBlank()
					? "카카오 사용자" : profile.nickname().trim();
			String profileImageUrl = profile == null ? null : profile.profileImageUrl();
			AuthenticatedUser user = new AuthenticatedUser(
					toUserId(kakaoUser.id()), "kakao", nickname, profileImageUrl);
			sessionStore.completeSuccess(loginId, jwtTokenProvider.issue(user));
		} catch (KakaoLoginException exception) {
			sessionStore.completeFailure(loginId, "카카오 로그인 처리에 실패했습니다.");
			log.error("Kakao 로그인 처리 실패: {}", exception.getMessage(), exception);
			throw exception;
		} catch (RuntimeException exception) {
			sessionStore.completeFailure(loginId, "로그인 처리 중 오류가 발생했습니다.");
			log.error("Kakao 로그인 처리 중 예상하지 못한 RuntimeException이 발생했습니다.", exception);
			throw exception;
		}
	}

	public static String toUserId(long kakaoId) {
		if (kakaoId <= 0) throw new IllegalArgumentException("카카오 사용자 ID가 올바르지 않습니다.");
		return "kakao:" + kakaoId;
	}
}
