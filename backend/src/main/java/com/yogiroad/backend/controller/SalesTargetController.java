package com.yogiroad.backend.controller;

import com.yogiroad.backend.dto.SalesTargetCreateRequest;
import com.yogiroad.backend.model.SalesTarget;
import com.yogiroad.backend.service.SalesTargetService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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
	public SalesTarget register(@Valid @RequestBody SalesTargetCreateRequest request) {
		return salesTargetService.register(request);
	}

	@GetMapping
	public List<SalesTarget> findAll() {
		return salesTargetService.findAll();
	}

	@GetMapping("/{storeId}")
	public SalesTarget findByStoreId(@PathVariable String storeId) {
		return salesTargetService.findByStoreId(storeId);
	}
}
