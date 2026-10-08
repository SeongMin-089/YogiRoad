package com.yogiroad.backend.controller;

import com.yogiroad.backend.auth.FirebaseAuthFilter;
import com.yogiroad.backend.dto.SalesTargetCreateRequest;
import com.yogiroad.backend.dto.SalesTargetUpdateRequest;
import com.yogiroad.backend.model.SalesTarget;
import com.yogiroad.backend.service.SalesTargetService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sales-targets")
public class SalesTargetController {

	private final SalesTargetService salesTargetService;

	public SalesTargetController(SalesTargetService salesTargetService) {
		this.salesTargetService = salesTargetService;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public SalesTarget register(
			@RequestAttribute(FirebaseAuthFilter.UID_ATTRIBUTE) String userId,
			@Valid @RequestBody SalesTargetCreateRequest request
	) {
		return salesTargetService.register(userId, request);
	}

	@GetMapping
	public List<SalesTarget> findAll(
			@RequestAttribute(FirebaseAuthFilter.UID_ATTRIBUTE) String userId
	) {
		return salesTargetService.findAll(userId);
	}

	@GetMapping("/{storeId}")
	public SalesTarget findByStoreId(
			@RequestAttribute(FirebaseAuthFilter.UID_ATTRIBUTE) String userId,
			@PathVariable String storeId
	) {
		return salesTargetService.findByStoreId(userId, storeId);
	}

	@PatchMapping("/{storeId}")
	public SalesTarget update(
			@RequestAttribute(FirebaseAuthFilter.UID_ATTRIBUTE) String userId,
			@PathVariable String storeId,
			@Valid @RequestBody SalesTargetUpdateRequest request
	) {
		return salesTargetService.update(userId, storeId, request);
	}

	@DeleteMapping("/{storeId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(
			@RequestAttribute(FirebaseAuthFilter.UID_ATTRIBUTE) String userId,
			@PathVariable String storeId
	) {
		salesTargetService.delete(userId, storeId);
	}
}
