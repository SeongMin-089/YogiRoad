package com.yogiroad.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yogiroad.backend.dto.PublicStoreCandidate;
import com.yogiroad.backend.exception.PublicStoreApiException;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class PublicStoreService {

	private static final int MAX_CACHE_ENTRIES = 200;
	private static final int MAX_RADIUS_METRES = 2_000;
	private static final int MAX_PAGE_SIZE = 100;
	private static final String RESTAURANT_CATEGORY_CODE = "I2";

	private final RestClient restClient;
	private final ObjectMapper objectMapper;
	private final String apiKey;
	private final String baseUrl;
	private final Duration cacheTtl;
	private final Clock clock;
	private final Map<SearchKey, CacheEntry> cache = new ConcurrentHashMap<>();

	@Autowired
	public PublicStoreService(
			RestClient.Builder restClientBuilder,
			@Value("${public-store.api-key:}") String apiKey,
			@Value("${public-store.base-url}") String baseUrl,
			@Value("${public-store.cache-ttl:PT2M}") Duration cacheTtl
	) {
		this(buildRestClient(restClientBuilder), new ObjectMapper(), apiKey, baseUrl, cacheTtl, Clock.systemUTC());
	}

	private static RestClient buildRestClient(RestClient.Builder builder) {
		HttpClient httpClient = HttpClient.newBuilder()
				.connectTimeout(Duration.ofSeconds(5))
				.build();
		JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
		requestFactory.setReadTimeout(Duration.ofSeconds(20));
		return builder.requestFactory(requestFactory).build();
	}

	PublicStoreService(
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

	public List<PublicStoreCandidate> findRestaurants(
			double latitude,
			double longitude,
			int radius,
			int pageNo,
			int numOfRows
	) {
		validateSearch(latitude, longitude, radius, pageNo, numOfRows);
		validateConfiguration();
		SearchKey key = new SearchKey(
				Math.round(latitude * 1_000_000),
				Math.round(longitude * 1_000_000),
				radius,
				pageNo,
				numOfRows
		);
		Instant now = clock.instant();
		CacheEntry cached = cache.get(key);
		if (cached != null && cached.expiresAt().isAfter(now)) return cached.stores();

		List<PublicStoreCandidate> stores = fetch(latitude, longitude, radius, pageNo, numOfRows);
		putCache(key, stores, now);
		return stores;
	}

	private List<PublicStoreCandidate> fetch(
			double latitude,
			double longitude,
			int radius,
			int pageNo,
			int numOfRows
	) {
		URI uri = UriComponentsBuilder.fromUriString(baseUrl)
				.queryParam("serviceKey", apiKey)
				.queryParam("cx", longitude)
				.queryParam("cy", latitude)
				.queryParam("radius", radius)
				.queryParam("indsLclsCd", RESTAURANT_CATEGORY_CODE)
				.queryParam("numOfRows", numOfRows)
				.queryParam("pageNo", pageNo)
				.queryParam("type", "json")
				.encode(StandardCharsets.UTF_8)
				.build()
				.toUri();

		String responseBody;
		try {
			responseBody = restClient.get().uri(uri).retrieve().body(String.class);
		} catch (RestClientResponseException exception) {
			throw new PublicStoreApiException(
					"주변 음식점 정보를 불러오지 못했습니다. (HTTP " + exception.getStatusCode().value() + ")");
		} catch (RestClientException exception) {
			throw new PublicStoreApiException("주변 음식점 정보 제공기관에 연결할 수 없습니다.", exception);
		}
		if (responseBody == null || responseBody.isBlank()) {
			throw new PublicStoreApiException("주변 음식점 정보 응답이 비어 있습니다.");
		}
		return parse(responseBody);
	}

	private List<PublicStoreCandidate> parse(String responseBody) {
		try {
			JsonNode parsed = objectMapper.readTree(responseBody);
			JsonNode root = parsed.path("response").isObject() ? parsed.path("response") : parsed;
			JsonNode header = root.path("header");
			if (!header.isObject()) throw new PublicStoreApiException("주변 음식점 정보 응답 형식이 올바르지 않습니다.");
			String resultCode = header.path("resultCode").asText("");
			if (!resultCode.equals("00") && !resultCode.equals("0")) {
				throw new PublicStoreApiException(
						"주변 음식점 정보 제공기관이 오류를 반환했습니다. (code=" + safeCode(resultCode) + ")");
			}

			JsonNode items = root.path("body").path("items");
			JsonNode rows = items.isArray() ? items : items.path("item");
			if (rows.isMissingNode() || rows.isNull() || rows.asText("").isBlank() && !rows.isContainerNode()) {
				return List.of();
			}
			List<JsonNode> rawRows = new ArrayList<>();
			if (rows.isArray()) rows.forEach(rawRows::add);
			else if (rows.isObject()) rawRows.add(rows);
			else throw new PublicStoreApiException("주변 음식점 목록 응답 형식이 올바르지 않습니다.");

			Map<String, PublicStoreCandidate> deduplicated = new LinkedHashMap<>();
			int anonymousIndex = 0;
			for (JsonNode row : rawRows) {
				PublicStoreCandidate store = readStore(row);
				String key = store.bizesId().isBlank() ? "anonymous:" + anonymousIndex++ : store.bizesId();
				deduplicated.putIfAbsent(key, store);
			}
			return List.copyOf(deduplicated.values());
		} catch (JsonProcessingException exception) {
			throw new PublicStoreApiException("주변 음식점 정보 응답을 읽을 수 없습니다.", exception);
		}
	}

	private PublicStoreCandidate readStore(JsonNode row) {
		return new PublicStoreCandidate(
				text(row, "bizesId"), text(row, "bizesNm"), text(row, "brchNm"),
				text(row, "bldNm"), text(row, "flrNo"), text(row, "indsLclsCd"),
				text(row, "indsLclsNm"), text(row, "indsMclsCd"), text(row, "indsMclsNm"),
				text(row, "indsSclsCd"), text(row, "indsSclsNm"), text(row, "ctprvnNm"),
				text(row, "signguNm"), text(row, "adongNm"), text(row, "lnoAdr"),
				text(row, "rdnmAdr"), number(row, "lon"), number(row, "lat")
		);
	}

	private static String text(JsonNode row, String field) {
		JsonNode value = row.get(field);
		return value == null || value.isNull() ? "" : value.asText("").trim();
	}

	private static Double number(JsonNode row, String field) {
		JsonNode value = row.get(field);
		if (value == null || value.isNull()) return null;
		try {
			double number = value.isNumber() ? value.asDouble() : Double.parseDouble(value.asText().trim());
			return Double.isFinite(number) ? number : null;
		} catch (NumberFormatException exception) {
			return null;
		}
	}

	private static void validateSearch(
			double latitude,
			double longitude,
			int radius,
			int pageNo,
			int numOfRows
	) {
		if (!Double.isFinite(latitude) || Math.abs(latitude) > 90
				|| !Double.isFinite(longitude) || Math.abs(longitude) > 180) {
			throw new IllegalArgumentException("검색 중심 좌표가 올바르지 않습니다.");
		}
		if (radius < 1 || radius > MAX_RADIUS_METRES) {
			throw new IllegalArgumentException("검색 반경은 1m 이상 2km 이하여야 합니다.");
		}
		if (pageNo < 1 || numOfRows < 1 || numOfRows > MAX_PAGE_SIZE) {
			throw new IllegalArgumentException("페이지 조회 조건이 올바르지 않습니다.");
		}
	}

	private void validateConfiguration() {
		if (apiKey.isBlank()) throw new PublicStoreApiException("주변 음식점 API 인증키가 설정되지 않았습니다.");
		if (baseUrl == null || !baseUrl.startsWith("https://apis.data.go.kr/")) {
			throw new PublicStoreApiException("주변 음식점 API 주소 설정을 확인해 주세요.");
		}
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

	private static String safeCode(String value) {
		return value != null && value.matches("[A-Za-z0-9_-]{1,30}") ? value : "UNKNOWN";
	}

	private void putCache(SearchKey key, List<PublicStoreCandidate> stores, Instant now) {
		cache.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
		if (cache.size() >= MAX_CACHE_ENTRIES) {
			cache.entrySet().stream()
					.min(Map.Entry.comparingByValue((left, right) -> left.expiresAt().compareTo(right.expiresAt())))
					.ifPresent(entry -> cache.remove(entry.getKey()));
		}
		cache.put(key, new CacheEntry(List.copyOf(stores), now.plus(cacheTtl)));
	}

	private record SearchKey(long latitude, long longitude, int radius, int pageNo, int numOfRows) {
	}

	private record CacheEntry(List<PublicStoreCandidate> stores, Instant expiresAt) {
	}
}
