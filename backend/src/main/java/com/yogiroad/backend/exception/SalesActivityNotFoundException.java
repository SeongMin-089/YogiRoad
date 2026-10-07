package com.yogiroad.backend.exception;

public class SalesActivityNotFoundException extends RuntimeException {

	public SalesActivityNotFoundException(String activityId) {
		super("영업 활동을 찾을 수 없습니다: " + activityId);
	}
}
