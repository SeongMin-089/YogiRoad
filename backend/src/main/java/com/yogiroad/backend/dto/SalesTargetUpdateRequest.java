package com.yogiroad.backend.dto;

import com.yogiroad.backend.model.SalesStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SalesTargetUpdateRequest(
		@NotNull(message = "status는 필수입니다.")
		SalesStatus status,

		@NotNull(message = "memo는 필수입니다.")
		@Size(max = 2000, message = "memo는 2000자 이하여야 합니다.")
		String memo
) {
}
