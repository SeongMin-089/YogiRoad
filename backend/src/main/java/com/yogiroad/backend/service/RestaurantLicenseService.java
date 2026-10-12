package com.yogiroad.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yogiroad.backend.dto.RestaurantLicenseCandidate;
import com.yogiroad.backend.exception.RestaurantLicenseApiException;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import org.locationtech.proj4j.CRSFactory;
import org.locationtech.proj4j.CoordinateReferenceSystem;
import org.locationtech.proj4j.CoordinateTransform;
import org.locationtech.proj4j.CoordinateTransformFactory;
import org.locationtech.proj4j.ProjCoordinate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class RestaurantLicenseService {

	private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
	private static final int PAGE_SIZE = 100;
	private static final int MAX_PAGES_PER_ADDRESS_FIELD = 10;
	private static final int MAX_CACHE_ENTRIES = 100;
	private static final String ACTIVE_STATUS = "01";
	private static final Pattern ALLOWED_REGION = Pattern.compile("^[\\p{L}\\p{N} .·-]{2,60}$");
	private static final DateTimeFormatter COMPACT_DATE = DateTimeFormatter.BASIC_ISO_DATE;
	private static final CoordinateTransform EPSG_5174_TO_WGS84 = createTransform();

	private final RestClient restClient;
	private final ObjectMapper objectMapper;
	private final String apiKey;
	private final String baseUrl;
	private final Duration cacheTtl;
	private final Clock clock;
	private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
	private final Map<String, Object> cacheLocks = new ConcurrentHashMap<>();

	@Autowired
	public RestaurantLicenseService(
			RestClient.Builder restClientBuilder,
			@Value("${restaurant-license.api-key}") String apiKey,
			@Value("${restaurant-license.base-url}") String baseUrl,
			@Value("${restaurant-license.cache-ttl:PT15M}") Duration cacheTtl
	) {
		this(buildRestClient(restClientBuilder), new ObjectMapper(), apiKey, baseUrl, cacheTtl, Clock.systemUTC());
	}

	private static RestClient buildRestClient(RestClient.Builder builder) {
		HttpClient httpClient = HttpClient.newBuilder()
				.connectTimeout(Duration.ofSeconds(5))
				.build();
		JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
		requestFactory.setReadTimeout(Duration.ofSeconds(15));
		return builder.requestFactory(requestFactory).build();
	}

	RestaurantLicenseService(
			RestClient restClient,
			ObjectMapper objectMapper,
			String apiKey,
			String baseUrl,
			Duration cacheTtl,
			Clock clock
	) {
		this.restClient = restClient;
		this.objectMapper = objectMapper;
		this.apiKey = decodeServiceKey(apiKey);
		this.baseUrl = baseUrl;
		this.cacheTtl = cacheTtl;
		this.clock = clock;
	}

	public List<RestaurantLicenseCandidate> findRecentCandidates(String region) {
		String cleanRegion = normalizeRegionQuery(region);
		LocalDate today = LocalDate.now(clock.withZone(SEOUL));
		String cacheKey = normalizeForMatch(cleanRegion) + ':' + today;
		Instant now = clock.instant();
		CacheEntry cached = cache.get(cacheKey);
		if (cached != null && cached.expiresAt().isAfter(now)) return cached.candidates();

		Object lock = cacheLocks.computeIfAbsent(cacheKey, ignored -> new Object());
		try {
			synchronized (lock) {
				cached = cache.get(cacheKey);
				if (cached != null && cached.expiresAt().isAfter(clock.instant())) return cached.candidates();
				List<RestaurantLicenseCandidate> candidates = loadCandidates(cleanRegion, today);
				putCache(cacheKey, candidates);
				return candidates;
			}
		} finally {
			cacheLocks.remove(cacheKey, lock);
		}
	}

	private List<RestaurantLicenseCandidate> loadCandidates(String region, LocalDate today) {
		validateConfiguration();
		LocalDate startDate = today.minusDays(29);
		Map<String, RestaurantLicenseCandidate> deduplicated = new LinkedHashMap<>();
		for (String addressField : List.of("ROAD_NM_ADDR", "LOTNO_ADDR")) {
			for (RawRestaurant row : fetchAllPages(region, addressField, startDate)) {
				RestaurantLicenseCandidate candidate = toCandidate(row, region, startDate, today);
				if (candidate != null) deduplicated.putIfAbsent(candidate.managementNumber(), candidate);
			}
		}
		return deduplicated.values().stream()
				.sorted(Comparator.comparing(RestaurantLicenseCandidate::licenseDate).reversed()
						.thenComparing(RestaurantLicenseCandidate::storeName))
				.toList();
	}

	private List<RawRestaurant> fetchAllPages(String region, String addressField, LocalDate startDate) {
		List<RawRestaurant> result = new ArrayList<>();
		for (int pageNo = 1; pageNo <= MAX_PAGES_PER_ADDRESS_FIELD; pageNo++) {
			RawPage page = fetchPage(region, addressField, startDate, pageNo);
			result.addAll(page.items());
			if (page.items().isEmpty() || (long) pageNo * PAGE_SIZE >= page.totalCount()) break;
		}
		return result;
	}

	private RawPage fetchPage(String region, String addressField, LocalDate startDate, int pageNo) {
		URI uri = UriComponentsBuilder.fromUriString(baseUrl)
				.queryParam("serviceKey", apiKey)
				.queryParam("pageNo", pageNo)
				.queryParam("numOfRows", PAGE_SIZE)
				.queryParam("returnType", "json")
				.queryParam("cond[LCPMT_YMD::GTE]", startDate)
				.queryParam("cond[SALS_STTS_CD::EQ]", ACTIVE_STATUS)
				.queryParam("cond[" + addressField + "::LIKE]", region)
				.encode(StandardCharsets.UTF_8)
				.build()
				.toUri();

		String responseBody;
		try {
			responseBody = restClient.get().uri(uri).retrieve().body(String.class);
		} catch (RestClientResponseException exception) {
			throw new RestaurantLicenseApiException(
					"신규 인허가 정보를 불러오지 못했습니다. (HTTP " + exception.getStatusCode().value() + ")");
		} catch (RestClientException exception) {
			throw new RestaurantLicenseApiException("신규 인허가 정보 제공기관에 연결할 수 없습니다.", exception);
		}
		if (responseBody == null || responseBody.isBlank()) {
			throw new RestaurantLicenseApiException("신규 인허가 정보 응답이 비어 있습니다.");
		}
		return parsePage(responseBody);
	}

	private RawPage parsePage(String responseBody) {
		try {
			JsonNode response = objectMapper.readTree(responseBody).path("response");
			JsonNode header = response.path("header");
			String resultCode = header.path("resultCode").asText("00");
			if (!resultCode.equals("00") && !resultCode.equals("0")) {
				throw new RestaurantLicenseApiException(
						"신규 인허가 정보 제공기관이 오류를 반환했습니다. (code=" + safeCode(resultCode) + ")");
			}
			JsonNode body = response.path("body");
			long totalCount = body.path("totalCount").asLong(0);
			JsonNode items = body.path("items").path("item");
			List<RawRestaurant> rows = new ArrayList<>();
			if (items.isArray()) items.forEach(item -> rows.add(readRow(item)));
			else if (items.isObject()) rows.add(readRow(items));
			return new RawPage(totalCount, rows);
		} catch (JsonProcessingException exception) {
			throw new RestaurantLicenseApiException("신규 인허가 정보 응답 형식을 읽을 수 없습니다.", exception);
		}
	}

	private RawRestaurant readRow(JsonNode item) {
		return new RawRestaurant(
				text(item, "MNG_NO"), text(item, "BPLC_NM"), text(item, "LCPMT_YMD"),
				text(item, "SALS_STTS_CD"), text(item, "SALS_STTS_NM"), text(item, "BZSTAT_SE_NM"),
				text(item, "ROAD_NM_ADDR"), text(item, "LOTNO_ADDR"), text(item, "TELNO"),
				text(item, "CRD_INFO_X"), text(item, "CRD_INFO_Y")
		);
	}

	private RestaurantLicenseCandidate toCandidate(
			RawRestaurant row,
			String region,
			LocalDate startDate,
			LocalDate today
	) {
		if (row.managementNumber().isBlank() || row.storeName().isBlank() || !ACTIVE_STATUS.equals(row.statusCode())) {
			return null;
		}
		LocalDate licenseDate = parseDate(row.licenseDate());
		if (licenseDate == null || licenseDate.isBefore(startDate) || licenseDate.isAfter(today)) return null;
		String address = !row.roadAddress().isBlank() ? row.roadAddress() : row.lotNumberAddress();
		String normalizedRegion = normalizeForMatch(region);
		if (!normalizeForMatch(row.roadAddress()).contains(normalizedRegion)
				&& !normalizeForMatch(row.lotNumberAddress()).contains(normalizedRegion)) return null;

		Wgs84Coordinate coordinate = convertCoordinate(row.coordinateX(), row.coordinateY());
		return new RestaurantLicenseCandidate(
				row.managementNumber(),
				"license:" + row.managementNumber(),
				row.storeName(),
				licenseDate,
				row.statusCode(),
				row.statusName(),
				row.businessType(),
				address,
				row.roadAddress(),
				row.lotNumberAddress(),
				row.telephone(),
				coordinate == null ? null : coordinate.latitude(),
				coordinate == null ? null : coordinate.longitude(),
				coordinate == null ? "ADDRESS_REQUIRED" : "EPSG_5174"
		);
	}

	static Wgs84Coordinate convertCoordinate(String xValue, String yValue) {
		double x = parseCoordinate(xValue);
		double y = parseCoordinate(yValue);
		if (!Double.isFinite(x) || !Double.isFinite(y)
				|| x < 40_000 || x > 600_000 || y < -100_000 || y > 800_000) return null;
		try {
			ProjCoordinate result = new ProjCoordinate();
			synchronized (EPSG_5174_TO_WGS84) {
				EPSG_5174_TO_WGS84.transform(new ProjCoordinate(x, y), result);
			}
			if (!Double.isFinite(result.x) || !Double.isFinite(result.y)
					|| result.y < 32 || result.y > 40 || result.x < 123 || result.x > 133) return null;
			return new Wgs84Coordinate(result.y, result.x);
		} catch (RuntimeException exception) {
			return null;
		}
	}

	private static CoordinateTransform createTransform() {
		CRSFactory crsFactory = new CRSFactory();
		CoordinateReferenceSystem source = crsFactory.createFromName("EPSG:5174");
		CoordinateReferenceSystem target = crsFactory.createFromName("EPSG:4326");
		return new CoordinateTransformFactory().createTransform(source, target);
	}

	private static double parseCoordinate(String value) {
		if (value == null || value.isBlank()) return Double.NaN;
		try {
			return Double.parseDouble(value.replace(",", "").trim());
		} catch (NumberFormatException exception) {
			return Double.NaN;
		}
	}

	private static LocalDate parseDate(String value) {
		if (value == null || value.isBlank()) return null;
		String clean = value.trim();
		try {
			return clean.contains("-") ? LocalDate.parse(clean) : LocalDate.parse(clean, COMPACT_DATE);
		} catch (DateTimeParseException exception) {
			return null;
		}
	}

	private static String text(JsonNode item, String field) {
		JsonNode value = item.get(field);
		return value == null || value.isNull() ? "" : value.asText("").trim();
	}

	private static String safeCode(String value) {
		return value != null && value.matches("[A-Za-z0-9_-]{1,30}") ? value : "UNKNOWN";
	}

	private static String normalizeRegionQuery(String value) {
		String normalized = value == null ? "" : value.trim().replaceAll("\\s+", " ");
		if (!ALLOWED_REGION.matcher(normalized).matches()) {
			throw new IllegalArgumentException("지역 검색어가 올바르지 않습니다.");
		}
		return normalized;
	}

	private static String normalizeForMatch(String value) {
		return value == null ? "" : value.toLowerCase(Locale.KOREAN).replaceAll("[^\\p{L}\\p{N}]", "");
	}

	private static String decodeServiceKey(String value) {
		if (value == null) return "";
		String clean = value.trim();
		if (!clean.contains("%")) return clean;
		try {
			return URLDecoder.decode(clean, StandardCharsets.UTF_8);
		} catch (IllegalArgumentException exception) {
			return clean;
		}
	}

	private void validateConfiguration() {
		if (apiKey.isBlank()) throw new RestaurantLicenseApiException("신규 인허가 API 인증키가 설정되지 않았습니다.");
		if (baseUrl == null || !baseUrl.startsWith("https://apis.data.go.kr/")) {
			throw new RestaurantLicenseApiException("신규 인허가 API 주소 설정을 확인해 주세요.");
		}
	}

	private void putCache(String key, List<RestaurantLicenseCandidate> value) {
		Instant now = clock.instant();
		cache.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
		if (cache.size() >= MAX_CACHE_ENTRIES) {
			cache.entrySet().stream().min(Map.Entry.comparingByValue(
					Comparator.comparing(CacheEntry::expiresAt))).ifPresent(entry -> cache.remove(entry.getKey()));
		}
		cache.put(key, new CacheEntry(List.copyOf(value), now.plus(cacheTtl)));
	}

	record Wgs84Coordinate(double latitude, double longitude) {
	}

	private record CacheEntry(List<RestaurantLicenseCandidate> candidates, Instant expiresAt) {
	}

	private record RawPage(long totalCount, List<RawRestaurant> items) {
	}

	private record RawRestaurant(
			String managementNumber,
			String storeName,
			String licenseDate,
			String statusCode,
			String statusName,
			String businessType,
			String roadAddress,
			String lotNumberAddress,
			String telephone,
			String coordinateX,
			String coordinateY
	) {
	}
}
