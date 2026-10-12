import { Icon } from './Icon';
import styles from './BrandMark.module.scss';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={styles.brand} aria-label="YogiRoad">
      <span className={styles.mark}><Icon name="pin" /></span>
      {!compact && <span className={styles.wordmark}>Yogi<span>Road</span></span>}
    </div>
  );
}
