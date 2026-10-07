package com.yogiroad.backend.dto;

import com.yogiroad.backend.model.SalesActivityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record SalesActivityCreateRequest(
		@NotNull(message = "type은 필수입니다.")
		SalesActivityType type,

		@NotBlank(message = "content는 필수입니다.")
		@Size(max = 2000, message = "content는 2000자 이하여야 합니다.")
		String content,

		Instant nextActionAt
) {
}
