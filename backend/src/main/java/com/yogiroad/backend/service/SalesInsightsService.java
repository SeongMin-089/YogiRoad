
package com.yogiroad.backend.service;

import com.yogiroad.backend.dto.SalesDashboardResponse;
import com.yogiroad.backend.dto.SalesDashboardResponse.CompletedStore;
import com.yogiroad.backend.dto.SalesDashboardResponse.DailyConsultation;
import com.yogiroad.backend.dto.SalesDashboardResponse.DashboardPeriod;
import com.yogiroad.backend.dto.SalesDashboardResponse.PeriodPerformance;
import com.yogiroad.backend.dto.SalesDashboardResponse.StatusProgress;
import com.yogiroad.backend.dto.SalesPriorityResponse;
import com.yogiroad.backend.dto.UpcomingSalesActionResponse;
import com.yogiroad.backend.model.SalesActivity;
import com.yogiroad.backend.model.SalesActivityType;
import com.yogiroad.backend.model.SalesStatus;
import com.yogiroad.backend.model.SalesTarget;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SalesInsightsService {

    private static final Duration UPCOMING_WINDOW = Duration.ofDays(30);
    private static final int UPCOMING_LIMIT = 50;
    private static final int PRIORITY_LIMIT = 5;
    private static final ZoneId SEOUL_ZONE = ZoneId.of("Asia/Seoul");

    private final SalesActivityService salesActivityService;
    private final SalesTargetService salesTargetService;
    private final Clock clock;

    @Autowired
    public SalesInsightsService(
            SalesActivityService salesActivityService,
            SalesTargetService salesTargetService
    ) {
        this(salesActivityService, salesTargetService, Clock.systemUTC());
    }

    SalesInsightsService(
            SalesActivityService salesActivityService,
            SalesTargetService salesTargetService,
            Clock clock
    ) {
        this.salesActivityService = salesActivityService;
        this.salesTargetService = salesTargetService;
        this.clock = clock;
    }

    public SalesDashboardResponse getDashboard(String userId) {
        Instant now = clock.instant();
        LocalDate today = now.atZone(SEOUL_ZONE).toLocalDate();

        LocalDate weekStartDate = today.with(
                TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)
        );

        Instant weekStart = startOfDay(weekStartDate);
        Instant weekEnd = startOfDay(weekStartDate.plusDays(7));

        LocalDate monthStartDate = today.withDayOfMonth(1);
        Instant monthStart = startOfDay(monthStartDate);
        Instant monthEnd = startOfDay(monthStartDate.plusMonths(1));

        List<SalesTarget> targets = salesTargetService.findAll(userId);

        List<SalesActivity> consultations = salesActivityService.findAll(userId)
                .stream()
                .filter(activity -> activity.type() == SalesActivityType.상담)
                .toList();

        int total = targets.size();

        int completed = (int) targets.stream()
                .filter(target -> target.status() == SalesStatus.계약완료)
                .count();

        int thisWeekConsultations = countActivities(
                consultations, weekStart, weekEnd
        );

        Map<DashboardPeriod, PeriodPerformance> periods =
                new EnumMap<>(DashboardPeriod.class);

        periods.put(
                DashboardPeriod.WEEK,
                periodPerformance(targets, consultations, weekStart, weekEnd)
        );

        periods.put(
                DashboardPeriod.MONTH,
                periodPerformance(targets, consultations, monthStart, monthEnd)
        );

        periods.put(
                DashboardPeriod.ALL,
                new PeriodPerformance(
                        null,
                        null,
                        total,
                        consultations.size()
                )
        );

        List<DailyConsultation> weeklyConsultations =
                IntStream.range(0, 7)
                        .mapToObj(offset -> {
                            LocalDate date = weekStartDate.plusDays(offset);

                            return new DailyConsultation(
                                    date,
                                    dayLabel(offset),
                                    countActivities(
                                            consultations,
                                            startOfDay(date),
                                            startOfDay(date.plusDays(1))
                                    )
                            );
                        })
                        .toList();

        List<StatusProgress> statusProgress =
                Arrays.stream(SalesStatus.values())
                        .map(status -> {
                            int count = (int) targets.stream()
                                    .filter(target -> target.status() == status)
                                    .count();

                            return new StatusProgress(
                                    status,
                                    count,
                                    percentage(count, total)
                            );
                        })
                        .toList();

        List<CompletedStore> recentCompletedStores =
                targets.stream()
                        .filter(target -> target.status() == SalesStatus.계약완료)
                        .sorted(
                                Comparator.comparing(SalesTarget::registeredAt)
                                        .reversed()
                        )
                        .limit(5)
                        .map(target -> new CompletedStore(
                                target.storeId(),
                                target.storeName(),
                                target.category(),
                                target.address(),
                                target.registeredAt()
                        ))
                        .toList();

        return new SalesDashboardResponse(
                now,
                new SalesDashboardResponse.Summary(
                        total,
                        completed,
                        percentage(completed, total),
                        thisWeekConsultations
                ),
                periods,
                weeklyConsultations,
                statusProgress,
                recentCompletedStores
        );
    }

    public List<UpcomingSalesActionResponse> findUpcomingActions(String userId) {
        Instant now = clock.instant();

        List<SalesActivity> activities = salesActivityService.findUpcoming(
                userId,
                now,
                now.plus(UPCOMING_WINDOW),
                UPCOMING_LIMIT
        );

        Map<String, SalesTarget> targets =
                salesTargetService.findAll(userId)
                        .stream()
                        .collect(
                                Collectors.toMap(
                                        SalesTarget::storeId,
                                        Function.identity()
                                )
                        );

        return activities.stream()
                .filter(activity -> targets.containsKey(activity.storeId()))
                .map(activity -> toUpcomingResponse(
                        activity,
                        targets.get(activity.storeId())
                ))
                .toList();
    }

    public List<SalesPriorityResponse> findPriorities(String userId) {
        Instant now = clock.instant();
        LocalDate today = now.atZone(SEOUL_ZONE).toLocalDate();

        Map<String, List<SalesActivity>> activitiesByStore =
                salesActivityService.findAll(userId)
                        .stream()
                        .collect(
                                Collectors.groupingBy(SalesActivity::storeId)
                        );

        return salesTargetService.findAll(userId)
                .stream()
                .filter(target ->
                        target.status() != SalesStatus.계약완료
                        && target.status() != SalesStatus.거절
                )
                .map(target -> toPriorityResponse(
                        target,
                        activitiesByStore.getOrDefault(
                                target.storeId(),
                                List.of()
                        ),
                        now,
                        today
                ))
                .sorted(priorityComparator())
                .limit(PRIORITY_LIMIT)
                .toList();
    }

    private PeriodPerformance periodPerformance(
            List<SalesTarget> targets,
            List<SalesActivity> consultations,
            Instant startInclusive,
            Instant endExclusive
    ) {
        int registeredStores = (int) targets.stream()
                .filter(target -> inRange(
                        target.registeredAt(),
                        startInclusive,
                        endExclusive
                ))
                .count();

        return new PeriodPerformance(
                startInclusive,
                endExclusive,
                registeredStores,
                countActivities(
                        consultations,
                        startInclusive,
                        endExclusive
                )
        );
    }

    private int countActivities(
            List<SalesActivity> activities,
            Instant startInclusive,
            Instant endExclusive
    ) {
        return (int) activities.stream()
                .filter(activity -> inRange(
                        activity.createdAt(),
                        startInclusive,
                        endExclusive
                ))
                .count();
    }

    private boolean inRange(
            Instant value,
            Instant startInclusive,
            Instant endExclusive
    ) {
        return !value.isBefore(startInclusive)
                && value.isBefore(endExclusive);
    }

    private Instant startOfDay(LocalDate date) {
        return date.atStartOfDay(SEOUL_ZONE).toInstant();
    }

    private String dayLabel(int offset) {
        return switch (offset) {
            case 0 -> "월";
            case 1 -> "화";
            case 2 -> "수";
            case 3 -> "목";
            case 4 -> "금";
            case 5 -> "토";
            case 6 -> "일";
            default -> throw new IllegalArgumentException(
                    "요일 범위를 벗어났습니다."
            );
        };
    }

    private double percentage(int count, int total) {
        if (total == 0) return 0;
        return Math.round((count * 1000.0) / total) / 10.0;
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
                .filter(activity ->
                        activity.nextActionAt() != null
                        && !activity.nextActionAt().isBefore(now)
                )
                .min(Comparator.comparing(SalesActivity::nextActionAt));

        long daysUntilAction = nextActivity
                .map(activity -> ChronoUnit.DAYS.between(
                        today,
                        activity.nextActionAt()
                                .atZone(SEOUL_ZONE)
                                .toLocalDate()
                ))
                .orElse(Long.MAX_VALUE);

        int score = scheduleScore(daysUntilAction)
                + statusScore(target.status())
                + (activities.isEmpty() ? 0 : 10);

        String reason = priorityReason(
                target.status(),
                nextActivity,
                daysUntilAction
        );

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

            if (daysUntilAction == 0) {
                return "오늘 " + activityType + " 일정이 있습니다.";
            }

            if (daysUntilAction == 1) {
                return "내일 " + activityType + " 일정이 있습니다.";
            }

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
        return Comparator.comparingInt(
                        SalesPriorityResponse::priorityScore
                )
                .reversed()
                .thenComparing(
                        SalesPriorityResponse::nextActionAt,
                        Comparator.nullsLast(Comparator.naturalOrder())
                )
                .thenComparing(SalesPriorityResponse::storeName);
    }
}
