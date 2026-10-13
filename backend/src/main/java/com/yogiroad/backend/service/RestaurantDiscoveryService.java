package com.yogiroad.backend.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.SetOptions;
import com.google.cloud.firestore.WriteBatch;
import com.yogiroad.backend.dto.RestaurantLicenseCandidate;
import com.yogiroad.backend.exception.FirestoreOperationException;
import com.yogiroad.backend.exception.RestaurantLicenseApiException;
import com.yogiroad.backend.util.FirestoreDocumentIds;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class RestaurantDiscoveryService {

	private static final Logger log = LoggerFactory.getLogger(RestaurantDiscoveryService.class);
	private static final String PROFILE_COLLECTION = "userProfiles";
	private static final String SNAPSHOT_COLLECTION = "restaurantDiscoverySnapshots";
	private static final String SEEN_COLLECTION = "seenLicenses";
	private static final String LOCK_COLLECTION = "restaurantDiscoveryLocks";
	private static final int WRITE_BATCH_SIZE = 400;
	private static final Pattern PARENTHESES = Pattern.compile("\\([^)]*\\)");

	private final Firestore firestore;
	private final RestaurantLicenseService restaurantLicenseService;
	private final NotificationService notificationService;
	private final int maxRegionsPerRun;
	private final long pollIntervalMs;
	private final Duration lockTtl;
	private final String instanceId = UUID.randomUUID().toString();

	public RestaurantDiscoveryService(
			Firestore firestore,
			RestaurantLicenseService restaurantLicenseService,
			NotificationService notificationService,
			@Value("${yogiroad.notifications.max-regions-per-run:50}") int maxRegionsPerRun,
			@Value("${yogiroad.notifications.poll-interval-ms:600000}") long pollIntervalMs,
			@Value("${yogiroad.notifications.lock-ttl:PT15M}") Duration lockTtl
	) {
		this.firestore = firestore;
		this.restaurantLicenseService = restaurantLicenseService;
		this.notificationService = notificationService;
		this.maxRegionsPerRun = Math.max(1, maxRegionsPerRun);
		this.pollIntervalMs = Math.max(1, pollIntervalMs);
		this.lockTtl = lockTtl;
	}

	@Scheduled(
			fixedDelayString = "${yogiroad.notifications.poll-interval-ms:600000}",
			initialDelayString = "${yogiroad.notifications.initial-delay-ms:30000}"
	)
	public void poll() {
		if (!acquireLock()) {
			log.info("신규 음식점 감지 작업을 다른 서버 인스턴스가 실행 중이므로 이번 주기를 건너뜁니다.");
			return;
		}
		try {
			Map<String, RegionGroup> groups = loadRegionGroups();
			if (groups.size() > maxRegionsPerRun) {
				log.warn("담당 지역 {}개 중 설정 상한인 {}개만 이번 주기에 조회합니다.", groups.size(), maxRegionsPerRun);
			}
			List<RegionGroup> ordered = groups.values().stream()
					.sorted(Comparator.comparing(RegionGroup::regionKey)).toList();
			int processCount = Math.min(maxRegionsPerRun, ordered.size());
			int start = ordered.isEmpty() ? 0 : Math.floorMod(
					(Instant.now().toEpochMilli() / pollIntervalMs) * (long) maxRegionsPerRun,
					ordered.size());
			for (int offset = 0; offset < processCount; offset++) {
				processSafely(ordered.get((start + offset) % ordered.size()));
			}
		} catch (RuntimeException exception) {
			log.error("신규 음식점 자동 감지 주기를 완료하지 못했습니다.", exception);
		} finally {
			releaseLock();
		}
	}

	private void processSafely(RegionGroup group) {
		try {
			process(group);
		} catch (RestaurantLicenseApiException | FirestoreOperationException exception) {
			log.error("지역 {} 신규 음식점 감지에 실패했습니다. 기존 기준 데이터는 유지합니다.",
					group.displayName(), exception);
		} catch (RuntimeException exception) {
			log.error("지역 {} 신규 음식점 감지 중 예상하지 못한 오류가 발생했습니다.",
					group.displayName(), exception);
		}
	}

	private void process(RegionGroup group) {
		RestaurantLicenseService.ScanResult scan = restaurantLicenseService.scanRecentCandidates(group.displayName());
		if (!scan.complete()) {
			log.warn("지역 {} 조회가 페이지 상한에 도달해 불완전할 수 있으므로 기준 데이터를 갱신하지 않습니다. requests={}",
					group.displayName(), scan.requestCount());
			return;
		}
		if (scan.candidates().isEmpty()) {
			log.warn("지역 {} 조회 결과가 비어 있어 비정상 응답 가능성을 배제할 수 없으므로 기준 데이터를 갱신하지 않습니다.",
					group.displayName());
			return;
		}

		DocumentReference snapshot = snapshotDocument(group.regionKey());
		DocumentSnapshot snapshotData = await(snapshot.get(), "지역별 감지 기준 정보를 불러오지 못했습니다.");
		if (!snapshotData.exists() || !Boolean.TRUE.equals(snapshotData.getBoolean("initialized"))) {
			initializeBaseline(snapshot, group, scan);
			return;
		}

		List<RestaurantLicenseCandidate> unseen = findUnseen(snapshot, scan.candidates());
		Instant detectedAt = Instant.now();
		for (RestaurantLicenseCandidate candidate : unseen) {
			List<RegionAssignment> recipients = group.assignments().stream()
					.filter(assignment -> matchesManagedRegion(assignment.region(), candidate))
					.toList();
			if (recipients.isEmpty()) {
				log.warn("관리번호 {}의 주소가 담당 지역과 명확히 일치하지 않아 알림에서 제외합니다. address={}",
						candidate.managementNumber(), candidate.address());
			} else {
				for (RegionAssignment recipient : recipients) {
					notificationService.createRestaurantLicenseNotification(
							recipient.userId(), candidate, group.regionKey(), detectedAt);
				}
			}
			markSeen(snapshot, candidate, detectedAt, false);
		}

		Map<String, Object> metadata = snapshotMetadata(group, scan, detectedAt);
		metadata.put("lastNewCount", unseen.size());
		await(snapshot.set(metadata, SetOptions.merge()), "지역별 감지 기준 정보를 갱신하지 못했습니다.");
		log.info("지역 {} 신규 음식점 감지를 완료했습니다. candidates={}, new={}, requests={}",
				group.displayName(), scan.candidates().size(), unseen.size(), scan.requestCount());
	}

	private void initializeBaseline(
			DocumentReference snapshot,
			RegionGroup group,
			RestaurantLicenseService.ScanResult scan
	) {
		Instant initializedAt = Instant.now();
		for (int start = 0; start < scan.candidates().size(); start += WRITE_BATCH_SIZE) {
			WriteBatch batch = firestore.batch();
			int end = Math.min(start + WRITE_BATCH_SIZE, scan.candidates().size());
			for (RestaurantLicenseCandidate candidate : scan.candidates().subList(start, end)) {
				batch.set(seenDocument(snapshot, candidate.managementNumber()),
						seenDocumentData(candidate, initializedAt, true), SetOptions.merge());
			}
			await(batch.commit(), "지역별 최초 감지 기준을 저장하지 못했습니다.");
		}
		Map<String, Object> metadata = snapshotMetadata(group, scan, initializedAt);
		metadata.put("initialized", true);
		metadata.put("initializedAt", toTimestamp(initializedAt));
		metadata.put("lastNewCount", 0);
		await(snapshot.set(metadata, SetOptions.merge()), "지역별 최초 감지 기준을 완료하지 못했습니다.");
		log.info("지역 {} 최초 기준 데이터 {}건을 저장했습니다. 최초 실행 알림은 생성하지 않습니다.",
				group.displayName(), scan.candidates().size());
	}

	private List<RestaurantLicenseCandidate> findUnseen(
			DocumentReference snapshot,
			List<RestaurantLicenseCandidate> candidates
	) {
		List<ApiFuture<DocumentSnapshot>> reads = candidates.stream()
				.map(candidate -> seenDocument(snapshot, candidate.managementNumber()).get())
				.toList();
		List<RestaurantLicenseCandidate> unseen = new ArrayList<>();
		for (int index = 0; index < candidates.size(); index++) {
			if (!await(reads.get(index), "인허가 관리번호 감지 이력을 확인하지 못했습니다.").exists()) {
				unseen.add(candidates.get(index));
			}
		}
		return unseen;
	}

	private void markSeen(
			DocumentReference snapshot,
			RestaurantLicenseCandidate candidate,
			Instant seenAt,
			boolean baseline
	) {
		await(seenDocument(snapshot, candidate.managementNumber())
				.set(seenDocumentData(candidate, seenAt, baseline), SetOptions.merge()),
				"인허가 관리번호 감지 이력을 저장하지 못했습니다.");
	}

	private Map<String, RegionGroup> loadRegionGroups() {
		QuerySnapshot profiles = await(firestore.collection(PROFILE_COLLECTION)
				.whereGreaterThan("managedRegion.region2DepthName", "").get(),
				"담당 지역 사용자 목록을 불러오지 못했습니다.");
		Map<String, RegionGroup> groups = new LinkedHashMap<>();
		for (DocumentSnapshot profile : profiles.getDocuments()) {
			String userId = clean(profile.getString("userId"));
			ManagedRegion region = readRegion(profile.get("managedRegion"));
			if (userId == null || region == null) continue;
			String key = region.baseKey();
			RegionGroup group = groups.computeIfAbsent(key,
					ignored -> new RegionGroup(key, region.baseDisplayName(), new ArrayList<>()));
			group.assignments().add(new RegionAssignment(userId, region));
		}
		return groups;
	}

	@SuppressWarnings("unchecked")
	private ManagedRegion readRegion(Object rawValue) {
		if (!(rawValue instanceof Map<?, ?> raw)) return null;
		Map<String, Object> value = (Map<String, Object>) raw;
		String first = clean(value.get("region1DepthName"));
		String second = clean(value.get("region2DepthName"));
		String third = clean(value.get("region3DepthName"));
		if (first == null || second == null) return null;
		return new ManagedRegion(first, second, third);
	}

	static boolean matchesManagedRegion(ManagedRegion region, RestaurantLicenseCandidate candidate) {
		return matchesAddress(region, candidate.roadAddress()) || matchesAddress(region, candidate.lotNumberAddress());
	}

	private static boolean matchesAddress(ManagedRegion region, String address) {
		String cleanAddress = clean(address);
		if (cleanAddress == null) return false;
		List<String> addressParts = tokens(cleanAddress);
		List<String> expected = new ArrayList<>();
		expected.add(canonicalProvince(region.region1DepthName()));
		expected.addAll(tokens(region.region2DepthName()));
		if (region.region3DepthName() != null) expected.addAll(tokens(region.region3DepthName()));
		if (addressParts.size() < expected.size()) return false;
		for (int index = 0; index < expected.size(); index++) {
			String actual = index == 0 ? canonicalProvince(addressParts.get(index)) : addressParts.get(index);
			if (!expected.get(index).equals(actual)) return false;
		}
		return true;
	}

	private static List<String> tokens(String value) {
		String withoutParentheses = PARENTHESES.matcher(value).replaceAll(" ");
		return List.of(withoutParentheses.trim().split("\\s+")).stream()
				.map(RestaurantDiscoveryService::normalizeToken)
				.filter(token -> !token.isBlank())
				.toList();
	}

	private static String canonicalProvince(String value) {
		return switch (normalizeToken(value)) {
			case "서울", "서울시", "서울특별시" -> "서울특별시";
			case "부산", "부산시", "부산광역시" -> "부산광역시";
			case "대구", "대구시", "대구광역시" -> "대구광역시";
			case "인천", "인천시", "인천광역시" -> "인천광역시";
			case "광주", "광주시", "광주광역시" -> "광주광역시";
			case "대전", "대전시", "대전광역시" -> "대전광역시";
			case "울산", "울산시", "울산광역시" -> "울산광역시";
			case "세종", "세종시", "세종특별자치시" -> "세종특별자치시";
			case "경기", "경기도" -> "경기도";
			case "강원", "강원도", "강원특별자치도" -> "강원특별자치도";
			case "충북", "충청북도" -> "충청북도";
			case "충남", "충청남도" -> "충청남도";
			case "전북", "전라북도", "전북특별자치도" -> "전북특별자치도";
			case "전남", "전라남도" -> "전라남도";
			case "경북", "경상북도" -> "경상북도";
			case "경남", "경상남도" -> "경상남도";
			case "제주", "제주도", "제주특별자치도" -> "제주특별자치도";
			default -> normalizeToken(value);
		};
	}

	private static String normalizeToken(String value) {
		return value == null ? "" : value.toLowerCase(Locale.KOREAN).replaceAll("[^\\p{L}\\p{N}]", "");
	}

	private static String clean(Object value) {
		if (!(value instanceof String string)) return null;
		String clean = string.trim().replaceAll("\\s+", " ");
		return clean.isBlank() ? null : clean;
	}

	private DocumentReference snapshotDocument(String regionKey) {
		return firestore.collection(SNAPSHOT_COLLECTION)
				.document(FirestoreDocumentIds.discoveryRegion(regionKey));
	}

	private DocumentReference seenDocument(DocumentReference snapshot, String managementNumber) {
		return snapshot.collection(SEEN_COLLECTION)
				.document(FirestoreDocumentIds.discoveryItem(managementNumber));
	}

	private Map<String, Object> seenDocumentData(
			RestaurantLicenseCandidate candidate,
			Instant seenAt,
			boolean baseline
	) {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("managementNumber", candidate.managementNumber());
		data.put("storeName", candidate.storeName());
		data.put("licenseDate", candidate.licenseDate().toString());
		data.put("firstSeenAt", toTimestamp(seenAt));
		data.put("baseline", baseline);
		return data;
	}

	private Map<String, Object> snapshotMetadata(
			RegionGroup group,
			RestaurantLicenseService.ScanResult scan,
			Instant checkedAt
	) {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("regionKey", group.regionKey());
		data.put("regionDisplayName", group.displayName());
		data.put("initialized", true);
		data.put("lastCheckedAt", toTimestamp(checkedAt));
		data.put("lastSuccessfulAt", toTimestamp(checkedAt));
		data.put("lastCandidateCount", scan.candidates().size());
		data.put("lastRequestCount", scan.requestCount());
		data.put("queryWindowStart", scan.windowStart().toString());
		data.put("queryWindowEnd", scan.windowEnd().toString());
		data.put("complete", true);
		return data;
	}

	private boolean acquireLock() {
		DocumentReference lock = firestore.collection(LOCK_COLLECTION).document("global");
		Instant now = Instant.now();
		return await(firestore.runTransaction(transaction -> {
			DocumentSnapshot snapshot = await(transaction.get(lock), "자동 감지 실행 잠금을 확인하지 못했습니다.");
			Timestamp expiresAt = snapshot.getTimestamp("expiresAt");
			if (expiresAt != null && expiresAt.toSqlTimestamp().toInstant().isAfter(now)) return false;
			transaction.set(lock, Map.of(
					"holder", instanceId,
					"acquiredAt", toTimestamp(now),
					"expiresAt", toTimestamp(now.plus(lockTtl))
			));
			return true;
		}), "자동 감지 실행 잠금을 획득하지 못했습니다.");
	}

	private void releaseLock() {
		DocumentReference lock = firestore.collection(LOCK_COLLECTION).document("global");
		try {
			await(firestore.runTransaction(transaction -> {
				DocumentSnapshot snapshot = await(transaction.get(lock), "자동 감지 실행 잠금을 확인하지 못했습니다.");
				if (snapshot.exists() && instanceId.equals(snapshot.getString("holder"))) {
					transaction.update(lock, "expiresAt", toTimestamp(Instant.now()));
				}
				return null;
			}), "자동 감지 실행 잠금을 해제하지 못했습니다.");
		} catch (RuntimeException exception) {
			log.warn("자동 감지 실행 잠금을 즉시 해제하지 못했습니다. 임대 만료 후 자동 복구됩니다.", exception);
		}
	}

	private Timestamp toTimestamp(Instant value) {
		return Timestamp.ofTimeSecondsAndNanos(value.getEpochSecond(), value.getNano());
	}

	private <T> T await(ApiFuture<T> future, String errorMessage) {
		try {
			return future.get();
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw new FirestoreOperationException(errorMessage, exception);
		} catch (ExecutionException exception) {
			if (exception.getCause() instanceof RuntimeException runtimeException) throw runtimeException;
			throw new FirestoreOperationException(errorMessage, exception.getCause());
		}
	}

	record ManagedRegion(String region1DepthName, String region2DepthName, String region3DepthName) {
		String baseKey() {
			return canonicalProvince(region1DepthName) + "|" + String.join("|", tokens(region2DepthName));
		}

		String baseDisplayName() {
			return canonicalProvince(region1DepthName) + " " + region2DepthName;
		}
	}

	private record RegionAssignment(String userId, ManagedRegion region) {
	}

	private record RegionGroup(String regionKey, String displayName, List<RegionAssignment> assignments) {
	}
}
