package com.yogiroad.backend.exception;

import com.yogiroad.backend.dto.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
		String message = exception.getBindingResult().getFieldErrors().stream()
				.findFirst()
				.map(error -> error.getDefaultMessage())
				.orElse("입력값이 올바르지 않습니다.");
		return ResponseEntity.badRequest().body(new ErrorResponse(message));
	}

	@ExceptionHandler(DuplicateSalesTargetException.class)
	public ResponseEntity<ErrorResponse> handleDuplicate(DuplicateSalesTargetException exception) {
		return ResponseEntity.status(HttpStatus.CONFLICT)
				.body(new ErrorResponse(exception.getMessage()));
	}

	@ExceptionHandler({SalesTargetNotFoundException.class, SalesActivityNotFoundException.class})
	public ResponseEntity<ErrorResponse> handleNotFound(RuntimeException exception) {
		return ResponseEntity.status(HttpStatus.NOT_FOUND)
				.body(new ErrorResponse(exception.getMessage()));
	}

	@ExceptionHandler(FirestoreOperationException.class)
	public ResponseEntity<ErrorResponse> handleFirestore(FirestoreOperationException exception) {
		return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
				.body(new ErrorResponse(exception.getMessage()));
	}

	@ExceptionHandler({HttpMessageNotReadableException.class, IllegalArgumentException.class})
	public ResponseEntity<ErrorResponse> handleBadRequest(Exception exception) {
		return ResponseEntity.badRequest()
				.body(new ErrorResponse("잘못된 요청입니다."));
	}
}
