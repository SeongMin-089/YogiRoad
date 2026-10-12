import { MigrationNotice } from '../components/MigrationNotice';
import { PageHeader } from '../components/PageHeader';

export function SalesPage() {
  return (
    <div>
      <PageHeader eyebrow="Sales CRM" title="영업관리" description="등록 매장의 상태와 상담·방문 활동을 관리합니다." />
      <MigrationNotice
        title="실제 영업 데이터 UI 연결 전입니다."
        description="CRUD API 타입과 JWT 클라이언트는 준비되어 있지만, 이 화면에서는 아직 Firebase 데이터를 조회하거나 변경하지 않습니다."
        items={['상태별 검색 및 필터', '매장 상세·메모 수정과 삭제', '상담·방문 활동 추가 및 이력 조회']}
      />
    </div>
  );
}
