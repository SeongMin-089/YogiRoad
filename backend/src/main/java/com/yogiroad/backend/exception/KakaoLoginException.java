package com.yogiroad.backend.exception;

public class KakaoLoginException extends RuntimeException {
	public KakaoLoginException(String message) {
		super(message);
	}

	public KakaoLoginException(String message, Throwable cause) {
		super(message, cause);
	}
}
