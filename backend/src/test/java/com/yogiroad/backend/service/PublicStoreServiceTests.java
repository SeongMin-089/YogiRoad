package com.yogiroad.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yogiroad.backend.dto.PublicStoreCandidate;
import com.yogiroad.backend.exception.PublicStoreApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class PublicStoreServiceTests {

	private static final String ENDPOINT =
			"https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius";
	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-12T03:00:00Z"), ZoneOffset.UTC);

	@Test
	void requestsRestaurantRadiusDataAndNormalizesAndCachesResponse() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(request -> {
			String query = request.getURI().getRawQuery();
			assertTrue(query.contains("cx=127.2121189"));
			assertTrue(query.contains("cy=37.7336614"));
			assertTrue(query.contains("radius=1000"));
			assertTrue(query.contains("indsLclsCd=I2"));
			assertTrue(query.contains("numOfRows=100"));
			assertTrue(query.contains("pageNo=1"));
		}).andRespond(withSuccess(response(), MediaType.APPLICATION_JSON));
		PublicStoreService service = service(builder.build());

		List<PublicStoreCandidate> stores = service.findRestaurants(37.7336614, 127.2121189, 1000, 1, 100);

		assertEquals(2, stores.size());
		assertEquals("STORE-1", stores.getFirst().bizesId());
		assertEquals("첫 식당", stores.getFirst().bizesNm());
		assertEquals(37.733, stores.getFirst().lat());
		assertEquals(127.212, stores.getFirst().lon());
		assertNull(stores.getLast().lat());
		assertEquals(stores, service.findRestaurants(37.7336614, 127.2121189, 1000, 1, 100));
		server.verify();
	}

	@Test
	void rejectsUnsupportedSearchRangeBeforeCallingProvider() {
		PublicStoreService service = service(RestClient.create());

		assertThrows(IllegalArgumentException.class,
				() -> service.findRestaurants(37.7, 127.2, 2001, 1, 100));
		assertThrows(IllegalArgumentException.class,
				() -> service.findRestaurants(91, 127.2, 1000, 1, 100));
	}

	@Test
	void reportsMissingApiKeyBeforeCallingProvider() {
		PublicStoreService service = new PublicStoreService(
				RestClient.create(),
				new ObjectMapper(),
				"",
				ENDPOINT,
				Duration.ofMinutes(2),
				CLOCK
		);

		PublicStoreApiException exception = assertThrows(PublicStoreApiException.class,
				() -> service.findRestaurants(37.7, 127.2, 1000, 1, 100));

		assertEquals("주변 음식점 API 인증키가 설정되지 않았습니다.", exception.getMessage());
	}

	@Test
	void alsoAcceptsLegacyNestedItemContainer() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(request -> {
		}).andRespond(withSuccess("""
				{"response":{"header":{"resultCode":"00"},"body":{"items":{"item":
				{"bizesId":"STORE-3","bizesNm":"중첩 응답 식당","lon":"127.21","lat":"37.73"}
				}}}}
				""", MediaType.APPLICATION_JSON));
		PublicStoreService service = service(builder.build());

		List<PublicStoreCandidate> stores = service.findRestaurants(37.73, 127.21, 1000, 1, 100);

		assertEquals(1, stores.size());
		assertEquals("STORE-3", stores.getFirst().bizesId());
		server.verify();
	}

	private PublicStoreService service(RestClient restClient) {
		return new PublicStoreService(
				restClient,
				new ObjectMapper(),
				"test-key",
				ENDPOINT,
				Duration.ofMinutes(2),
				CLOCK
		);
	}

	private String response() {
		return """
				{"response":{"header":{"resultCode":"00"},"body":{"items":[
				{"bizesId":"STORE-1","bizesNm":"첫 식당","indsLclsCd":"I2","indsMclsNm":"한식","rdnmAdr":"경기도 남양주시 1","lon":"127.212","lat":"37.733"},
				{"bizesId":"STORE-1","bizesNm":"중복 식당","lon":"127.213","lat":"37.734"},
				{"bizesId":"STORE-2","bizesNm":"좌표 없는 식당","lnoAdr":"경기도 남양주시 2","lon":"invalid","lat":""}
				]}}}
				""";
	}
}
