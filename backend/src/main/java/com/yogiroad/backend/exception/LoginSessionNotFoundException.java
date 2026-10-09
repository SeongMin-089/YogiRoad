package com.yogiroad.backend.exception;

public class LoginSessionNotFoundException extends RuntimeException {
	public LoginSessionNotFoundException(String message) {
		super(message);
	}
}
