package com.yogiroad.backend.controller;

import com.yogiroad.backend.auth.JwtAuthenticationFilter;
import com.yogiroad.backend.dto.NotificationPageResponse;
import com.yogiroad.backend.dto.UnreadNotificationCountResponse;
import com.yogiroad.backend.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

	private final NotificationService notificationService;

	public NotificationController(NotificationService notificationService) {
		this.notificationService = notificationService;
	}

	@GetMapping
	public NotificationPageResponse findAll(
			@RequestAttribute(JwtAuthenticationFilter.USER_ID_ATTRIBUTE) String userId,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size
	) {
		if (page < 0 || page > 10_000 || size < 1 || size > 50) {
			throw new IllegalArgumentException("페이지 요청이 올바르지 않습니다.");
		}
		return notificationService.findAll(userId, page, size);
	}

	@GetMapping("/unread-count")
	public UnreadNotificationCountResponse unreadCount(
			@RequestAttribute(JwtAuthenticationFilter.USER_ID_ATTRIBUTE) String userId
	) {
		return new UnreadNotificationCountResponse(notificationService.unreadCount(userId));
	}

	@PatchMapping("/{id}/read")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void markRead(
			@RequestAttribute(JwtAuthenticationFilter.USER_ID_ATTRIBUTE) String userId,
			@PathVariable String id
	) {
		notificationService.markRead(userId, id);
	}

	@PatchMapping("/read-all")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void markAllRead(
			@RequestAttribute(JwtAuthenticationFilter.USER_ID_ATTRIBUTE) String userId
	) {
		notificationService.markAllRead(userId);
	}
}
