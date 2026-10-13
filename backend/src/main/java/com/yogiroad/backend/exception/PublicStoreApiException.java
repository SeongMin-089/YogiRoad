package com.yogiroad.backend.exception;

public class PublicStoreApiException extends RuntimeException {

	public PublicStoreApiException(String message) {
		super(message);
	}

	public PublicStoreApiException(String message, Throwable cause) {
		super(message, cause);
	}
}
