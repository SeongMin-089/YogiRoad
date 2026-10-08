package com.yogiroad.backend.auth;

import com.google.firebase.auth.FirebaseAuthException;
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
public class FirebaseAuthFilter extends OncePerRequestFilter {

	public static final String UID_ATTRIBUTE = "firebaseUid";
	private static final String BEARER_PREFIX = "Bearer ";

	private final FirebaseTokenVerifier tokenVerifier;

	public FirebaseAuthFilter(FirebaseTokenVerifier tokenVerifier) {
		this.tokenVerifier = tokenVerifier;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		if (HttpMethod.OPTIONS.matches(request.getMethod())) return true;
		String path = request.getServletPath();
		return !isProtectedPath(path, "/api/sales-targets")
				&& !isProtectedPath(path, "/api/sales-activities");
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

		String idToken = authorization.substring(BEARER_PREFIX.length()).trim();
		if (idToken.isEmpty()) {
			writeUnauthorized(response);
			return;
		}

		try {
			String uid = tokenVerifier.verify(idToken);
			request.setAttribute(UID_ATTRIBUTE, uid);
			filterChain.doFilter(request, response);
		} catch (FirebaseAuthException | IllegalArgumentException exception) {
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
