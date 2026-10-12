package com.yogiroad.backend.exception;

public class RestaurantLicenseApiException extends RuntimeException {

	public RestaurantLicenseApiException(String message) {
		super(message);
	}

	public RestaurantLicenseApiException(String message, Throwable cause) {
		super(message, cause);
	}
}
