package com.yogiroad.backend.auth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.yogiroad.backend.exception.KakaoLoginException;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class KakaoOAuthClient {

	private static final String AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";
	private static final String TOKEN_URL = "https://kauth.kakao.com/oauth/token";
	private static final String USER_URL = "https://kapi.kakao.com/v2/user/me";
	private static final int MAX_ERROR_BODY_LENGTH = 2_000;
	private static final ObjectMapper ERROR_BODY_MAPPER = new ObjectMapper();
	private static final Set<String> SENSITIVE_FIELDS = Set.of(
			"access_token", "refresh_token", "id_token", "client_secret", "client_id",
			"authorization", "jwt", "code"
	);
	private static final Pattern BEARER_VALUE = Pattern.compile("(?i)Bearer\\s+[^\\s,;]+");
	private static final Pattern PARAMETER_VALUE = Pattern.compile(
			"(?i)(access_token|refresh_token|id_token|client_secret|client_id|authorization|jwt|code)=([^&\\s]+)"
	);

	private final RestClient restClient;
	private final String restApiKey;
	private final String clientSecret;
	private final String redirectUri;

	@Autowired
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

		KakaoToken token;
		try {
			token = restClient.post()
					.uri(TOKEN_URL)
					.contentType(MediaType.APPLICATION_FORM_URLENCODED)
					.body(form)
					.retrieve()
					.body(KakaoToken.class);
		} catch (RestClientResponseException exception) {
			throw endpointFailure("Kakao token endpoint", exception, code, restApiKey, clientSecret);
		} catch (RestClientException exception) {
			throw transportFailure("Kakao token endpoint", exception, code, restApiKey, clientSecret);
		}
		if (token == null || token.accessToken() == null || token.accessToken().isBlank()) {
			throw new KakaoLoginException("카카오 액세스 토큰을 받지 못했습니다.");
		}

		KakaoUser user;
		try {
			user = restClient.get()
					.uri(USER_URL)
					.header(HttpHeaders.AUTHORIZATION, "Bearer " + token.accessToken())
					.retrieve()
					.body(KakaoUser.class);
		} catch (RestClientResponseException exception) {
			throw endpointFailure(
					"Kakao /v2/user/me endpoint", exception,
					token.accessToken(), code, restApiKey, clientSecret);
		} catch (RestClientException exception) {
			throw transportFailure(
					"Kakao /v2/user/me endpoint", exception,
					token.accessToken(), code, restApiKey, clientSecret);
		}
		if (user == null || user.id() <= 0) throw new KakaoLoginException("카카오 사용자 정보를 받지 못했습니다.");
		return user;
	}

	private void validateConfiguration() {
		if (restApiKey == null || restApiKey.isBlank() || redirectUri == null || redirectUri.isBlank()) {
			throw new KakaoLoginException("카카오 REST API 키와 Redirect URI가 설정되지 않았습니다.");
		}
	}

	private KakaoLoginException endpointFailure(
			String endpoint,
			RestClientResponseException exception,
			String... secrets
	) {
		String message = "%s 실패: HTTP %d, body=%s".formatted(
				endpoint,
				exception.getStatusCode().value(),
				redactKnownSecrets(sanitizeForLog(exception.getResponseBodyAsString()), secrets)
		);
		return new KakaoLoginException(message);
	}

	private KakaoLoginException transportFailure(
			String endpoint,
			RestClientException exception,
			String... secrets
	) {
		return new KakaoLoginException(
				endpoint + " 통신 실패 (" + exception.getClass().getSimpleName() + "): "
						+ redactKnownSecrets(sanitizeForLog(exception.getMessage()), secrets));
	}

	private static String redactKnownSecrets(String value, String... secrets) {
		String redacted = value;
		for (String secret : secrets) {
			if (secret != null && !secret.isBlank()) redacted = redacted.replace(secret, "***");
		}
		return redacted;
	}

	public static String sanitizeForLog(String value) {
		if (value == null || value.isBlank()) return "<empty>";
		String sanitized;
		try {
			JsonNode root = ERROR_BODY_MAPPER.readTree(value);
			redactSensitiveFields(root);
			sanitized = ERROR_BODY_MAPPER.writeValueAsString(root);
		} catch (JsonProcessingException exception) {
			sanitized = value;
		}
		sanitized = BEARER_VALUE.matcher(sanitized).replaceAll("Bearer ***");
		sanitized = PARAMETER_VALUE.matcher(sanitized).replaceAll("$1=***");
		sanitized = sanitized.replace('\r', ' ').replace('\n', ' ');
		if (sanitized.length() > MAX_ERROR_BODY_LENGTH) {
			return sanitized.substring(0, MAX_ERROR_BODY_LENGTH) + "...<truncated>";
		}
		return sanitized;
	}

	private static void redactSensitiveFields(JsonNode node) {
		if (node instanceof ObjectNode objectNode) {
			Iterator<Map.Entry<String, JsonNode>> fields = objectNode.properties().iterator();
			while (fields.hasNext()) {
				Map.Entry<String, JsonNode> field = fields.next();
				if (SENSITIVE_FIELDS.contains(field.getKey().toLowerCase(Locale.ROOT))) {
					objectNode.put(field.getKey(), "***");
				} else {
					redactSensitiveFields(field.getValue());
				}
			}
		} else if (node.isArray()) {
			node.forEach(KakaoOAuthClient::redactSensitiveFields);
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
