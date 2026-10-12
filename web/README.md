# YogiRoad Web

React + Vite + TypeScript + SCSS로 구성한 YogiRoad 웹 마이그레이션 프로젝트입니다.
기존 Expo 앱과 Spring Boot 백엔드는 변경하지 않습니다.

## 실행

```bash
cd web
copy .env.example .env
npm install
npm run dev
```

Spring Boot를 `http://localhost:8080`에서 실행하면 Vite 개발 서버가 `/api` 요청을 프록시합니다.

## 검증

```bash
npm run typecheck
npm run build
```

## 현재 범위

- 반응형 공통 레이아웃과 라우팅
- 기존 JWT Bearer 인증을 사용하는 API 클라이언트
- 기존 카카오 로그인 세션 생성/폴링 흐름
- 기존 백엔드 DTO에 대응하는 TypeScript 계약
- Kakao Maps JavaScript SDK 기반 지도 화면
- 지역 검색, 지도 이동 후 재조회, 일반·신규 인허가 후보 마커와 상세 카드
- 기존 영업 대상 등록 API 연결
- 영업관리와 대시보드 페이지 진입점

일반 음식점 조회는 브라우저에 공공데이터 키를 노출하지 않도록 Spring Boot의
`/api/sales-targets/public-stores` 프록시를 사용합니다. 백엔드 `backend/.env`에
`PUBLIC_STORE_API_KEY`가 필요합니다. `VITE_PUBLIC_DATA_KEY`는 사용하지 않으며, 기존
루트 `.env`에만 Expo 키가 있는 개발 환경에서는 `run-backend.ps1`이 해당 값을
백엔드 프로세스로 승계합니다. 영업관리/대시보드 데이터 UI 연결은 후속 단계 범위입니다.
