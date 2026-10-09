package com.yogiroad.backend.auth;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

	public static final String USER_ID_ATTRIBUTE = "authenticatedUserId";
	public static final String USER_ATTRIBUTE = "authenticatedUser";
	private static final String BEARER_PREFIX = "Bearer ";

	private final JwtTokenProvider tokenProvider;

	public JwtAuthenticationFilter(JwtTokenProvider tokenProvider) {
		this.tokenProvider = tokenProvider;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		if (HttpMethod.OPTIONS.matches(request.getMethod())) return true;
		String path = request.getServletPath();
		return !isProtectedPath(path, "/api/sales-targets")
				&& !isProtectedPath(path, "/api/sales-activities")
				&& !path.equals("/api/auth/me");
	}

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain
	) throws ServletException, IOException {
		String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
		if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
			writeUnauthorized(response);
			return;
		}

		String token = authorization.substring(BEARER_PREFIX.length()).trim();
		if (token.isEmpty()) {
			writeUnauthorized(response);
			return;
		}

		try {
			AuthenticatedUser user = tokenProvider.verify(token);
			request.setAttribute(USER_ID_ATTRIBUTE, user.userId());
			request.setAttribute(USER_ATTRIBUTE, user);
			filterChain.doFilter(request, response);
		} catch (JwtException | IllegalArgumentException exception) {
			writeUnauthorized(response);
		}
	}

	private boolean isProtectedPath(String path, String root) {
		return path.equals(root) || path.startsWith(root + "/");
	}

	private void writeUnauthorized(HttpServletResponse response) throws IOException {
		response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.getWriter().write("{\"message\":\"인증이 필요합니다.\"}");
	}
}
