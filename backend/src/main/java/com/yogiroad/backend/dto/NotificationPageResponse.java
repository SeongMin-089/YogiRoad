package com.yogiroad.backend.dto;

import java.util.List;

public record NotificationPageResponse(
		List<NotificationResponse> items,
		int page,
		int size,
		boolean hasNext
) {
}
