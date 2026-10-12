import { MigrationNotice } from '../components/MigrationNotice';
import { PageHeader } from '../components/PageHeader';

export function DashboardPage() {
  return (
    <div>
      <PageHeader eyebrow="Performance" title="대시보드" description="실제 Firebase 영업 데이터로 성과와 활동 흐름을 확인합니다." />
      <MigrationNotice
        title="통계 시각화 UI 연결 전입니다."
        description="대시보드 응답 DTO와 API 경로는 웹 프로젝트에 반영했으며, 가짜 수치나 차트는 표시하지 않습니다."
        items={['핵심 실적과 계약 전환율', '주간 상담 활동 차트', '상태별 진행 현황과 최근 계약 매장']}
      />
    </div>
  );
}
