# 카카오 로그인 운영 가이드

YogiRoad는 카카오 REST OAuth 로그인 후 백엔드가 자체 HMAC JWT를 발급합니다. Expo 앱에는 카카오 액세스 토큰이나 Firebase 인증 정보가 저장되지 않습니다. Firebase Admin SDK는 Firestore 접근에만 사용합니다.

## 로그인 흐름

1. 앱이 `POST /api/auth/kakao/session`을 호출해 `loginId`와 `loginUrl`을 받습니다.
2. Expo WebBrowser가 백엔드의 `loginUrl`을 엽니다.
3. 백엔드가 무작위 `state`를 붙여 카카오 인가 페이지로 리다이렉트합니다.
4. 카카오 콜백에서 백엔드가 code를 토큰으로 교환하고 `/v2/user/me`를 조회합니다.
5. 백엔드는 `kakao:<카카오 숫자 ID>`를 YogiRoad `userId`로 사용해 7일 JWT를 발급합니다.
6. 앱이 로그인 세션을 폴링해 JWT를 한 번만 받고 AsyncStorage에 저장합니다.
7. 이후 보호 API에는 `Authorization: Bearer <JWT>`가 자동으로 포함됩니다.

로그인 세션은 5분 후 만료됩니다. OAuth `state`는 세션마다 새로 생성되고 콜백에서 일치 여부를 검증합니다. 성공 토큰 또는 실패 상태는 앱이 한 번 읽은 뒤 메모리에서 제거되며, 서버를 재시작하면 진행 중인 로그인 세션도 사라집니다.

## 카카오 개발자 콘솔

1. [Kakao Developers](https://developers.kakao.com/)에서 애플리케이션을 만들고 **앱 키 > REST API 키**를 확인합니다.
2. **제품 설정 > 카카오 로그인**을 활성화합니다.
3. **Redirect URI**에 백엔드 콜백 전체 주소를 정확히 등록합니다.
   - 로컬 네트워크 예: `http://192.168.0.10:8080/api/auth/kakao/callback`
   - 운영 예: `https://api.example.com/api/auth/kakao/callback`
4. 닉네임과 프로필 이미지 동의 항목을 설정합니다. 사용자가 제공하지 않으면 기본 닉네임/이미지 없이 동작합니다.
5. Client Secret을 활성화했다면 백엔드에도 같은 값을 설정합니다. 활성화하지 않았다면 빈 값으로 둡니다.

`KAKAO_REDIRECT_URI`는 콘솔에 등록한 Redirect URI 및 실제 콜백 주소와 문자 단위로 같아야 합니다. iPhone의 브라우저에서 `localhost`는 Windows PC가 아니므로, Expo Go 실기기 테스트에는 같은 Wi-Fi에서 접근 가능한 PC의 LAN IP를 사용하고 Windows 방화벽에서 8080 포트 접근을 허용해야 합니다.

## 환경변수

백엔드 PowerShell 예시:

```powershell
$env:KAKAO_REST_API_KEY = "카카오 REST API 키"
$env:KAKAO_CLIENT_SECRET = "활성화한 경우의 Client Secret"
$env:KAKAO_REDIRECT_URI = "http://192.168.0.10:8080/api/auth/kakao/callback"
$env:YOGIROAD_JWT_SECRET = "최소-32바이트-이상의-충분히-무작위인-비밀값"
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secure\yogiroad-firebase-adminsdk.json"
```

프런트 `.env` 예시:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:8080
EXPO_PUBLIC_KAKAO_JS_KEY=기존_지도용_JavaScript_키
EXPO_PUBLIC_PUBLIC_DATA_KEY=공공데이터_API_키
```

`EXPO_PUBLIC_KAKAO_JS_KEY`는 기존 카카오 지도 WebView용이며 로그인에는 사용하지 않습니다. 프런트 Firebase/Google 인증 환경변수와 `GoogleService-Info.plist`, `google-services.json`은 필요 없습니다.

## 실행과 확인

```powershell
cd backend
./gradlew.bat test
./gradlew.bat bootRun
```

별도 터미널에서:

```powershell
npm install
npx expo start --clear
```

Expo Go에서 QR을 열고 카카오 로그인 버튼을 누릅니다. 로그인 완료 페이지가 보이면 앱으로 돌아오거나 브라우저를 닫습니다. 앱은 완료 상태를 폴링해 자동으로 메인 화면을 표시합니다. Apple Developer Program, EAS Development Build, 네이티브 Google 설정은 필요하지 않습니다.

## API 보호 범위와 제한

- 인증 없이 접근 가능: `/api/health`, `/api/auth/kakao/**`
- JWT 필요: `/api/auth/me`, `/api/sales-targets/**`, `/api/sales-activities/**`
- JWT 만료는 7일이며 refresh token은 구현하지 않았습니다. 만료 또는 401 응답 시 앱은 저장 토큰을 지우고 로그인 화면으로 전환합니다.
- 로그인 세션 저장소는 단일 서버 메모리 기반입니다. 다중 인스턴스 운영 전에는 Redis 같은 공유 저장소로 교체해야 합니다.
- 새 사용자 ID는 `kakao:<id>`이므로 기존 Firebase UID로 작성된 판매 데이터가 자동 이전되지는 않습니다. 기존 데이터 이관이 필요하면 UID-카카오 ID 매핑을 별도 승인 절차로 마련해야 합니다.
