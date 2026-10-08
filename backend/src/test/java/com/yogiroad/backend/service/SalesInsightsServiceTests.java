package com.yogiroad.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.yogiroad.backend.dto.SalesPriorityResponse;
import com.yogiroad.backend.model.SalesActivity;
import com.yogiroad.backend.model.SalesActivityType;
import com.yogiroad.backend.model.SalesStatus;
import com.yogiroad.backend.model.SalesTarget;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class SalesInsightsServiceTests {

	@Test
	void prioritiesFollowScheduleAndStatusRules() {
		SalesActivityService activityService = mock(SalesActivityService.class);
		SalesTargetService targetService = mock(SalesTargetService.class);
		SalesInsightsService service = new SalesInsightsService(activityService, targetService);
		Instant now = Instant.now();

		SalesTarget revisit = target("A", "A 매장", SalesStatus.재방문);
		SalesTarget consulting = target("B", "B 매장", SalesStatus.상담중);
		SalesTarget unvisited = target("C", "C 매장", SalesStatus.미방문);
		SalesTarget contracted = target("D", "D 매장", SalesStatus.계약완료);
		when(targetService.findAll()).thenReturn(List.of(revisit, consulting, unvisited, contracted));
		when(activityService.findAll()).thenReturn(List.of(
				activity("activity-a", "A", SalesActivityType.재방문, now.plus(Duration.ofMinutes(10))),
				activity("activity-b", "B", SalesActivityType.전화, now.plus(Duration.ofDays(1)))
		));

		List<SalesPriorityResponse> priorities = service.findPriorities();

		assertEquals(List.of("A", "B", "C"), priorities.stream()
				.map(SalesPriorityResponse::storeId)
				.toList());
		assertFalse(priorities.stream().anyMatch(priority -> priority.storeId().equals("D")));
	}

	private SalesTarget target(String storeId, String storeName, SalesStatus status) {
		return new SalesTarget(
				storeId,
				storeName,
				"음식점",
				"서울",
				37.5,
				127.0,
				status,
				"",
				Instant.now()
		);
	}

	private SalesActivity activity(
			String id,
			String storeId,
			SalesActivityType type,
			Instant nextActionAt
	) {
		return new SalesActivity(
				id,
				storeId,
				type,
				"테스트 활동",
				nextActionAt,
				Instant.now()
		);
	}
}
