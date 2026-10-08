package com.yogiroad.backend.model;

import java.time.Instant;

public record SalesActivity(
		String id,
		String userId,
		String storeId,
		SalesActivityType type,
		String content,
		Instant nextActionAt,
		Instant createdAt
) {
}
