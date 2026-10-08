package com.yogiroad.backend.controller;

import com.yogiroad.backend.auth.FirebaseAuthFilter;
import com.yogiroad.backend.dto.SalesPriorityResponse;
import com.yogiroad.backend.dto.UpcomingSalesActionResponse;
import com.yogiroad.backend.service.SalesInsightsService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestAttribute;

@RestController
public class SalesInsightsController {

	private final SalesInsightsService salesInsightsService;

	public SalesInsightsController(SalesInsightsService salesInsightsService) {
		this.salesInsightsService = salesInsightsService;
	}

	@GetMapping("/api/sales-activities/upcoming")
	public List<UpcomingSalesActionResponse> findUpcomingActions(
			@RequestAttribute(FirebaseAuthFilter.UID_ATTRIBUTE) String userId
	) {
		return salesInsightsService.findUpcomingActions(userId);
	}

	@GetMapping("/api/sales-targets/priorities")
	public List<SalesPriorityResponse> findPriorities(
			@RequestAttribute(FirebaseAuthFilter.UID_ATTRIBUTE) String userId
	) {
		return salesInsightsService.findPriorities(userId);
	}
}
