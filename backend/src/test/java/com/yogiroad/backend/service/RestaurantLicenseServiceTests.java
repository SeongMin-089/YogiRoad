package com.yogiroad.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yogiroad.backend.dto.RestaurantLicenseCandidate;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class RestaurantLicenseServiceTests {

	private static final String ENDPOINT = "https://apis.data.go.kr/1741000/general_restaurants/info";
	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-12T03:00:00Z"), ZoneOffset.UTC);

	@Test
	void filtersExternalDateStatusAndRegionAndDeduplicatesManagementNumber() {
		RestClient.Builder builder = RestClient.builder();
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		server.expect(request -> {
			String query = request.getURI().getRawQuery();
			assertTrue(query.contains("cond%5BLCPMT_YMD::GTE%5D=2026-09-13"));
			assertTrue(query.contains("cond%5BSALS_STTS_CD::EQ%5D=01"));
			assertTrue(query.contains("cond%5BROAD_NM_ADDR::LIKE%5D="));
			assertTrue(!query.contains("LCPMT_YMD::LT"));
		}).andRespond(withSuccess(roadResponse(), MediaType.APPLICATION_JSON));
		server.expect(request -> assertTrue(
				request.getURI().getRawQuery().contains("cond%5BLOTNO_ADDR::LIKE%5D=")))
				.andRespond(withSuccess(lotResponse(), MediaType.APPLICATION_JSON));
		RestaurantLicenseService service = service(builder.build());

		List<RestaurantLicenseCandidate> candidates = service.findRecentCandidates("경기도 남양주시");

		assertEquals(List.of("NEW-2", "NEW-1"), candidates.stream()
				.map(RestaurantLicenseCandidate::managementNumber).toList());
		assertEquals("지번만 있는 식당", candidates.getFirst().storeName());
		assertEquals("경기도 남양주시 진접읍 2", candidates.getFirst().address());
		assertNotNull(candidates.getLast().latitude());
		assertNotNull(candidates.getLast().longitude());
		assertEquals("EPSG_5174", candidates.getLast().coordinateSource());

		// 같은 지역과 날짜의 두 번째 조회는 외부 API를 다시 호출하지 않는다.
		assertEquals(candidates, service.findRecentCandidates("경기도  남양주시"));
		server.verify();
	}

	@Test
	void epsg5174OriginConvertsToKoreaAndInvalidCoordinatesAreRejected() {
		RestaurantLicenseService.Wgs84Coordinate coordinate =
				RestaurantLicenseService.convertCoordinate("200000", "500000");

		assertNotNull(coordinate);
		assertTrue(coordinate.latitude() > 37.9 && coordinate.latitude() < 38.1);
		assertTrue(coordinate.longitude() > 126.9 && coordinate.longitude() < 127.1);
		assertNull(RestaurantLicenseService.convertCoordinate("", "500000"));
		assertNull(RestaurantLicenseService.convertCoordinate("1", "1"));
	}

	private RestaurantLicenseService service(RestClient restClient) {
		return new RestaurantLicenseService(
				restClient,
				new ObjectMapper(),
				"test-key",
				ENDPOINT,
				Duration.ofMinutes(15),
				CLOCK
		);
	}

	private String roadResponse() {
		return """
				{"response":{"header":{"resultCode":"00"},"body":{"totalCount":5,"items":{"item":[
				{"MNG_NO":"NEW-1","BPLC_NM":"새 식당","LCPMT_YMD":"2026-10-11","SALS_STTS_CD":"01","SALS_STTS_NM":"영업/정상","BZSTAT_SE_NM":"한식","ROAD_NM_ADDR":"경기도 남양주시 진접읍 1","LOTNO_ADDR":"","TELNO":"031-000-0000","CRD_INFO_X":"200000","CRD_INFO_Y":"500000"},
				{"MNG_NO":"TOO-OLD","BPLC_NM":"누수 데이터","LCPMT_YMD":"2026-09-12","SALS_STTS_CD":"01","ROAD_NM_ADDR":"경기도 남양주시"},
				{"MNG_NO":"FUTURE","BPLC_NM":"미래 데이터","LCPMT_YMD":"2026-10-13","SALS_STTS_CD":"01","ROAD_NM_ADDR":"경기도 남양주시"},
				{"MNG_NO":"CLOSED","BPLC_NM":"폐업 식당","LCPMT_YMD":"2026-10-10","SALS_STTS_CD":"03","ROAD_NM_ADDR":"경기도 남양주시"},
				{"MNG_NO":"WRONG-REGION","BPLC_NM":"타지역 식당","LCPMT_YMD":"2026-10-10","SALS_STTS_CD":"01","ROAD_NM_ADDR":"경기도 구리시"}
				]}}}}
				""";
	}

	private String lotResponse() {
		return """
				{"response":{"header":{"resultCode":"00"},"body":{"totalCount":2,"items":{"item":[
				{"MNG_NO":"NEW-1","BPLC_NM":"새 식당 중복","LCPMT_YMD":"2026-10-11","SALS_STTS_CD":"01","ROAD_NM_ADDR":"경기도 남양주시 진접읍 1"},
				{"MNG_NO":"NEW-2","BPLC_NM":"지번만 있는 식당","LCPMT_YMD":"2026-10-12","SALS_STTS_CD":"01","SALS_STTS_NM":"영업/정상","BZSTAT_SE_NM":"기타","ROAD_NM_ADDR":"","LOTNO_ADDR":"경기도 남양주시 진접읍 2","CRD_INFO_X":"","CRD_INFO_Y":""}
				]}}}}
				""";
	}
}
