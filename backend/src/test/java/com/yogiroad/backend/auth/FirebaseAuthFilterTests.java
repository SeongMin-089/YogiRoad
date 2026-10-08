package com.yogiroad.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class FirebaseAuthFilterTests {

	@Test
	void protectedApiWithoutAuthorizationHeaderReturnsUnauthorized() throws Exception {
		FirebaseAuthFilter filter = new FirebaseAuthFilter(mock(FirebaseTokenVerifier.class));
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/sales-targets");
		request.setServletPath("/api/sales-targets");
		MockHttpServletResponse response = new MockHttpServletResponse();
		FilterChain chain = mock(FilterChain.class);

		filter.doFilter(request, response, chain);

		assertEquals(401, response.getStatus());
		assertTrue(response.getContentType().startsWith("application/json"));
		assertFalse(response.getContentAsString().isBlank());
	}
}
