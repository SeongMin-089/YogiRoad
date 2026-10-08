package com.yogiroad.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.cloud.FirestoreClient;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FirebaseConfig {

	@Bean
	public FirebaseApp firebaseApp() throws IOException {
		synchronized (FirebaseConfig.class) {
			if (FirebaseApp.getApps().isEmpty()) {
				FirebaseOptions options = FirebaseOptions.builder()
						.setCredentials(GoogleCredentials.getApplicationDefault())
						.build();
				return FirebaseApp.initializeApp(options);
			}

			return FirebaseApp.getInstance();
		}
	}

	@Bean
	public Firestore firestore(FirebaseApp firebaseApp) {
		return FirestoreClient.getFirestore(firebaseApp);
	}

	@Bean
	public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
		return FirebaseAuth.getInstance(firebaseApp);
	}
}
