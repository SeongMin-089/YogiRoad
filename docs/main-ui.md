# 메인 앱 UI

`fullstack` 브랜치에서 로그인 이후의 영업 지원 화면을 구현했습니다.
기존 인증 화면의 색상, 24px 화면 여백, 12~14px 모서리와 얇은 테두리를 유지합니다.

## 추가 파일

- `src/navigation/RootNavigator.tsx`, `MainNavigator.tsx`: Auth/Main 전환과 5개 하단 탭.
- `src/screens/HomeScreen.tsx`: 실제 영업 대상 현황과 미방문 대상, 미구현 기능의 준비 상태.
- `src/screens/MapScreen.tsx`: 카카오 지도, 공공데이터 음식점, 검색·상태 필터와 영업 대상 등록.
- `src/screens/SalesScreen.tsx`: 서버 영업 대상의 검색·상태 필터·상세 정보.
- `src/screens/DashboardScreen.tsx`: 서버 영업 대상의 상태별 통계와 계약 완료 목록.
- `src/screens/MyPageScreen.tsx`: 사용자 기능 준비 상태, 펼침 메뉴와 로그아웃.
- `src/components/`: MainScreenLayout, SectionHeader, StatCard, StatusBadge, StoreCard,
  SearchField, FilterChips, MapPlaceholder, StoreDetailsModal 공통 컴포넌트.
- `src/services/salesTargetApi.ts`: Spring Boot 영업 대상 API 클라이언트.
- `src/hooks/useSalesTargets.ts`: 탭 포커스 시 최신 영업 대상을 조회하는 공통 훅.
- `src/types/sales.ts`: 화면에서 사용하는 영업 상태 및 매장 타입.

## 수정 파일

- `App.tsx`: RootNavigator 연결.
- `src/screens/LoginScreen.tsx`: 로그인 버튼으로 Main 진입. 인증 입력 검증은 하지 않습니다.
- `src/types/navigation.ts`: 중첩 내비게이션 타입.
- `package.json`, `package-lock.json`: bottom-tabs, Expo 아이콘, 웹 미리보기 런타임 추가.

StartScreen, SignUpScreen, AuthScreenLayout, FormInput, PrimaryButton, AppLogo,
colors.ts 및 TypeScript strict 설정은 변경하지 않았습니다.

## 실행 및 연결 지점

```sh
npm install
npm run start
# 웹 미리보기
npm run web
```

시작 → 로그인 → 로그인 버튼 → 홈. 빈 입력으로도 진입할 수 있습니다.
로그아웃은 Auth의 시작 화면으로 돌아갑니다. 두 전환 모두 replace로 이전 화면을 제거합니다.
실제 인증 도입 시 RootNavigator의 Auth/Main 등록을 세션 상태에 따라 조건부로 바꾸면 됩니다.
지도와 영업 대상 기능을 사용하려면 Expo와 Spring Boot 서버를 함께 실행해야 합니다.
영업 대상 화면과 통계는 Firestore에 저장된 `salesTargets` 응답만 사용합니다.
방문 일정, 상담 기록, 사용자 프로필, 알림은 백엔드 데이터가 추가될 때까지 준비 상태로 표시합니다.

## 검증 결과

- `npx.cmd tsc --noEmit`: 통과.
- `git diff --check`: 통과.
- `npx.cmd expo export --platform web`: Web 번들 생성 통과.
- 목업 모듈 및 이전 예시 심볼 프로젝트 전체 검색 결과 없음.
- SafeAreaProvider와 화면의 top/left/right inset을 사용하며 하단 inset은 탭이 처리합니다.
  실제 Android/iOS 기기의 노치·키보드·시스템 뒤로가기 동작은 별도 기기 확인이 필요합니다.

검증에 참고한 문서: https://docs.expo.dev/versions/v57.0.0/
