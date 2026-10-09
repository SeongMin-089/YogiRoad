package com.yogiroad.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.yogiroad.backend.auth.LoginSessionStatus;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record LoginSessionStatusResponse(
		LoginSessionStatus status,
		String accessToken,
		String message
) {
}
