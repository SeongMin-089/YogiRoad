import styles from './FilterChips.module.scss';

type Props<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  counts?: Partial<Record<T, number>>;
};

export function FilterChips<T extends string>({ options, value, onChange, counts }: Props<T>) {
  return (
    <div className={styles.list} role="group">
      {options.map(option => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          className={`${styles.chip} ${value === option ? styles.selected : ''}`}
          onClick={() => onChange(option)}
        >
          {option}{counts?.[option] !== undefined ? ` ${counts[option]}` : ''}
        </button>
      ))}
    </div>
  );
}
