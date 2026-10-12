import { useEffect } from 'react';
import { Icon } from '../Icon';
import type { PublicDataStore } from '../../types/map';
import type { RestaurantLicenseCandidate, SalesStatus } from '../../types/sales';
import styles from './StoreDetailsSheet.module.scss';

type Props = {
  store: PublicDataStore;
  licenseCandidate?: RestaurantLicenseCandidate;
  status?: SalesStatus;
  registering?: boolean;
  loadingRegistrationStatus?: boolean;
  onRegister: () => void;
  onClose: () => void;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function StoreDetailsSheet({
  store,
  licenseCandidate,
  status,
  registering = false,
  loadingRegistrationStatus = false,
  onRegister,
  onClose,
}: Props) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const category = text(licenseCandidate?.businessType) || text(store.indsMclsNm) || text(store.indsSclsNm);
  const subcategory = text(store.indsSclsNm);
  const name = text(store.bizesNm);
  const branch = text(store.brchNm);
  const road = text(store.rdnmAdr);
  const lot = text(store.lnoAdr);
  const region = [store.ctprvnNm, store.signguNm, store.adongNm].map(text).filter(Boolean).join(' ');
  const rows = [
    { label: road ? '도로명' : '지번', value: road || lot },
    { label: '지번', value: road && lot !== road ? lot : '' },
    { label: '건물명', value: text(store.bldNm) },
    { label: '층', value: text(store.flrNo) },
    { label: '지역', value: region },
    { label: '인허가일', value: text(licenseCandidate?.licenseDate) },
    { label: '영업상태', value: text(licenseCandidate?.statusName) },
    { label: '전화번호', value: text(licenseCandidate?.telephone) },
    {
      label: licenseCandidate ? '인허가 관리번호' : '상가업소번호',
      value: licenseCandidate ? text(licenseCandidate.managementNumber) : text(store.bizesId),
    },
  ].filter(row => row.value);

  const buttonTitle = status
    ? `등록 완료 · ${status}`
    : registering
      ? '등록 중...'
      : loadingRegistrationStatus
        ? '등록 상태 확인 중...'
        : '영업 대상 등록';
  const disabled = status !== undefined || registering || loadingRegistrationStatus || !text(store.bizesId);

  return (
    <aside className={styles.sheet} aria-label={`${name || '음식점'} 상세정보`}>
      <div className={styles.top}>
        <div className={styles.badges}>
          {licenseCandidate && <span className={styles.newCandidate}>신규 인허가 후보</span>}
          {category && <span className={styles.category}>{category}</span>}
          {status && <span className={`${styles.status} ${styles[`status-${status}`]}`}>{status}</span>}
        </div>
        <button type="button" className={styles.close} aria-label="영업 대상 상세 닫기" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className={styles.body}>
        {name && <h2>{name}</h2>}
        {branch && <p className={styles.branch}>{branch}</p>}
        {subcategory && subcategory !== category && <p className={styles.secondary}>{subcategory}</p>}
        <dl>
          {rows.map(row => (
            <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>
          ))}
        </dl>
      </div>
      <div className={styles.footer}>
        <button type="button" className={status ? styles.registeredButton : styles.registerButton} disabled={disabled} onClick={onRegister}>
          {buttonTitle}
        </button>
      </div>
    </aside>
  );
}
