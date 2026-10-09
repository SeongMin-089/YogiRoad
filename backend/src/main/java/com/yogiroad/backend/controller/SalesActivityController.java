package com.yogiroad.backend.controller;

import com.yogiroad.backend.auth.JwtAuthenticationFilter;
import com.yogiroad.backend.dto.SalesActivityCreateRequest;
import com.yogiroad.backend.model.SalesActivity;
import com.yogiroad.backend.service.SalesActivityService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sales-targets/{storeId}/activities")
public class SalesActivityController {

	private final SalesActivityService salesActivityService;

	public SalesActivityController(SalesActivityService salesActivityService) {
		this.salesActivityService = salesActivityService;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public SalesActivity create(
			@RequestAttribute(JwtAuthenticationFilter.USER_ID_ATTRIBUTE) String userId,
			@PathVariable String storeId,
			@Valid @RequestBody SalesActivityCreateRequest request
	) {
		return salesActivityService.create(userId, storeId, request);
	}

	@GetMapping
	public List<SalesActivity> findAll(
			@RequestAttribute(JwtAuthenticationFilter.USER_ID_ATTRIBUTE) String userId,
			@PathVariable String storeId
	) {
		return salesActivityService.findAll(userId, storeId);
	}

	@DeleteMapping("/{activityId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(
			@RequestAttribute(JwtAuthenticationFilter.USER_ID_ATTRIBUTE) String userId,
			@PathVariable String storeId,
			@PathVariable String activityId
	) {
		salesActivityService.delete(userId, storeId, activityId);
	}
}
