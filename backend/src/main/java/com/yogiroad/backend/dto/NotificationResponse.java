package com.yogiroad.backend.dto;

import java.time.Instant;
import java.time.LocalDate;

public record NotificationResponse(
		String id,
		String type,
		String managementNumber,
		String storeName,
		String businessType,
		String address,
		String roadAddress,
		String lotNumberAddress,
		LocalDate licenseDate,
		String regionKey,
		Double latitude,
		Double longitude,
		boolean isRead,
		Instant createdAt,
		Instant readAt
) {
}
