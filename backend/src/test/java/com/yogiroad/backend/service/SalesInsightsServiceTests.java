package com.yogiroad.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.yogiroad.backend.dto.SalesDashboardResponse;
import com.yogiroad.backend.dto.SalesDashboardResponse.DashboardPeriod;
import com.yogiroad.backend.dto.SalesPriorityResponse;
import com.yogiroad.backend.model.SalesActivity;
import com.yogiroad.backend.model.SalesActivityType;
import com.yogiroad.backend.model.SalesStatus;
import com.yogiroad.backend.model.SalesTarget;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class SalesInsightsServiceTests {
	private static final String USER_ID = "user-a";

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
		when(targetService.findAll(USER_ID)).thenReturn(List.of(revisit, consulting, unvisited, contracted));
		when(activityService.findAll(USER_ID)).thenReturn(List.of(
				activity("activity-a", "A", SalesActivityType.재방문, now.plus(Duration.ofMinutes(10))),
				activity("activity-b", "B", SalesActivityType.전화, now.plus(Duration.ofDays(1)))
		));

		List<SalesPriorityResponse> priorities = service.findPriorities(USER_ID);

		assertEquals(List.of("A", "B", "C"), priorities.stream()
				.map(SalesPriorityResponse::storeId)
				.toList());
		assertFalse(priorities.stream().anyMatch(priority -> priority.storeId().equals("D")));
	}

	@Test
	void dashboardUsesSeoulWeekAndConsultationActivitiesOnly() {
		SalesActivityService activityService = mock(SalesActivityService.class);
		SalesTargetService targetService = mock(SalesTargetService.class);
		Clock clock = Clock.fixed(Instant.parse("2026-10-14T03:00:00Z"), ZoneOffset.UTC);
		SalesInsightsService service = new SalesInsightsService(activityService, targetService, clock);

		when(targetService.findAll(USER_ID)).thenReturn(List.of(
				target("A", "계약 매장", SalesStatus.계약완료, "2026-10-12T00:00:00Z"),
				target("B", "상담 매장", SalesStatus.상담중, "2026-10-01T00:00:00Z"),
				target("C", "미방문 매장", SalesStatus.미방문, "2026-09-20T00:00:00Z"),
				target("D", "거절 매장", SalesStatus.거절, "2026-08-20T00:00:00Z")
		));
		when(activityService.findAll(USER_ID)).thenReturn(List.of(
				activityCreated("monday", SalesActivityType.상담, "2026-10-11T15:00:00Z"),
				activityCreated("visit", SalesActivityType.방문, "2026-10-11T16:00:00Z"),
				activityCreated("wednesday", SalesActivityType.상담, "2026-10-14T03:00:00Z"),
				activityCreated("sunday", SalesActivityType.상담, "2026-10-18T14:59:59Z"),
				activityCreated("next-week", SalesActivityType.상담, "2026-10-18T15:00:00Z"),
				activityCreated("previous-month", SalesActivityType.상담, "2026-09-30T14:59:59Z")
		));

		SalesDashboardResponse dashboard = service.getDashboard(USER_ID);

		assertEquals(4, dashboard.summary().totalRegisteredStores());
		assertEquals(1, dashboard.summary().completedContracts());
		assertEquals(25.0, dashboard.summary().conversionRate());
		assertEquals(3, dashboard.summary().thisWeekConsultations());
		assertEquals(1, dashboard.periods().get(DashboardPeriod.WEEK).registeredStores());
		assertEquals(3, dashboard.periods().get(DashboardPeriod.WEEK).consultations());
		assertEquals(2, dashboard.periods().get(DashboardPeriod.MONTH).registeredStores());
		assertEquals(4, dashboard.periods().get(DashboardPeriod.MONTH).consultations());
		assertEquals(4, dashboard.periods().get(DashboardPeriod.ALL).registeredStores());
		assertEquals(5, dashboard.periods().get(DashboardPeriod.ALL).consultations());
		assertEquals(
				List.of(1, 0, 1, 0, 0, 0, 1),
				dashboard.weeklyConsultations().stream()
						.map(SalesDashboardResponse.DailyConsultation::consultations)
						.toList()
		);
		assertEquals(List.of("월", "화", "수", "목", "금", "토", "일"),
				dashboard.weeklyConsultations().stream()
						.map(SalesDashboardResponse.DailyConsultation::dayLabel)
						.toList());
		assertEquals(List.of(1, 1, 0, 1, 1), dashboard.statusProgress().stream()
				.map(SalesDashboardResponse.StatusProgress::count)
				.toList());
		assertEquals(List.of(25.0, 25.0, 0.0, 25.0, 25.0), dashboard.statusProgress().stream()
				.map(SalesDashboardResponse.StatusProgress::percentage)
				.toList());
		assertEquals("A", dashboard.recentCompletedStores().getFirst().storeId());
		verify(targetService).findAll(USER_ID);
		verify(activityService).findAll(USER_ID);
	}

	@Test
	void emptyDashboardReturnsZeroesAndAllStatuses() {
		SalesActivityService activityService = mock(SalesActivityService.class);
		SalesTargetService targetService = mock(SalesTargetService.class);
		SalesInsightsService service = new SalesInsightsService(
				activityService,
				targetService,
				Clock.fixed(Instant.parse("2026-10-14T03:00:00Z"), ZoneOffset.UTC)
		);
		when(targetService.findAll(USER_ID)).thenReturn(List.of());
		when(activityService.findAll(USER_ID)).thenReturn(List.of());

		SalesDashboardResponse dashboard = service.getDashboard(USER_ID);

		assertEquals(0, dashboard.summary().totalRegisteredStores());
		assertEquals(0, dashboard.summary().completedContracts());
		assertEquals(0.0, dashboard.summary().conversionRate());
		assertEquals(0, dashboard.summary().thisWeekConsultations());
		assertEquals(7, dashboard.weeklyConsultations().size());
		assertEquals(5, dashboard.statusProgress().size());
		assertEquals(0, dashboard.statusProgress().stream()
				.mapToInt(SalesDashboardResponse.StatusProgress::count).sum());
		assertEquals(List.of(), dashboard.recentCompletedStores());
	}

	private SalesTarget target(String storeId, String storeName, SalesStatus status) {
		return target(storeId, storeName, status, Instant.now().toString());
	}

	private SalesTarget target(
			String storeId,
			String storeName,
			SalesStatus status,
			String registeredAt
	) {
		return new SalesTarget(
				USER_ID,
				storeId,
				storeName,
				"음식점",
				"서울",
				37.5,
				127.0,
				status,
				"",
				Instant.parse(registeredAt)
		);
	}

	private SalesActivity activityCreated(String id, SalesActivityType type, String createdAt) {
		return new SalesActivity(
				id,
				USER_ID,
				"store",
				type,
				"테스트 활동",
				null,
				Instant.parse(createdAt)
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
				USER_ID,
				storeId,
				type,
				"테스트 활동",
				nextActionAt,
				Instant.now()
		);
	}
}
