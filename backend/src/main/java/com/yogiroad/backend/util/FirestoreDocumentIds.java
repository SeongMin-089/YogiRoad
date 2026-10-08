package com.yogiroad.backend.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public final class FirestoreDocumentIds {

	private FirestoreDocumentIds() {
	}

	public static String salesTarget(String userId, String storeId) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] value = digest.digest((userId + "\u0000" + storeId).getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(value);
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
		}
	}
}
