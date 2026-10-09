package com.yogiroad.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.jsonwebtoken.MalformedJwtException;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class JwtAuthenticationFilterTests {

	@Test
	void protectedApiWithoutAuthorizationHeaderReturnsUnauthorized() throws Exception {
		JwtAuthenticationFilter filter = new JwtAuthenticationFilter(mock(JwtTokenProvider.class));
		MockHttpServletRequest request = request("GET", "/api/sales-targets");
		MockHttpServletResponse response = new MockHttpServletResponse();

		filter.doFilter(request, response, mock(FilterChain.class));

		assertEquals(401, response.getStatus());
		assertTrue(response.getContentType().startsWith("application/json"));
		assertFalse(response.getContentAsString().isBlank());
	}

	@Test
	void invalidJwtReturnsUnauthorized() throws Exception {
		JwtTokenProvider provider = mock(JwtTokenProvider.class);
		when(provider.verify("invalid")).thenThrow(new MalformedJwtException("invalid"));
		JwtAuthenticationFilter filter = new JwtAuthenticationFilter(provider);
		MockHttpServletRequest request = request("GET", "/api/auth/me");
		request.addHeader("Authorization", "Bearer invalid");
		MockHttpServletResponse response = new MockHttpServletResponse();

		filter.doFilter(request, response, mock(FilterChain.class));

		assertEquals(401, response.getStatus());
	}

	@Test
	void kakaoSessionEndpointDoesNotRequireJwt() throws Exception {
		JwtAuthenticationFilter filter = new JwtAuthenticationFilter(mock(JwtTokenProvider.class));
		MockHttpServletRequest request = request("POST", "/api/auth/kakao/session");
		MockHttpServletResponse response = new MockHttpServletResponse();
		FilterChain chain = mock(FilterChain.class);

		filter.doFilter(request, response, chain);

		verify(chain).doFilter(request, response);
	}

	@Test
	void validJwtExposesNamespacedUserIdToSalesController() throws Exception {
		JwtTokenProvider provider = mock(JwtTokenProvider.class);
		AuthenticatedUser user = new AuthenticatedUser("kakao:123", "kakao", "테스터", null);
		when(provider.verify("valid")).thenReturn(user);
		JwtAuthenticationFilter filter = new JwtAuthenticationFilter(provider);
		MockHttpServletRequest request = request("GET", "/api/sales-targets");
		request.addHeader("Authorization", "Bearer valid");
		MockHttpServletResponse response = new MockHttpServletResponse();
		FilterChain chain = mock(FilterChain.class);

		filter.doFilter(request, response, chain);

		assertEquals("kakao:123", request.getAttribute(JwtAuthenticationFilter.USER_ID_ATTRIBUTE));
		assertEquals(user, request.getAttribute(JwtAuthenticationFilter.USER_ATTRIBUTE));
		verify(chain).doFilter(request, response);
	}

	private MockHttpServletRequest request(String method, String path) {
		MockHttpServletRequest request = new MockHttpServletRequest(method, path);
		request.setServletPath(path);
		return request;
	}
}
