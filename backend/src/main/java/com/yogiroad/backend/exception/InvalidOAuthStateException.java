package com.yogiroad.backend.exception;

public class InvalidOAuthStateException extends RuntimeException {
	public InvalidOAuthStateException() {
		super("유효하지 않은 OAuth state입니다.");
	}
}
