package com.yogiroad.backend.dto;

import com.yogiroad.backend.model.SalesActivityType;
import com.yogiroad.backend.model.SalesStatus;
import java.time.Instant;

public record UpcomingSalesActionResponse(
		String activityId,
		String storeId,
		String storeName,
		String category,
		String address,
		SalesStatus status,
		SalesActivityType type,
		String content,
		Instant nextActionAt
) {
}
