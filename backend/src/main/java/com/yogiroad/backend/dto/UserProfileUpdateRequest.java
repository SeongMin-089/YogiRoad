package com.yogiroad.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

public record UserProfileUpdateRequest(
		@Size(max = 40, message = "이름은 40자 이하여야 합니다.")
		String displayName,

		@Valid
		ManagedRegion managedRegion
) {
	public record ManagedRegion(
			@Size(max = 30, message = "시·도는 30자 이하여야 합니다.")
			String region1DepthName,

			@Size(max = 40, message = "시·군·구는 40자 이하여야 합니다.")
			String region2DepthName,

			@Size(max = 40, message = "읍·면·동은 40자 이하여야 합니다.")
			String region3DepthName
	) {
	}
}
