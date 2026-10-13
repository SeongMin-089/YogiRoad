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

## 신규 음식점 자동 감지와 알림

서버는 기본적으로 시작 30초 후 첫 조회를 실행하고, 이전 실행이 끝난 시점부터 10분마다
담당 지역의 최근 30일 일반음식점 인허가 데이터를 확인합니다. 서버가 중지된 동안에는
조회가 실행되지 않으며, 재시작하면 Firestore에 저장된 기준 데이터부터 이어서 처리합니다.

주요 설정은 다음 환경 변수로 변경할 수 있습니다.

```dotenv
YOGIROAD_NOTIFICATIONS_POLL_INTERVAL_MS=600000
YOGIROAD_NOTIFICATIONS_INITIAL_DELAY_MS=30000
YOGIROAD_NOTIFICATIONS_MAX_REGIONS_PER_RUN=50
YOGIROAD_NOTIFICATIONS_LOCK_TTL=PT15M
```

한 지역 조회는 도로명주소와 지번주소 각각 최대 10페이지(페이지당 100건)를 사용하므로
일반적으로 지역당 2회, 최악의 경우 지역당 20회의 외부 API 호출이 발생합니다. 기본
지역 상한에서는 한 주기 최대 1,000회로 제한됩니다. 같은 시·도/시·군·구를 담당하는
사용자는 읍·면·동이 달라도 조회 결과를 공유합니다.

Firestore에는 다음 데이터가 추가됩니다.

- `restaurantDiscoverySnapshots/{regionHash}`: 지역별 초기화 여부와 마지막 정상 조회 메타데이터
- `restaurantDiscoverySnapshots/{regionHash}/seenLicenses/{managementNumberHash}`: 관리번호별 감지 이력
- `userNotifications/{userHash}`: 사용자별 읽지 않은 개수
- `userNotifications/{userHash}/items/{notificationHash}`: 사용자별 알림 항목
- `restaurantDiscoveryLocks/global`: 다중 서버 인스턴스 간 실행 임대 잠금

최초 정상·완전·비어 있지 않은 조회 결과는 기준 데이터로만 저장하며 알림을 만들지 않습니다.
이후 처음 등장한 `MNG_NO`만 알림 대상으로 처리합니다. 알림 문서 ID는 사용자 ID, 알림 유형,
관리번호로 결정되므로 재시도해도 중복되지 않습니다. 페이지 상한에 도달한 결과, 빈 결과,
API 오류는 기존 기준 데이터를 변경하지 않습니다. `salesTargets`, `salesActivities`,
`userProfiles` 컬렉션은 초기화하거나 삭제하지 않습니다.

JWT 인증이 필요한 알림 API는 다음과 같습니다.

- `GET /api/notifications?page=0&size=20`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/{id}/read`
- `PATCH /api/notifications/read-all`
