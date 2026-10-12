package com.yogiroad.backend.dto;

import java.time.LocalDate;

public record RestaurantLicenseCandidate(
		String managementNumber,
		String storeId,
		String storeName,
		LocalDate licenseDate,
		String statusCode,
		String statusName,
		String businessType,
		String address,
		String roadAddress,
		String lotNumberAddress,
		String telephone,
		Double latitude,
		Double longitude,
		String coordinateSource
) {
}
