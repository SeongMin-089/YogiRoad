package com.yogiroad.backend.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SalesTargetCreateRequest(
		@NotBlank(message = "storeId는 필수입니다.")
		String storeId,

		@NotBlank(message = "storeName은 필수입니다.")
		String storeName,

		String category,
		String address,

		@NotNull(message = "latitude는 필수입니다.")
		@DecimalMin(value = "-90.0", message = "latitude는 -90 이상이어야 합니다.")
		@DecimalMax(value = "90.0", message = "latitude는 90 이하여야 합니다.")
		Double latitude,

		@NotNull(message = "longitude는 필수입니다.")
		@DecimalMin(value = "-180.0", message = "longitude는 -180 이상이어야 합니다.")
		@DecimalMax(value = "180.0", message = "longitude는 180 이하여야 합니다.")
		Double longitude,

		@Pattern(regexp = "PUBLIC_STORE|RESTAURANT_LICENSE", message = "sourceType이 올바르지 않습니다.")
		String sourceType,

		@Size(max = 200, message = "sourceId는 200자 이하여야 합니다.")
		String sourceId
) {
}
