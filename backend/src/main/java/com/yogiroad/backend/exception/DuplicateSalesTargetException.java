package com.yogiroad.backend.exception;

public class DuplicateSalesTargetException extends RuntimeException {

	public DuplicateSalesTargetException() {
		super("이미 등록된 영업 대상입니다.");
	}
}
