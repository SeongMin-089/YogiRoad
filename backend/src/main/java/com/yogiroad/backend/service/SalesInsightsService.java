package com.yogiroad.backend.service;

import com.yogiroad.backend.dto.SalesPriorityResponse;
import com.yogiroad.backend.dto.UpcomingSalesActionResponse;
import com.yogiroad.backend.model.SalesActivity;
import com.yogiroad.backend.model.SalesStatus;
import com.yogiroad.backend.model.SalesTarget;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class SalesInsightsService {

	private static final Duration UPCOMING_WINDOW = Duration.ofDays(30);
	private static final int UPCOMING_LIMIT = 50;
	private static final int PRIORITY_LIMIT = 5;
	private static final ZoneId SEOUL_ZONE = ZoneId.of("Asia/Seoul");

	private final SalesActivityService salesActivityService;
	private final SalesTargetService salesTargetService;

	public SalesInsightsService(
			SalesActivityService salesActivityService,
			SalesTargetService salesTargetService
	) {
		this.salesActivityService = salesActivityService;
		this.salesTargetService = salesTargetService;
	}

	public List<UpcomingSalesActionResponse> findUpcomingActions(String userId) {
		Instant now = Instant.now();
		List<SalesActivity> activities = salesActivityService.findUpcoming(
				userId,
				now,
				now.plus(UPCOMING_WINDOW),
				UPCOMING_LIMIT
		);
		Map<String, SalesTarget> targets = salesTargetService.findAll(userId).stream()
				.collect(Collectors.toMap(SalesTarget::storeId, Function.identity()));

		return activities.stream()
				.filter(activity -> targets.containsKey(activity.storeId()))
				.map(activity -> toUpcomingResponse(activity, targets.get(activity.storeId())))
				.toList();
	}

	public List<SalesPriorityResponse> findPriorities(String userId) {
		Instant now = Instant.now();
		LocalDate today = now.atZone(SEOUL_ZONE).toLocalDate();
		Map<String, List<SalesActivity>> activitiesByStore = salesActivityService.findAll(userId).stream()
				.collect(Collectors.groupingBy(SalesActivity::storeId));

		return salesTargetService.findAll(userId).stream()
				.filter(target -> target.status() != SalesStatus.계약완료
						&& target.status() != SalesStatus.거절)
				.map(target -> toPriorityResponse(
						target,
						activitiesByStore.getOrDefault(target.storeId(), List.of()),
						now,
						today
				))
				.sorted(priorityComparator())
				.limit(PRIORITY_LIMIT)
				.toList();
	}

	private UpcomingSalesActionResponse toUpcomingResponse(
			SalesActivity activity,
			SalesTarget target
	) {
		return new UpcomingSalesActionResponse(
				activity.id(),
				target.storeId(),
				target.storeName(),
				target.category(),
				target.address(),
				target.status(),
				activity.type(),
				activity.content(),
				activity.nextActionAt()
		);
	}

	private SalesPriorityResponse toPriorityResponse(
			SalesTarget target,
			List<SalesActivity> activities,
			Instant now,
			LocalDate today
	) {
		Optional<SalesActivity> nextActivity = activities.stream()
				.filter(activity -> activity.nextActionAt() != null
						&& !activity.nextActionAt().isBefore(now))
				.min(Comparator.comparing(SalesActivity::nextActionAt));

		long daysUntilAction = nextActivity
				.map(activity -> ChronoUnit.DAYS.between(
						today,
						activity.nextActionAt().atZone(SEOUL_ZONE).toLocalDate()
				))
				.orElse(Long.MAX_VALUE);
		int score = scheduleScore(daysUntilAction)
				+ statusScore(target.status())
				+ (activities.isEmpty() ? 0 : 10);
		String reason = priorityReason(target.status(), nextActivity, daysUntilAction);

		return new SalesPriorityResponse(
				target.storeId(),
				target.storeName(),
				target.category(),
				target.address(),
				target.status(),
				score,
				reason,
				nextActivity.map(SalesActivity::nextActionAt).orElse(null)
		);
	}

	private int scheduleScore(long daysUntilAction) {
		if (daysUntilAction == 0) return 100;
		if (daysUntilAction == 1) return 80;
		if (daysUntilAction <= 3) return 60;
		if (daysUntilAction <= 7) return 40;
		return 0;
	}

	private int statusScore(SalesStatus status) {
		return switch (status) {
			case 상담중 -> 30;
			case 재방문 -> 35;
			case 미방문 -> 15;
			case 계약완료, 거절 -> 0;
		};
	}

	private String priorityReason(
			SalesStatus status,
			Optional<SalesActivity> nextActivity,
			long daysUntilAction
	) {
		if (nextActivity.isPresent() && daysUntilAction <= 7) {
			String activityType = nextActivity.get().type().name();
			if (daysUntilAction == 0) return "오늘 " + activityType + " 일정이 있습니다.";
			if (daysUntilAction == 1) return "내일 " + activityType + " 일정이 있습니다.";
			return daysUntilAction + "일 후 " + activityType + " 일정이 있습니다.";
		}

		return switch (status) {
			case 상담중 -> "상담 중인 매장입니다.";
			case 재방문 -> "재방문이 필요한 매장입니다.";
			case 미방문 -> "아직 방문하지 않은 영업 대상입니다.";
			case 계약완료, 거절 -> "";
		};
	}

	private Comparator<SalesPriorityResponse> priorityComparator() {
		return Comparator.comparingInt(SalesPriorityResponse::priorityScore)
				.reversed()
				.thenComparing(
						SalesPriorityResponse::nextActionAt,
						Comparator.nullsLast(Comparator.naturalOrder())
				)
				.thenComparing(SalesPriorityResponse::storeName);
	}
}
