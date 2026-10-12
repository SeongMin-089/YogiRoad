package com.yogiroad.backend.dto;

import com.yogiroad.backend.model.SalesStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record SalesDashboardResponse(
		Instant generatedAt,
		Summary summary,
		Map<DashboardPeriod, PeriodPerformance> periods,
		List<DailyConsultation> weeklyConsultations,
		List<StatusProgress> statusProgress,
		List<CompletedStore> recentCompletedStores
) {
	public enum DashboardPeriod {
		WEEK,
		MONTH,
		ALL
	}

	public record Summary(
			int totalRegisteredStores,
			int completedContracts,
			double conversionRate,
			int thisWeekConsultations
	) {
	}

	public record PeriodPerformance(
			Instant startInclusive,
			Instant endExclusive,
			int registeredStores,
			int consultations
	) {
	}

	public record DailyConsultation(
			LocalDate date,
			String dayLabel,
			int consultations
	) {
	}

	public record StatusProgress(
			SalesStatus status,
			int count,
			double percentage
	) {
	}

	public record CompletedStore(
			String storeId,
			String storeName,
			String category,
			String address,
			Instant registeredAt
	) {
	}
}
