package com.yogiroad.backend.auth;

import com.yogiroad.backend.exception.KakaoLoginException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

@Service
public class KakaoAuthService {

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
		} catch (RestClientException | KakaoLoginException exception) {
			sessionStore.completeFailure(loginId, "카카오 로그인 처리에 실패했습니다.");
			throw new KakaoLoginException("카카오 로그인 처리에 실패했습니다.", exception);
		} catch (RuntimeException exception) {
			sessionStore.completeFailure(loginId, "로그인 처리 중 오류가 발생했습니다.");
			throw exception;
		}
	}

	public static String toUserId(long kakaoId) {
		if (kakaoId <= 0) throw new IllegalArgumentException("카카오 사용자 ID가 올바르지 않습니다.");
		return "kakao:" + kakaoId;
	}
}
