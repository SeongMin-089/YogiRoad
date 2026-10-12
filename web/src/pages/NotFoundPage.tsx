import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import styles from './Pages.module.scss';

export function NotFoundPage() {
  return (
    <div>
      <PageHeader eyebrow="404" title="페이지를 찾을 수 없습니다." description="주소를 다시 확인하거나 홈으로 돌아가 주세요." />
      <Link className={styles.primaryLink} to="/">홈으로 돌아가기</Link>
    </div>
  );
}
