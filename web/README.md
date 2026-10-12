# YogiRoad Web

React + Vite + TypeScript + SCSS로 구성한 YogiRoad 웹 마이그레이션 1단계 프로젝트입니다.
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
- 지도, 영업관리, 대시보드 페이지 진입점

지도 렌더링과 영업관리/대시보드 데이터 UI 연결은 후속 단계 범위입니다. 해당 페이지에는 실제 데이터 대신 명시적인 준비 상태만 표시합니다.
