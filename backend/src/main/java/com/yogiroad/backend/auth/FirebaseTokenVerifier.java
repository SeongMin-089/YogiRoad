package com.yogiroad.backend.auth;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import org.springframework.stereotype.Component;

@Component
public class FirebaseTokenVerifier {

	private final FirebaseAuth firebaseAuth;

	public FirebaseTokenVerifier(FirebaseAuth firebaseAuth) {
		this.firebaseAuth = firebaseAuth;
	}

	public String verify(String idToken) throws FirebaseAuthException {
		return firebaseAuth.verifyIdToken(idToken).getUid();
	}
}
