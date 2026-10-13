package com.yogiroad.backend.controller;

import com.yogiroad.backend.auth.AuthenticatedUser;
import com.yogiroad.backend.auth.JwtAuthenticationFilter;
import com.yogiroad.backend.dto.UserProfileResponse;
import com.yogiroad.backend.dto.UserProfileUpdateRequest;
import com.yogiroad.backend.service.UserProfileService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me/profile")
public class UserProfileController {
	private final UserProfileService userProfileService;

	public UserProfileController(UserProfileService userProfileService) {
		this.userProfileService = userProfileService;
	}

	@GetMapping
	public UserProfileResponse find(
			@RequestAttribute(JwtAuthenticationFilter.USER_ATTRIBUTE) AuthenticatedUser user
	) {
		return userProfileService.find(user);
	}

	@PatchMapping
	public UserProfileResponse update(
			@RequestAttribute(JwtAuthenticationFilter.USER_ATTRIBUTE) AuthenticatedUser user,
			@Valid @RequestBody UserProfileUpdateRequest request
	) {
		return userProfileService.update(user, request);
	}
}
