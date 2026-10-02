package com.yogiroad.backend.exception;

public class FirestoreOperationException extends RuntimeException {

	public FirestoreOperationException(String message, Throwable cause) {
		super(message, cause);
	}
}
