package com.yogiroad.backend.controller;

import com.yogiroad.backend.auth.AuthenticatedUser;
import com.yogiroad.backend.auth.JwtAuthenticationFilter;
import com.yogiroad.backend.auth.KakaoAuthService;
import com.yogiroad.backend.auth.KakaoOAuthClient;
import com.yogiroad.backend.auth.LoginSessionStore;
import com.yogiroad.backend.dto.LoginSessionCreatedResponse;
import com.yogiroad.backend.dto.LoginSessionStatusResponse;
import com.yogiroad.backend.exception.InvalidOAuthStateException;
import com.yogiroad.backend.exception.KakaoLoginException;
import java.net.URI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
	private static final Logger log = LoggerFactory.getLogger(AuthController.class);

	private final LoginSessionStore sessionStore;
	private final KakaoOAuthClient kakaoOAuthClient;
	private final KakaoAuthService kakaoAuthService;

	public AuthController(
			LoginSessionStore sessionStore,
			KakaoOAuthClient kakaoOAuthClient,
			KakaoAuthService kakaoAuthService
	) {
		this.sessionStore = sessionStore;
		this.kakaoOAuthClient = kakaoOAuthClient;
		this.kakaoAuthService = kakaoAuthService;
	}

	@PostMapping("/kakao/session")
	@ResponseStatus(HttpStatus.CREATED)
	public LoginSessionCreatedResponse createSession() {
		LoginSessionStore.LoginSession session = sessionStore.create();
		String loginUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
				.path("/api/auth/kakao/login")
				.queryParam("loginId", session.loginId())
				.build()
				.encode()
				.toUriString();
		return new LoginSessionCreatedResponse(session.loginId(), loginUrl);
	}

	@GetMapping("/kakao/login")
	public ResponseEntity<Void> login(@RequestParam String loginId) {
		String state = sessionStore.stateForLogin(loginId);
		return ResponseEntity.status(HttpStatus.FOUND)
				.location(URI.create(kakaoOAuthClient.authorizeUrl(state)))
				.build();
	}

	@GetMapping(value = "/kakao/callback", produces = MediaType.TEXT_HTML_VALUE)
	public ResponseEntity<String> callback(
			@RequestParam(required = false) String code,
			@RequestParam(required = false) String state,
			@RequestParam(required = false) String error
	) {
		try {
			if (error != null) {
				log.warn("Kakao OAuth provider가 callback 오류를 반환했습니다: error={}",
						KakaoOAuthClient.sanitizeForLog(error));
				sessionStore.rejectByState(state, "카카오 로그인이 취소되었거나 승인되지 않았습니다.");
				return completionPage(false);
			}
			if (code == null || code.isBlank()) {
				log.warn("Kakao callback에 authorization code가 없습니다. statePresent={}",
						state != null && !state.isBlank());
				sessionStore.rejectByState(state, "카카오 로그인이 취소되었거나 승인되지 않았습니다.");
				return completionPage(false);
			}
			kakaoAuthService.completeLogin(code, state);
			return completionPage(true);
		} catch (InvalidOAuthStateException exception) {
			log.warn("Kakao callback OAuth state 검증에 실패했습니다. statePresent={}",
					state != null && !state.isBlank());
			return completionPage(false, HttpStatus.BAD_REQUEST);
		} catch (KakaoLoginException exception) {
			log.error("Kakao callback 처리 실패: {}", exception.getMessage());
			return completionPage(false);
		} catch (RuntimeException exception) {
			log.error("Kakao callback 처리 중 예상하지 못한 RuntimeException이 발생했습니다.", exception);
			return completionPage(false, HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	@GetMapping("/kakao/session/{loginId}")
	public ResponseEntity<LoginSessionStatusResponse> poll(@PathVariable String loginId) {
		return ResponseEntity.ok()
				.cacheControl(CacheControl.noStore())
				.body(sessionStore.poll(loginId));
	}

	@GetMapping("/me")
	public AuthenticatedUser me(
			@RequestAttribute(JwtAuthenticationFilter.USER_ATTRIBUTE) AuthenticatedUser user
	) {
		return user;
	}

	private ResponseEntity<String> completionPage(boolean success) {
		return completionPage(success, HttpStatus.OK);
	}

	private ResponseEntity<String> completionPage(boolean success, HttpStatus status) {
		String title = success ? "로그인 완료" : "로그인 실패";
		String message = success
				? "YogiRoad 앱으로 돌아가세요. 이 창은 닫아도 됩니다."
				: "로그인을 완료하지 못했습니다. 창을 닫고 앱에서 다시 시도해 주세요.";
		String html = """
				<!doctype html><html lang="ko"><head><meta charset="utf-8">
				<meta name="viewport" content="width=device-width,initial-scale=1">
				<title>%s</title><style>body{font-family:system-ui,sans-serif;background:#f6f7f9;color:#172033;display:grid;place-items:center;min-height:100vh;margin:0}.card{background:white;border-radius:18px;padding:32px;max-width:360px;margin:24px;text-align:center;box-shadow:0 8px 28px #00000014}h1{font-size:24px}p{line-height:1.6;color:#697386}</style></head>
				<body><main class="card"><h1>%s</h1><p>%s</p></main></body></html>
				""".formatted(title, title, message);
		return ResponseEntity.status(status)
				.header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'")
				.cacheControl(CacheControl.noStore())
				.contentType(MediaType.TEXT_HTML)
				.body(html);
	}
}
