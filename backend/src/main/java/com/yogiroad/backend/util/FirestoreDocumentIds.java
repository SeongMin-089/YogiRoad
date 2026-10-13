package com.yogiroad.backend.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public final class FirestoreDocumentIds {

	private FirestoreDocumentIds() {
	}

	public static String salesTarget(String userId, String storeId) {
		return sha256(userId + "\u0000" + storeId);
	}

	public static String userProfile(String userId) {
		return sha256(userId);
	}

	private static String sha256(String value) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(bytes);
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
		}
	}
}
