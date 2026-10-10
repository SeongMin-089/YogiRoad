package com.yogiroad.backend.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.yogiroad.backend.exception.KakaoLoginException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class KakaoOAuthClientTests {

	private static final String REDIRECT_URI = "http://localhost/api/auth/kakao/callback";

	@Test
	void tokenEndpointFailureIncludesStatusAndSanitizedBody() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		KakaoOAuthClient client = new KakaoOAuthClient(
				builder.build(), "rest-api-key", "client-secret", REDIRECT_URI);
		server.expect(requestTo("https://kauth.kakao.com/oauth/token"))
				.andExpect(method(HttpMethod.POST))
				.andRespond(withStatus(HttpStatus.BAD_REQUEST)
						.contentType(MediaType.APPLICATION_JSON)
						.body("{\"error\":\"invalid_grant\",\"access_token\":\"must-not-leak\","
								+ "\"echo\":\"rest-api-key client-secret authorization-code\"}"));

		KakaoLoginException exception = assertThrows(
				KakaoLoginException.class, () -> client.fetchUser("authorization-code"));

		assertTrue(exception.getMessage().contains("Kakao token endpoint"));
		assertTrue(exception.getMessage().contains("HTTP 400"));
		assertTrue(exception.getMessage().contains("invalid_grant"));
		assertFalse(exception.getMessage().contains("must-not-leak"));
		assertFalse(exception.getMessage().contains("rest-api-key"));
		assertFalse(exception.getMessage().contains("client-secret"));
		assertFalse(exception.getMessage().contains("authorization-code"));
		server.verify();
	}

	@Test
	void userEndpointFailureIncludesStatusAndBodyWithoutAccessToken() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		KakaoOAuthClient client = new KakaoOAuthClient(builder.build(), "rest-api-key", "", REDIRECT_URI);
		server.expect(requestTo("https://kauth.kakao.com/oauth/token"))
				.andRespond(withSuccess("{\"access_token\":\"must-not-leak\"}", MediaType.APPLICATION_JSON));
		server.expect(requestTo("https://kapi.kakao.com/v2/user/me"))
				.andExpect(method(HttpMethod.GET))
				.andRespond(withStatus(HttpStatus.UNAUTHORIZED)
						.contentType(MediaType.APPLICATION_JSON)
						.body("{\"msg\":\"invalid token: must-not-leak\","
								+ "\"access_token\":\"must-not-leak\"}"));

		KakaoLoginException exception = assertThrows(
				KakaoLoginException.class, () -> client.fetchUser("authorization-code"));

		assertTrue(exception.getMessage().contains("Kakao /v2/user/me endpoint"));
		assertTrue(exception.getMessage().contains("HTTP 401"));
		assertTrue(exception.getMessage().contains("invalid token"));
		assertFalse(exception.getMessage().contains("must-not-leak"));
		server.verify();
	}

	@Test
	void logSanitizerMasksBearerAndSensitiveParameters() {
		String sanitized = KakaoOAuthClient.sanitizeForLog(
				"Bearer access-secret code=oauth-code&client_secret=client-secret");

		assertFalse(sanitized.contains("access-secret"));
		assertFalse(sanitized.contains("oauth-code"));
		assertFalse(sanitized.contains("client-secret"));
	}
}
