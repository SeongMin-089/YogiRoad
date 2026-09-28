# 메인 앱 UI

`mapTest` 브랜치에서 로그인 이후의 영업 지원 화면을 구현했습니다.
기존 인증 화면의 색상, 24px 화면 여백, 12~14px 모서리와 얇은 테두리를 유지합니다.

## 추가 파일

- `src/navigation/RootNavigator.tsx`, `MainNavigator.tsx`: Auth/Main 전환과 5개 하단 탭.
- `src/screens/HomeScreen.tsx`: 현황, 방문 일정, 영업 후보, 최근 활동.
- `src/screens/MapScreen.tsx`: 매장/지역 검색, 상태 필터, 지도 placeholder, 매장 미리보기.
- `src/screens/SalesScreen.tsx`: 검색·필터·결과 수가 연동되는 예시 매장 목록.
- `src/screens/DashboardScreen.tsx`: 주/월 예시 통계, 상태별 막대, 최근 계약.
- `src/screens/MyPageScreen.tsx`: 프로필, 펼침 메뉴, 알림 UI 미리보기, 로그아웃.
- `src/components/`: MainScreenLayout, SectionHeader, StatCard, StatusBadge, StoreCard,
  SearchField, FilterChips, MapPlaceholder, StoreDetailsModal 공통 컴포넌트.
- `src/data/mockData.ts`, `src/types/sales.ts`: API와 분리된 예시 데이터 및 도메인 타입.

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
지도 공급자 도입 시 MapPlaceholder를 교체하고 검색/선택 결과를 연결하면 됩니다.
현재 GPS, 지도·인증 API, 외부 매장 데이터, DB 및 실제 통계 계산은 없습니다.
알림 스위치는 화면 상태만 바꾸며 저장·전송되지 않습니다.
홈·통계·활동 데이터는 독립된 UI 예시이며 실제 업무 기록으로 해석하면 안 됩니다.

## 검증 결과

- `npx tsc --noEmit`: 통과.
- `git diff --check`: 통과.
- `npx expo export --platform all --output-dir dist`: Android/iOS Hermes 및 Web 번들 생성 통과.
- 320 × 640 웹 미리보기: 시작/로그인/회원가입 이동, 로그인→홈, 모든 탭,
  지도 지역 검색+상태 필터 및 빈 결과, 영업관리 필터, 매장 상세 열기/닫기,
  주/월 통계 전환, 마이 알림 메뉴 펼침, 로그아웃 및 재로그인 확인.
- 홈 스크롤과 고정 탭, 각 화면의 좁은 폭 카드/텍스트 배치를 시각적으로 확인.
- 브라우저에서 수집된 런타임 error 로그 없음.
- SafeAreaProvider와 화면의 top/left/right inset을 사용하며 하단 inset은 탭이 처리합니다.
  실제 Android/iOS 기기의 노치·키보드·시스템 뒤로가기 동작은 별도 기기 확인이 필요합니다.
- `expo install --check`는 기존 Expo 57.0.24에 대해 최신 패치 57.0.25를 권장합니다.
  기존 Expo 버전은 유지했으며 이번에 추가한 패키지의 호환성 경고는 없습니다.

검증에 참고한 문서: https://docs.expo.dev/versions/v57.0.0/
