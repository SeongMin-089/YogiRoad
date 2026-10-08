package com.yogiroad.backend.dto;

import com.yogiroad.backend.model.SalesStatus;
import java.time.Instant;

public record SalesPriorityResponse(
		String storeId,
		String storeName,
		String category,
		String address,
		SalesStatus status,
		int priorityScore,
		String reason,
		Instant nextActionAt
) {
}
