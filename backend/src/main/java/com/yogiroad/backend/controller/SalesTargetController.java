package com.yogiroad.backend.controller;

import com.yogiroad.backend.auth.JwtAuthenticationFilter;
import com.yogiroad.backend.dto.SalesTargetCreateRequest;
import com.yogiroad.backend.dto.SalesTargetUpdateRequest;
import com.yogiroad.backend.dto.RestaurantLicenseCandidate;
import com.yogiroad.backend.dto.PublicStoreCandidate;
import com.yogiroad.backend.model.SalesTarget;
import com.yogiroad.backend.service.PublicStoreService;
import com.yogiroad.backend.service.SalesTargetService;
import com.yogiroad.backend.service.RestaurantLicenseService;
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
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/sales-targets")
public class SalesTargetController {

	private final SalesTargetService salesTargetService;
	private final RestaurantLicenseService restaurantLicenseService;
	private final PublicStoreService publicStoreService;

	public SalesTargetController(
			SalesTargetService salesTargetService,
			RestaurantLicenseService restaurantLicenseService,
			PublicStoreService publicStoreService
	) {
		this.salesTargetService = salesTargetService;
		this.restaurantLicenseService = restaurantLicenseService;
		this.publicStoreService = publicStoreService;
	}

	@GetMapping("/public-stores")
	public List<PublicStoreCandidate> findPublicStores(
			@RequestParam double latitude,
			@RequestParam double longitude,
			@RequestParam(defaultValue = "1000") int radius,
			@RequestParam(defaultValue = "1") int pageNo,
			@RequestParam(defaultValue = "100") int numOfRows
	) {
		return publicStoreService.findRestaurants(latitude, longitude, radius, pageNo, numOfRows);
	}

	@GetMapping("/license-candidates")
	public List<RestaurantLicenseCandidate> findLicenseCandidates(
			@RequestParam String region
	) {
		return restaurantLicenseService.findRecentCandidates(region);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public SalesTarget register(
			@RequestAttribute(JwtAuthenticationFilter.USER_ID_ATTRIBUTE) String userId,
			@Valid @RequestBody SalesTargetCreateRequest request
	) {
		return salesTargetService.register(userId, request);
	}

	@GetMapping
	public List<SalesTarget> findAll(
			@RequestAttribute(JwtAuthenticationFilter.USER_ID_ATTRIBUTE) String userId
	) {
		return salesTargetService.findAll(userId);
	}

	@GetMapping("/{storeId}")
	public SalesTarget findByStoreId(
			@RequestAttribute(JwtAuthenticationFilter.USER_ID_ATTRIBUTE) String userId,
			@PathVariable String storeId
	) {
		return salesTargetService.findByStoreId(userId, storeId);
	}

	@PatchMapping("/{storeId}")
	public SalesTarget update(
			@RequestAttribute(JwtAuthenticationFilter.USER_ID_ATTRIBUTE) String userId,
			@PathVariable String storeId,
			@Valid @RequestBody SalesTargetUpdateRequest request
	) {
		return salesTargetService.update(userId, storeId, request);
	}

	@DeleteMapping("/{storeId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(
			@RequestAttribute(JwtAuthenticationFilter.USER_ID_ATTRIBUTE) String userId,
			@PathVariable String storeId
	) {
		salesTargetService.delete(userId, storeId);
	}
}
