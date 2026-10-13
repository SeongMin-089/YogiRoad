# YogiRoad Backend

Java 21, Spring Boot, Gradle, Firebase Admin SDK(Firestore 전용), 카카오 REST 로그인과 자체 JWT를 사용하는 YogiRoad 백엔드입니다.

## Firebase 자격 증명

Firebase Console에서 서비스 계정 JSON을 발급한 뒤 파일 경로를
`GOOGLE_APPLICATION_CREDENTIALS` 환경 변수로 설정합니다. 자격 증명 JSON은 저장소에
커밋하지 않습니다.

PowerShell 현재 세션 설정 예시:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secure\yogiroad-firebase-adminsdk.json"
```

## 실행

```powershell
cd backend
./gradlew.bat bootRun
```

서버가 실행되면 `GET http://localhost:8080/api/health`로 상태를 확인할 수 있습니다.

카카오 로그인/JWT 환경변수와 Expo Go 실기기 설정은 [`../docs/kakao-login.md`](../docs/kakao-login.md)를 참고하세요.

웹 지도에서 사용하는 소상공인 상가정보 API 키는 `backend/.env`의
`PUBLIC_STORE_API_KEY`에 설정합니다. 서버가 공공데이터 API를 대신 호출하므로 이 키는
Vite의 `VITE_` 환경변수나 브라우저 번들에 포함하지 않습니다.

기존 Expo 프로젝트의 루트 `.env`에만 `EXPO_PUBLIC_PUBLIC_DATA_KEY`가 설정되어 있다면
`run-backend.ps1`이 이전 호환을 위해 해당 값을 현재 백엔드 프로세스의
`PUBLIC_STORE_API_KEY`로 승계합니다. 배포 환경에서는 `PUBLIC_STORE_API_KEY`를 직접
설정해야 합니다.
