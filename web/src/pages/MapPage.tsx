import { MigrationNotice } from '../components/MigrationNotice';
import { PageHeader } from '../components/PageHeader';
import styles from './Pages.module.scss';

export function MapPage() {
  return (
    <div>
      <PageHeader eyebrow="Discovery" title="지도" description="새로운 음식점을 발견하고 영업 대상으로 연결하는 공간입니다." />
      <div className={styles.mapCanvas}>
        <div className={styles.mapGrid} aria-hidden="true" />
        <div className={styles.mapStatus}>
          <strong>Kakao Maps 웹 연동 예정</strong>
          <span>현재 단계에서는 실제 지도와 음식점 마커를 표시하지 않습니다.</span>
        </div>
      </div>
      <MigrationNotice
        title="지도 기능은 2단계에서 연결합니다."
        description="모바일 WebView 코드를 옮기지 않고 Kakao Maps JavaScript SDK 기반 웹 지도 컴포넌트로 구성할 예정입니다."
        items={['일반 음식점 및 신규 인허가 후보 조회', '지역 검색과 지도 중심 기반 재조회', '기존 영업 대상 등록 흐름 연결']}
      />
    </div>
  );
}
