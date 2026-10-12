import { Icon } from './Icon';
import styles from './MigrationNotice.module.scss';

type MigrationNoticeProps = {
  title: string;
  description: string;
  items: string[];
};

export function MigrationNotice({ title, description, items }: MigrationNoticeProps) {
  return (
    <section className={styles.notice} aria-labelledby="migration-notice-title">
      <div className={styles.visual}><Icon name="arrow" /></div>
      <div className={styles.content}>
        <span className={styles.badge}>WEB MIGRATION · STEP 1</span>
        <h2 id="migration-notice-title">{title}</h2>
        <p>{description}</p>
        <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>
      </div>
    </section>
  );
}
