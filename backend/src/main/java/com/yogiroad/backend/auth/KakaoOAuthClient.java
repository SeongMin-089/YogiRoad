package com.yogiroad.backend.auth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.yogiroad.backend.exception.KakaoLoginException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class KakaoOAuthClient {

	private static final String AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";
	private static final String TOKEN_URL = "https://kauth.kakao.com/oauth/token";
	private static final String USER_URL = "https://kapi.kakao.com/v2/user/me";

	private final RestClient restClient;
	private final String restApiKey;
	private final String clientSecret;
	private final String redirectUri;

	public KakaoOAuthClient(
			@Value("${kakao.rest-api-key}") String restApiKey,
			@Value("${kakao.client-secret}") String clientSecret,
			@Value("${kakao.redirect-uri}") String redirectUri
	) {
		this(RestClient.create(), restApiKey, clientSecret, redirectUri);
	}

	KakaoOAuthClient(RestClient restClient, String restApiKey, String clientSecret, String redirectUri) {
		this.restClient = restClient;
		this.restApiKey = restApiKey;
		this.clientSecret = clientSecret;
		this.redirectUri = redirectUri;
	}

	public String authorizeUrl(String state) {
		validateConfiguration();
		return UriComponentsBuilder.fromUriString(AUTHORIZE_URL)
				.queryParam("client_id", restApiKey)
				.queryParam("redirect_uri", redirectUri)
				.queryParam("response_type", "code")
				.queryParam("state", state)
				.build()
				.encode()
				.toUriString();
	}

	public KakaoUser fetchUser(String code) {
		validateConfiguration();
		MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
		form.add("grant_type", "authorization_code");
		form.add("client_id", restApiKey);
		form.add("redirect_uri", redirectUri);
		form.add("code", code);
		if (clientSecret != null && !clientSecret.isBlank()) form.add("client_secret", clientSecret);

		KakaoToken token = restClient.post()
				.uri(TOKEN_URL)
				.contentType(MediaType.APPLICATION_FORM_URLENCODED)
				.body(form)
				.retrieve()
				.body(KakaoToken.class);
		if (token == null || token.accessToken() == null || token.accessToken().isBlank()) {
			throw new KakaoLoginException("카카오 액세스 토큰을 받지 못했습니다.");
		}

		KakaoUser user = restClient.get()
				.uri(USER_URL)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token.accessToken())
				.retrieve()
				.body(KakaoUser.class);
		if (user == null || user.id() <= 0) throw new KakaoLoginException("카카오 사용자 정보를 받지 못했습니다.");
		return user;
	}

	private void validateConfiguration() {
		if (restApiKey == null || restApiKey.isBlank() || redirectUri == null || redirectUri.isBlank()) {
			throw new KakaoLoginException("카카오 REST API 키와 Redirect URI가 설정되지 않았습니다.");
		}
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record KakaoToken(@JsonProperty("access_token") String accessToken) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record KakaoUser(long id, @JsonProperty("kakao_account") KakaoAccount kakaoAccount) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record KakaoAccount(Profile profile) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Profile(
			String nickname,
			@JsonProperty("profile_image_url") String profileImageUrl
	) {
	}
}
