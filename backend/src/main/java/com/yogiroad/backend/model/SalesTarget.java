package com.yogiroad.backend.model;

import java.time.Instant;

public record SalesTarget(
		String storeId,
		String storeName,
		String category,
		String address,
		Double latitude,
		Double longitude,
		SalesStatus status,
		String memo,
		Instant registeredAt
) {
}
