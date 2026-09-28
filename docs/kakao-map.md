# 카카오 지도 실행

1. 프로젝트 루트 `.env`에 `EXPO_PUBLIC_KAKAO_JS_KEY=본인의_JavaScript_키`를 설정합니다.
2. Kakao Developers의 해당 JavaScript 키에 SDK 도메인 `https://localhost`를 등록합니다.
   WebView의 인라인 HTML에 지정한 `baseUrl`이며 별도의 localhost 서버는 필요하지 않습니다.
   해당 앱의 카카오맵 사용 설정도 활성화되어 있어야 합니다.
3. `npx expo start --clear` 실행 후 iPhone Expo Go로 QR 코드를 열고 지도 탭에 진입합니다.

설치한 패키지는 없습니다. 기존 `react-native-webview`를 사용합니다.
MapScreen의 import와 지도 컴포넌트 한 곳만 교체했습니다.
검색·필터·예시 카드는 지도와 연결되지 않은 기존 mock UI입니다.

기본 중심은 진접읍 경복대로 424의 공개 주소 좌표
`37.7336614, 127.2121189`이며 경복대학교 남양주캠퍼스 인근입니다.
지도 level은 4입니다. GPS 또는 위치 권한을 사용하지 않습니다.

- 좌표 출처: https://findby.co.kr/details/12051-413603197003-st-652bb41f8c641f9e38b0a65d
- 캠퍼스 주소 확인: https://kbu.ac.kr/kor/CMS/Contents/Contents.do?mCode=MN067
- SDK 및 도메인 등록: https://apis.map.kakao.com/web/guide/
- 비동기 로딩: https://apis.map.kakao.com/web/documentation/#load

키 누락·잘못된 좌표는 설정 안내로 표시합니다. 로딩 중에는 표시기를 보이고,
초기 지도 타일의 `tilesloaded` 이벤트에서 `MAP_READY`를 전송합니다.
SDK/리소스/HTTP/WebView 실패와 20초 시간 초과는 지도 영역 안의 오류 안내로 처리합니다.
콘솔에는 고정 오류 코드 또는 HTTP 상태 번호만 남기며 키/URL/HTML은 출력하지 않습니다.
`.env`는 기존 `.gitignore`에서 제외되어 있고 Git 추적 대상이 아님을 확인했습니다.

TypeScript 검사를 실행했습니다. 실제 카카오 인증·지도 표시·드래그·핀치 확대/축소와
지도 터치 후 다른 탭 전환은 사용자가 iPhone Expo Go에서 확인할 항목입니다.
이번 작업에서는 앱이나 브라우저를 실행해 테스트하지 않았습니다.
