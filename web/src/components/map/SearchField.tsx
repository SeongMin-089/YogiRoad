import { Icon } from '../Icon';
import styles from './SearchField.module.scss';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export function SearchField({ value, onChange, placeholder }: Props) {
  return (
    <div className={styles.field}>
      <Icon name="search" />
      <input
        aria-label={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <button type="button" aria-label="검색어 지우기" onClick={() => onChange('')}>
          <Icon name="close" />
        </button>
      )}
    </div>
  );
}
