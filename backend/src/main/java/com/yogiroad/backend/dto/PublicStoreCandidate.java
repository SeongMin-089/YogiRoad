package com.yogiroad.backend.dto;

public record PublicStoreCandidate(
		String bizesId,
		String bizesNm,
		String brchNm,
		String bldNm,
		String flrNo,
		String indsLclsCd,
		String indsLclsNm,
		String indsMclsCd,
		String indsMclsNm,
		String indsSclsCd,
		String indsSclsNm,
		String ctprvnNm,
		String signguNm,
		String adongNm,
		String lnoAdr,
		String rdnmAdr,
		Double lon,
		Double lat
) {
}
