package com.yogiroad.backend.exception;

public class SalesTargetNotFoundException extends RuntimeException {

	public SalesTargetNotFoundException(String storeId) {
		super("영업 대상을 찾을 수 없습니다: " + storeId);
	}
}
