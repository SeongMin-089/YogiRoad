package com.yogiroad.backend.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.yogiroad.backend.dto.RestaurantLicenseCandidate;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class RestaurantDiscoveryServiceTests {

	@Test
	void matchesExactAdministrativeTokensAndProvinceAliases() {
		RestaurantDiscoveryService.ManagedRegion region =
				new RestaurantDiscoveryService.ManagedRegion("강원특별자치도", "춘천시", "퇴계동");

		assertTrue(RestaurantDiscoveryService.matchesManagedRegion(
				region, candidate("강원도 춘천시 퇴계동 100", "")));
		assertFalse(RestaurantDiscoveryService.matchesManagedRegion(
				region, candidate("강원도 춘천시 석사동 100", "")));
	}

	@Test
	void usesLotNumberAddressFallbackAndRejectsPartialMunicipalityNames() {
		RestaurantDiscoveryService.ManagedRegion region =
				new RestaurantDiscoveryService.ManagedRegion("경기도", "남양주시", null);

		assertTrue(RestaurantDiscoveryService.matchesManagedRegion(
				region, candidate("", "경기도 남양주시 진접읍 금곡리 1")));
		assertFalse(RestaurantDiscoveryService.matchesManagedRegion(
				region, candidate("경기도 남양주시청앞로 1", "")));
		assertFalse(RestaurantDiscoveryService.matchesManagedRegion(
				region, candidate("경기도 구리시 남양주시로 1", "")));
	}

	@Test
	void supportsMultiTokenDistrictWithoutContainsMatching() {
		RestaurantDiscoveryService.ManagedRegion region =
				new RestaurantDiscoveryService.ManagedRegion("경기도", "수원시 팔달구", null);

		assertTrue(RestaurantDiscoveryService.matchesManagedRegion(
				region, candidate("경기도 수원시 팔달구 인계동 1", "")));
		assertFalse(RestaurantDiscoveryService.matchesManagedRegion(
				region, candidate("경기도 수원시 영통구 팔달로 1", "")));
	}

	private RestaurantLicenseCandidate candidate(String roadAddress, String lotNumberAddress) {
		return new RestaurantLicenseCandidate(
				"MNG-1", "license:MNG-1", "테스트 식당", LocalDate.of(2026, 10, 13),
				"01", "영업/정상", "한식", roadAddress.isBlank() ? lotNumberAddress : roadAddress,
				roadAddress, lotNumberAddress, "", null, null, "ADDRESS_REQUIRED"
		);
	}
}
