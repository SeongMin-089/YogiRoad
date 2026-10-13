package com.yogiroad.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.google.api.core.ApiFutures;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.SetOptions;
import com.google.cloud.firestore.WriteBatch;
import com.google.cloud.firestore.WriteResult;
import com.yogiroad.backend.dto.RestaurantLicenseCandidate;
import com.yogiroad.backend.exception.FirestoreOperationException;
import com.yogiroad.backend.exception.RestaurantLicenseApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

@SuppressWarnings("unchecked")
class RestaurantDiscoveryWorkflowTests {

	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-13T00:00:00Z"), ZoneOffset.UTC);

	private final Firestore firestore = mock(Firestore.class);
	private final RestaurantLicenseService licenseService = mock(RestaurantLicenseService.class);
	private final NotificationService notificationService = mock(NotificationService.class);
	private final CollectionReference snapshots = mock(CollectionReference.class);
	private final DocumentReference snapshot = mock(DocumentReference.class);
	private final CollectionReference seenLicenses = mock(CollectionReference.class);
	private final DocumentReference seenLicense = mock(DocumentReference.class);
	private final DocumentSnapshot snapshotData = mock(DocumentSnapshot.class);
	private final DocumentSnapshot missingSeen = mock(DocumentSnapshot.class);
	private final WriteResult writeResult = mock(WriteResult.class);
	private final RestaurantDiscoveryService service = new RestaurantDiscoveryService(
			firestore, licenseService, notificationService, 50, 600_000, Duration.ofMinutes(15), CLOCK);

	@BeforeEach
	void setUpFirestore() {
		when(firestore.collection("restaurantDiscoverySnapshots")).thenReturn(snapshots);
		when(snapshots.document(anyString())).thenReturn(snapshot);
		when(snapshot.collection("seenLicenses")).thenReturn(seenLicenses);
		when(seenLicenses.document(anyString())).thenReturn(seenLicense);
		when(snapshot.get()).thenReturn(ApiFutures.immediateFuture(snapshotData));
		when(snapshot.set(anyMap(), any(SetOptions.class)))
				.thenReturn(ApiFutures.immediateFuture(writeResult));
		when(seenLicense.set(anyMap(), any(SetOptions.class)))
				.thenReturn(ApiFutures.immediateFuture(writeResult));
		when(missingSeen.exists()).thenReturn(false);
	}

	@Test
	void completeZeroResultCreatesAnEmptyInitializedBaseline() {
		when(snapshotData.exists()).thenReturn(false);
		when(licenseService.scanRecentCandidates("경기도 남양주시")).thenReturn(scan(List.of(), true));

		service.process(group(assignment("user-a", "")));

		ArgumentCaptor<Map<String, Object>> metadata = mapCaptor();
		verify(snapshot).set(metadata.capture(), any(SetOptions.class));
		assertEquals(true, metadata.getValue().get("initialized"));
		assertEquals(0, metadata.getValue().get("lastCandidateCount"));
		verifyNoInteractions(notificationService);
		verify(firestore, never()).batch();
	}

	@Test
	void firstCandidateAfterEmptyBaselineCreatesNotificationAndBecomesSeen() {
		when(snapshotData.exists()).thenReturn(true);
		when(snapshotData.getBoolean("initialized")).thenReturn(true);
		when(seenLicense.get()).thenReturn(ApiFutures.immediateFuture(missingSeen));
		RestaurantLicenseCandidate candidate = candidate("NEW-1", "경기도 남양주시 진접읍 1");
		when(licenseService.scanRecentCandidates("경기도 남양주시"))
				.thenReturn(scan(List.of(candidate), true));

		service.process(group(assignment("user-a", "")));

		verify(notificationService).createRestaurantLicenseNotification(
				eq("user-a"), eq(candidate), eq("경기도|남양주시"), eq(CLOCK.instant()));
		verify(seenLicense).set(anyMap(), any(SetOptions.class));
	}

	@Test
	void partialRecipientFailureRetriesOnlyTheMissingNotificationBeforeMarkingSeen() {
		when(snapshotData.exists()).thenReturn(true);
		when(snapshotData.getBoolean("initialized")).thenReturn(true);
		when(seenLicense.get()).thenReturn(
				ApiFutures.immediateFuture(missingSeen), ApiFutures.immediateFuture(missingSeen));
		RestaurantLicenseCandidate candidate = candidate("NEW-2", "경기도 남양주시 진접읍 2");
		when(licenseService.scanRecentCandidates("경기도 남양주시"))
				.thenReturn(scan(List.of(candidate), true));
		when(notificationService.createRestaurantLicenseNotification(
				eq("user-a"), eq(candidate), any(), any())).thenReturn(true, false);
		when(notificationService.createRestaurantLicenseNotification(
				eq("user-b"), eq(candidate), any(), any()))
				.thenThrow(new FirestoreOperationException("test failure", new RuntimeException("test")))
				.thenReturn(true);
		RestaurantDiscoveryService.RegionGroup group = group(
				assignment("user-a", "진접읍"), assignment("user-b", "진접읍"));

		assertThrows(FirestoreOperationException.class, () -> service.process(group));
		verify(seenLicense, never()).set(anyMap(), any(SetOptions.class));

		service.process(group);

		verify(notificationService, times(2)).createRestaurantLicenseNotification(
				eq("user-a"), eq(candidate), any(), any());
		verify(notificationService, times(2)).createRestaurantLicenseNotification(
				eq("user-b"), eq(candidate), any(), any());
		verify(seenLicense).set(anyMap(), any(SetOptions.class));
	}

	@Test
	void anExistingSeenLicenseSurvivesAServiceRestartWithoutDuplicateNotification() {
		DocumentSnapshot existingSeen = mock(DocumentSnapshot.class);
		when(existingSeen.exists()).thenReturn(true);
		when(snapshotData.exists()).thenReturn(true);
		when(snapshotData.getBoolean("initialized")).thenReturn(true);
		when(seenLicense.get()).thenReturn(ApiFutures.immediateFuture(existingSeen));
		when(licenseService.scanRecentCandidates("경기도 남양주시"))
				.thenReturn(scan(List.of(candidate("KNOWN-1", "경기도 남양주시 진접읍 1")), true));

		new RestaurantDiscoveryService(
				firestore, licenseService, notificationService, 50, 600_000,
				Duration.ofMinutes(15), CLOCK).process(group(assignment("user-a", "진접읍")));

		verifyNoInteractions(notificationService);
		verify(seenLicense, never()).set(anyMap(), any(SetOptions.class));
	}

	@Test
	void incompletePaginationPreservesTheExistingBaseline() {
		when(licenseService.scanRecentCandidates("경기도 남양주시"))
				.thenReturn(scan(List.of(candidate("PARTIAL-1", "경기도 남양주시 진접읍 1")), false));

		service.process(group(assignment("user-a", "진접읍")));

		verify(snapshot, never()).get();
		verifyNoInteractions(notificationService);
	}

	@Test
	void apiFailurePreservesTheExistingBaseline() {
		when(licenseService.scanRecentCandidates("경기도 남양주시"))
				.thenThrow(new RestaurantLicenseApiException("temporary failure"));

		assertThrows(RestaurantLicenseApiException.class,
				() -> service.process(group(assignment("user-a", "진접읍"))));

		verify(snapshot, never()).get();
		verifyNoInteractions(notificationService);
	}

	@Test
	void rotatingRegionWindowEventuallyIncludesEveryRegionAboveThePerRunLimit() {
		List<String> regions = List.of("a", "b", "c", "d", "e");

		List<String> processed = java.util.stream.LongStream.range(0, 3)
				.boxed()
				.flatMap(cycle -> RestaurantDiscoveryService.rotatingWindow(regions, 2, cycle).stream())
				.distinct()
				.toList();

		assertEquals(regions, processed);
	}

	@Test
	void initialNonEmptyScanSeedsPastRestaurantsWithoutNotifyingANewRegionUser() {
		when(snapshotData.exists()).thenReturn(false);
		WriteBatch batch = mock(WriteBatch.class);
		when(firestore.batch()).thenReturn(batch);
		when(batch.set(any(DocumentReference.class), anyMap(), any(SetOptions.class))).thenReturn(batch);
		when(batch.commit()).thenReturn(ApiFutures.immediateFuture(List.of(writeResult)));
		when(licenseService.scanRecentCandidates("경기도 남양주시"))
				.thenReturn(scan(List.of(candidate("PAST-1", "경기도 남양주시 진접읍 1")), true));

		service.process(group(assignment("new-user", "진접읍")));

		verifyNoInteractions(notificationService);
		verify(batch).set(eq(seenLicense), anyMap(), any(SetOptions.class));
		verify(batch).commit();
	}

	@Test
	void townMismatchDoesNotNotifyButStillRecordsTheRegionalObservation() {
		when(snapshotData.exists()).thenReturn(true);
		when(snapshotData.getBoolean("initialized")).thenReturn(true);
		when(seenLicense.get()).thenReturn(ApiFutures.immediateFuture(missingSeen));
		when(licenseService.scanRecentCandidates("경기도 남양주시"))
				.thenReturn(scan(List.of(candidate("OTHER-TOWN", "경기도 남양주시 화도읍 1")), true));

		service.process(group(assignment("user-a", "진접읍")));

		verifyNoInteractions(notificationService);
		verify(seenLicense).set(anyMap(), any(SetOptions.class));
	}

	private RestaurantDiscoveryService.RegionGroup group(
			RestaurantDiscoveryService.RegionAssignment... assignments
	) {
		return new RestaurantDiscoveryService.RegionGroup(
				"경기도|남양주시", "경기도 남양주시", List.of(assignments));
	}

	private RestaurantDiscoveryService.RegionAssignment assignment(String userId, String town) {
		return new RestaurantDiscoveryService.RegionAssignment(userId,
				new RestaurantDiscoveryService.ManagedRegion(
						"경기도", "남양주시", town.isBlank() ? null : town));
	}

	private RestaurantLicenseService.ScanResult scan(
			List<RestaurantLicenseCandidate> candidates,
			boolean complete
	) {
		return new RestaurantLicenseService.ScanResult(
				candidates, complete, 2, LocalDate.of(2026, 9, 14), LocalDate.of(2026, 10, 13));
	}

	private RestaurantLicenseCandidate candidate(String managementNumber, String address) {
		return new RestaurantLicenseCandidate(
				managementNumber, "license:" + managementNumber, "테스트 식당", LocalDate.of(2026, 10, 13),
				"01", "영업/정상", "한식", address, address, "", "", null, null,
				"ADDRESS_REQUIRED");
	}

	@SuppressWarnings({"unchecked", "rawtypes"})
	private ArgumentCaptor<Map<String, Object>> mapCaptor() {
		return (ArgumentCaptor) ArgumentCaptor.forClass(Map.class);
	}
}
