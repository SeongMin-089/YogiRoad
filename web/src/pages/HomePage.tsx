import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon, type IconName } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import styles from './Pages.module.scss';

const workflows: Array<{ path: string; icon: IconName; title: string; description: string; tag: string }> = [
  { path: '/map', icon: 'map', title: '음식점 발굴', description: '지역별 일반 음식점과 신규 인허가 후보를 지도에서 탐색합니다.', tag: '지도' },
  { path: '/sales', icon: 'briefcase', title: '영업 흐름 관리', description: '매장별 상태, 메모, 상담 및 방문 기록을 한곳에서 관리합니다.', tag: 'CRM' },
  { path: '/dashboard', icon: 'chart', title: '성과 확인', description: '실제 영업 데이터를 기준으로 상담과 계약 흐름을 확인합니다.', tag: '인사이트' },
];

export function HomePage() {
  const { user } = useAuth();
  const nickname = user?.nickname?.trim();

  return (
    <div>
      <PageHeader
        eyebrow="YogiRoad workspace"
        title={nickname ? `${nickname}님, 안녕하세요.` : '안녕하세요.'}
        description="웹에서도 영업 대상 발굴부터 활동 관리까지 같은 흐름으로 이어갈 준비를 하고 있어요."
      />

      <section className={styles.section} aria-labelledby="workflow-title">
        <div className={styles.sectionHeading}>
          <div><span>WORKFLOW</span><h2 id="workflow-title">오늘의 영업 흐름</h2></div>
          <p>각 화면의 웹 전용 UI를 단계적으로 연결합니다.</p>
        </div>
        <div className={styles.workflowGrid}>
          {workflows.map(workflow => (
            <Link className={styles.workflowCard} to={workflow.path} key={workflow.path}>
              <div className={styles.cardTop}><span className={styles.cardIcon}><Icon name={workflow.icon} /></span><small>{workflow.tag}</small></div>
              <h3>{workflow.title}</h3>
              <p>{workflow.description}</p>
              <span className={styles.cardLink}>화면 보기 <Icon name="arrow" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.foundation}`}>
        <span className={styles.foundationIndex}>01</span>
        <div><span>FOUNDATION READY</span><h2>기존 시스템을 지키는 웹 기반</h2></div>
        <p>Spring Boot API 경로, JWT Bearer 인증, 사용자별 Firebase 데이터 구조를 바꾸지 않고 웹 전용 화면 계층을 분리했습니다.</p>
      </section>
    </div>
  );
}
