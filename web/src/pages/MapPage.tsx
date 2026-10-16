import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { FilterChips } from '../components/map/FilterChips';
import { KakaoMap, DEFAULT_CENTER } from '../components/map/KakaoMap';
import { SearchField } from '../components/map/SearchField';
import { StoreDetailsSheet } from '../components/map/StoreDetailsSheet';
import { ApiError } from '../services/apiClient';
import { DEFAULT_RESTAURANT_SEARCH, fetchRestaurantsInRadius } from '../services/publicStoreApi';
import { getRestaurantLicenseCandidates } from '../services/restaurantLicenseApi';
import { createSalesTarget, getSalesTarget, getSalesTargets } from '../services/salesTargetApi';
import type {
  KakaoMapStore,
  KakaoPlaceSearchResult,
  MapCenter,
  PublicDataStore,
  RegionSearchRequest,
  RegionSearchStatus,
} from '../types/map';
import {
  SALES_STATUSES,
  type CreateSalesTargetRequest,
  type RestaurantLicenseCandidate,
  type SalesStatus,
  type SalesTarget,
} from '../types/sales';
import styles from './MapPage.module.scss';

const statusFilters: readonly ('전체' | SalesStatus)[] = ['전체', ...SALES_STATUSES];
const discoveryFilters = ['전체 음식점', '신규 인허가 후보'] as const;
type DiscoveryFilter = (typeof discoveryFilters)[number];
type SelectedMapStore = { store: PublicDataStore; licenseCandidate?: RestaurantLicenseCandidate };

const SEARCH_RADIUS = DEFAULT_RESTAURANT_SEARCH.radius;
const PAGE_SIZE = DEFAULT_RESTAURANT_SEARCH.numOfRows;

function trimmed(value: string | undefined | null): string {
  return value?.trim() ?? '';
}

function toCreateSalesTargetRequest(
  store: PublicDataStore,
  licenseCandidate?: RestaurantLicenseCandidate,
): CreateSalesTargetRequest | null {
  const storeId = trimmed(store.bizesId);
  const storeName = trimmed(store.bizesNm);
  const { lat: latitude, lon: longitude } = store;
  if (!storeId || !storeName || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    storeId,
    storeName,
    category: trimmed(store.indsMclsNm) || trimmed(store.indsSclsNm),
    address: trimmed(store.rdnmAdr) || trimmed(store.lnoAdr),
    latitude: latitude as number,
    longitude: longitude as number,
    sourceType: licenseCandidate ? 'RESTAURANT_LICENSE' : 'PUBLIC_STORE',
    sourceId: licenseCandidate?.managementNumber ?? storeId,
  };
}

function normalizedMatchText(value: string | undefined): string {
  return trimmed(value).toLocaleLowerCase('ko-KR').replace(/[^\p{L}\p{N}]/gu, '');
}

function distanceMetres(store: PublicDataStore, candidate: RestaurantLicenseCandidate): number | null {
  if (!Number.isFinite(store.lat) || !Number.isFinite(store.lon)
      || !Number.isFinite(candidate.latitude) || !Number.isFinite(candidate.longitude)) return null;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians((candidate.latitude as number) - (store.lat as number));
  const longitudeDelta = toRadians((candidate.longitude as number) - (store.lon as number));
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(store.lat as number)) * Math.cos(toRadians(candidate.latitude as number))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function confidentlyMatches(store: PublicDataStore, candidate: RestaurantLicenseCandidate): boolean {
  const storeName = normalizedMatchText(store.bizesNm);
  const candidateName = normalizedMatchText(candidate.storeName);
  if (!storeName || storeName !== candidateName) return false;
  const storeAddress = normalizedMatchText(store.rdnmAdr || store.lnoAdr);
  const candidateAddress = normalizedMatchText(candidate.address);
  const sameAddress = storeAddress.length >= 8 && candidateAddress.length >= 8
    && (storeAddress.includes(candidateAddress) || candidateAddress.includes(storeAddress));
  const distance = distanceMetres(store, candidate);
  return sameAddress || (distance !== null && distance <= 75);
}

function licenseRegionFromAddress(value: string): string {
  const aliases: Record<string, string> = {
    서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시',
    광주: '광주광역시', 대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시',
    경기: '경기도', 강원: '강원특별자치도', 충북: '충청북도', 충남: '충청남도',
    전북: '전북특별자치도', 전남: '전라남도', 경북: '경상북도', 경남: '경상남도',
    제주: '제주특별자치도',
  };
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const province = aliases[parts[0]] ?? parts[0];
  const municipality = parts.slice(1, 4).find(part => /(시|군|구)$/.test(part));
  return municipality ? `${province} ${municipality}` : province;
}

function candidateAsPublicStore(candidate: RestaurantLicenseCandidate, coordinate?: MapCenter): PublicDataStore {
  return {
    bizesId: candidate.storeId,
    bizesNm: candidate.storeName,
    indsMclsNm: candidate.businessType,
    rdnmAdr: candidate.roadAddress,
    lnoAdr: candidate.lotNumberAddress,
    lat: candidate.latitude ?? coordinate?.latitude,
    lon: candidate.longitude ?? coordinate?.longitude,
  };
}

function notificationCandidateFromSearch(search: string): RestaurantLicenseCandidate | null {
  const params = new URLSearchParams(search);
  const managementNumber = params.get('managementNumber')?.trim() ?? '';
  const storeName = params.get('storeName')?.trim() ?? '';
  if (!managementNumber || !storeName) return null;
  const latitude = Number(params.get('latitude'));
  const longitude = Number(params.get('longitude'));
  const hasCoordinate = params.has('latitude') && params.has('longitude')
    && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
  const roadAddress = params.get('roadAddress')?.trim() ?? '';
  const lotNumberAddress = params.get('lotNumberAddress')?.trim() ?? '';
  return {
    managementNumber,
    storeId: `license:${managementNumber}`,
    storeName,
    licenseDate: params.get('licenseDate')?.trim() ?? '',
    statusCode: '01',
    statusName: '영업/정상',
    businessType: params.get('businessType')?.trim() ?? '',
    address: params.get('address')?.trim() || roadAddress || lotNumberAddress,
    roadAddress,
    lotNumberAddress,
    telephone: '',
    latitude: hasCoordinate ? latitude : null,
    longitude: hasCoordinate ? longitude : null,
    coordinateSource: hasCoordinate ? 'EPSG_5174' : 'ADDRESS_REQUIRED',
  };
}

export function MapPage() {
  const initialNotificationCandidate = useMemo(() => notificationCandidateFromSearch(window.location.search), []);
  const initialManagedRegion = useMemo(() => new URLSearchParams(window.location.search).get('region')?.trim() ?? '', []);
  const initialCenter = useMemo<MapCenter>(() => {
    const latitude = initialNotificationCandidate?.latitude;
    const longitude = initialNotificationCandidate?.longitude;
    return typeof latitude === 'number' && typeof longitude === 'number'
      ? { latitude, longitude }
      : DEFAULT_CENTER;
  }, [initialNotificationCandidate]);
  const [storeQuery, setStoreQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'전체' | SalesStatus>('전체');
  const [discoveryFilter, setDiscoveryFilter] = useState<DiscoveryFilter>('전체 음식점');
  const [mapCenter, setMapCenter] = useState<MapCenter>(initialCenter);
  const [needsAreaSearch, setNeedsAreaSearch] = useState(false);
  const [regionQuery, setRegionQuery] = useState(initialManagedRegion);
  const [regionSearchRequest, setRegionSearchRequest] = useState<RegionSearchRequest | null>(null);
  const [regionSearchStatus, setRegionSearchStatus] = useState<'idle' | 'loading' | 'results' | 'zero' | 'error'>('idle');
  const [regionResults, setRegionResults] = useState<KakaoPlaceSearchResult[]>([]);
  const [selectedRegionName, setSelectedRegionName] = useState('남양주 진접');
  const [licenseRegion, setLicenseRegion] = useState('경기도 남양주시');
  const [stores, setStores] = useState<PublicDataStore[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [licenseCandidates, setLicenseCandidates] = useState<RestaurantLicenseCandidate[]>(
    initialNotificationCandidate ? [initialNotificationCandidate] : [],
  );
  const [loadingLicenseCandidates, setLoadingLicenseCandidates] = useState(true);
  const [licenseCandidateError, setLicenseCandidateError] = useState<string | null>(null);
  const [selectedMapStore, setSelectedMapStore] = useState<SelectedMapStore | null>(initialNotificationCandidate ? {
    store: candidateAsPublicStore(initialNotificationCandidate), licenseCandidate: initialNotificationCandidate,
  } : null);
  const [salesTargets, setSalesTargets] = useState<SalesTarget[]>([]);
  const [loadingSalesTargets, setLoadingSalesTargets] = useState(true);
  const [salesTargetError, setSalesTargetError] = useState<string | null>(null);
  const [registeringStoreId, setRegisteringStoreId] = useState<string | null>(null);
  const storeRequestVersion = useRef(0);
  const activeStoreRequest = useRef<{ key: string; controller: AbortController } | null>(null);
  const licenseRequestVersion = useRef(0);
  const activeLicenseRequest = useRef<{ key: string; controller: AbortController } | null>(null);
  const regionRequestId = useRef(0);
  const preserveInitialSelectionRef = useRef(Boolean(initialNotificationCandidate));
  const managedRegionRequestRef = useRef(initialNotificationCandidate
    && (initialNotificationCandidate.latitude === null || initialNotificationCandidate.longitude === null)
    ? initialNotificationCandidate.address
    : initialNotificationCandidate ? '' : initialManagedRegion);

  const loadStores = useCallback(async (center: MapCenter) => {
    const requestKey = [center.latitude.toFixed(6), center.longitude.toFixed(6), SEARCH_RADIUS,
      DEFAULT_RESTAURANT_SEARCH.pageNo, PAGE_SIZE].join(':');
    const activeRequest = activeStoreRequest.current;
    if (activeRequest?.key === requestKey && !activeRequest.controller.signal.aborted) return;
    activeRequest?.controller.abort();
    const controller = new AbortController();
    activeStoreRequest.current = { key: requestKey, controller };
    const version = ++storeRequestVersion.current;
    setLoadingStores(true);
    setStoreError(null);
    setNeedsAreaSearch(false);
    if (preserveInitialSelectionRef.current) preserveInitialSelectionRef.current = false;
    else setSelectedMapStore(null);
    try {
      const result = await fetchRestaurantsInRadius({
        latitude: center.latitude,
        longitude: center.longitude,
        radius: SEARCH_RADIUS,
        pageNo: DEFAULT_RESTAURANT_SEARCH.pageNo,
        numOfRows: PAGE_SIZE,
        signal: controller.signal,
      });
      if (version === storeRequestVersion.current) setStores(result);
    } catch (error) {
      if (version !== storeRequestVersion.current || controller.signal.aborted) return;
      setStoreError(error instanceof ApiError
        ? error.message
        : '주변 음식점을 불러오지 못했습니다. 지도를 이동한 뒤 다시 검색할 수 있습니다.');
      setNeedsAreaSearch(true);
    } finally {
      if (version === storeRequestVersion.current) {
        setLoadingStores(false);
        if (activeStoreRequest.current?.controller === controller) activeStoreRequest.current = null;
      }
    }
  }, []);

  const loadLicenseCandidates = useCallback(async (region: string) => {
    const cleanRegion = licenseRegionFromAddress(region);
    if (!cleanRegion) {
      setLicenseCandidates([]);
      setLoadingLicenseCandidates(false);
      setLicenseCandidateError('지도 중심의 행정구역을 확인할 수 없습니다. 지역을 다시 선택해 주세요.');
      return;
    }
    const activeRequest = activeLicenseRequest.current;
    if (activeRequest?.key === cleanRegion && !activeRequest.controller.signal.aborted) return;
    activeRequest?.controller.abort();
    const controller = new AbortController();
    activeLicenseRequest.current = { key: cleanRegion, controller };
    const version = ++licenseRequestVersion.current;
    setLicenseRegion(cleanRegion);
    setLoadingLicenseCandidates(true);
    setLicenseCandidateError(null);
    try {
      const result = await getRestaurantLicenseCandidates(cleanRegion, controller.signal);
      if (version === licenseRequestVersion.current) setLicenseCandidates(
        initialNotificationCandidate
          && !result.some(candidate => candidate.managementNumber === initialNotificationCandidate.managementNumber)
          ? [initialNotificationCandidate, ...result]
          : result,
      );
    } catch (error) {
      if (version !== licenseRequestVersion.current || controller.signal.aborted) return;
      setLicenseCandidateError(error instanceof ApiError
        ? error.message
        : '신규 인허가 후보를 불러오지 못했습니다. 기존 음식점 지도는 계속 사용할 수 있습니다.');
    } finally {
      if (version === licenseRequestVersion.current) {
        setLoadingLicenseCandidates(false);
        if (activeLicenseRequest.current?.controller === controller) activeLicenseRequest.current = null;
      }
    }
  }, [initialNotificationCandidate]);

  useEffect(() => {
    void loadStores(initialCenter);
    void loadLicenseCandidates(initialManagedRegion || '경기도 남양주시');
    if (initialNotificationCandidate) setSelectedMapStore({
      store: candidateAsPublicStore(initialNotificationCandidate),
      licenseCandidate: initialNotificationCandidate,
    });
    let active = true;
    setLoadingSalesTargets(true);
    void getSalesTargets().then(result => {
      if (active) {
        setSalesTargets(result);
        setSalesTargetError(null);
      }
    }).catch((error: unknown) => {
      if (active) setSalesTargetError(error instanceof ApiError
        ? error.message
        : '영업 대상 등록 상태를 불러오지 못했습니다.');
    }).finally(() => {
      if (active) setLoadingSalesTargets(false);
    });
    return () => {
      active = false;
      storeRequestVersion.current += 1;
      activeStoreRequest.current?.controller.abort();
      licenseRequestVersion.current += 1;
      activeLicenseRequest.current?.controller.abort();
    };
  }, [initialCenter, initialManagedRegion, initialNotificationCandidate, loadLicenseCandidates, loadStores]);

  useEffect(() => {
    if (!managedRegionRequestRef.current) return;
    const id = ++regionRequestId.current;
    setRegionSearchRequest({ id, query: managedRegionRequestRef.current });
    setRegionSearchStatus('loading');
  }, []);

  useEffect(() => {
    if (regionSearchStatus !== 'loading' || !regionSearchRequest) return;
    const pendingRequestId = regionSearchRequest.id;
    const timer = window.setTimeout(() => {
      if (regionRequestId.current !== pendingRequestId) return;
      setRegionResults([]);
      setRegionSearchStatus('error');
    }, 15_000);
    return () => window.clearTimeout(timer);
  }, [regionSearchRequest, regionSearchStatus]);

  const salesTargetStatuses = useMemo(
    () => new Map(salesTargets.map(target => [target.storeId, target.status])), [salesTargets],
  );
  const licenseTargetStatuses = useMemo(
    () => new Map(salesTargets.filter(target => target.sourceType === 'RESTAURANT_LICENSE' && target.sourceId)
      .map(target => [target.sourceId as string, target.status])), [salesTargets],
  );
  const candidateAssociations = useMemo(() => licenseCandidates.map(candidate => {
    const matchedStore = stores.find(store => Number.isFinite(store.lat) && Number.isFinite(store.lon)
      && trimmed(store.bizesId) && confidentlyMatches(store, candidate));
    return { candidate, matchedStore, markerId: trimmed(matchedStore?.bizesId) || candidate.storeId };
  }), [licenseCandidates, stores]);

  const visibleStores = useMemo(() => {
    const normalizedQuery = storeQuery.trim().toLocaleLowerCase('ko-KR');
    return stores.filter(store => {
      const storeId = trimmed(store.bizesId);
      const association = candidateAssociations.find(item => item.markerId === storeId);
      if (discoveryFilter === '신규 인허가 후보' && !association) return false;
      const registeredStatus = association
        ? licenseTargetStatuses.get(association.candidate.managementNumber) ?? salesTargetStatuses.get(storeId)
        : salesTargetStatuses.get(storeId);
      const matchesStatus = statusFilter === '전체' || registeredStatus === statusFilter;
      const matchesQuery = !normalizedQuery || [store.bizesNm, store.rdnmAdr, store.lnoAdr,
        store.indsMclsNm, store.indsSclsNm]
        .some(value => trimmed(value).toLocaleLowerCase('ko-KR').includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [candidateAssociations, discoveryFilter, licenseTargetStatuses, salesTargetStatuses, statusFilter, storeQuery, stores]);

  const mapStores = useMemo(() => {
    const result: KakaoMapStore[] = [];
    const seen = new Set<string>();
    for (const store of visibleStores) {
      const storeId = trimmed(store.bizesId);
      if (!Number.isFinite(store.lat) || Math.abs(store.lat as number) > 90
          || !Number.isFinite(store.lon) || Math.abs(store.lon as number) > 180
          || !storeId || seen.has(storeId)) continue;
      const association = candidateAssociations.find(item => item.markerId === storeId);
      result.push({
        ...store,
        bizesId: storeId,
        bizesNm: trimmed(store.bizesNm) || '상호명 미제공',
        salesStatus: association
          ? licenseTargetStatuses.get(association.candidate.managementNumber) ?? salesTargetStatuses.get(storeId)
          : salesTargetStatuses.get(storeId),
        markerKind: association?.candidate.managementNumber === initialNotificationCandidate?.managementNumber
          ? 'highlighted' : association ? 'licenseCandidate' : 'standard',
      });
      seen.add(storeId);
    }
    for (const association of candidateAssociations) {
      if (association.matchedStore || seen.has(association.markerId)) continue;
      const { candidate } = association;
      const registeredStatus = licenseTargetStatuses.get(candidate.managementNumber)
        ?? salesTargetStatuses.get(association.markerId);
      if (statusFilter !== '전체' && registeredStatus !== statusFilter) continue;
      const normalizedQuery = storeQuery.trim().toLocaleLowerCase('ko-KR');
      if (normalizedQuery && ![candidate.storeName, candidate.address, candidate.businessType]
        .some(value => value.toLocaleLowerCase('ko-KR').includes(normalizedQuery))) continue;
      result.push({
        bizesId: association.markerId,
        bizesNm: candidate.storeName,
        indsMclsNm: candidate.businessType,
        rdnmAdr: candidate.roadAddress,
        lnoAdr: candidate.lotNumberAddress,
        lat: candidate.latitude ?? undefined,
        lon: candidate.longitude ?? undefined,
        geocodeAddress: candidate.address,
        markerKind: candidate.managementNumber === initialNotificationCandidate?.managementNumber
          ? 'highlighted' : 'licenseCandidate',
        salesStatus: registeredStatus,
      });
      seen.add(association.markerId);
    }
    return result;
  }, [candidateAssociations, initialNotificationCandidate, licenseTargetStatuses, salesTargetStatuses, statusFilter, storeQuery, visibleStores]);

  const selectedStoreId = trimmed(selectedMapStore?.store.bizesId);
  const selectedStoreStatus = selectedMapStore?.licenseCandidate
    ? licenseTargetStatuses.get(selectedMapStore.licenseCandidate.managementNumber)
      ?? salesTargetStatuses.get(selectedStoreId)
    : salesTargetStatuses.get(selectedStoreId);
  const notificationLocationUnavailable = initialNotificationCandidate
    && initialNotificationCandidate.latitude === null
    && initialNotificationCandidate.longitude === null
    && (!initialNotificationCandidate.address || regionSearchStatus === 'error' || regionSearchStatus === 'zero');

  function submitRegionSearch(event?: FormEvent) {
    event?.preventDefault();
    const query = regionQuery.trim();
    if (!query) {
      setRegionResults([]);
      setRegionSearchStatus('zero');
      return;
    }
    const id = ++regionRequestId.current;
    setRegionSearchRequest({ id, query });
    setRegionResults([]);
    setRegionSearchStatus('loading');
  }

  function handleRegionSearchResult(requestId: number, results: KakaoPlaceSearchResult[], resultStatus: RegionSearchStatus) {
    if (requestId !== regionRequestId.current) return;
    if (managedRegionRequestRef.current && resultStatus === 'ok' && results[0]) {
      managedRegionRequestRef.current = '';
      selectRegion(results[0]);
      if (initialNotificationCandidate) setSelectedMapStore({
        store: candidateAsPublicStore(initialNotificationCandidate),
        licenseCandidate: initialNotificationCandidate,
      });
      return;
    }
    managedRegionRequestRef.current = '';
    setRegionResults(results);
    setRegionSearchStatus(resultStatus === 'ok' ? 'results' : resultStatus);
  }

  function selectRegion(result: KakaoPlaceSearchResult) {
    const center = { latitude: result.latitude, longitude: result.longitude };
    setMapCenter(center);
    setSelectedRegionName(result.name);
    setRegionQuery(result.name);
    setRegionResults([]);
    setRegionSearchStatus('idle');
    setNeedsAreaSearch(false);
    void loadStores(center);
    const candidateRegion = licenseRegionFromAddress(result.roadAddress || result.address);
    if (candidateRegion) void loadLicenseCandidates(candidateRegion);
  }

  async function handleRegister() {
    if (!selectedMapStore || registeringStoreId) return;
    const requestBody = toCreateSalesTargetRequest(selectedMapStore.store, selectedMapStore.licenseCandidate);
    if (!requestBody) {
      window.alert('이 매장은 필수 정보가 부족해 영업 대상으로 등록할 수 없습니다.');
      return;
    }
    if (salesTargetStatuses.has(requestBody.storeId)
        || (selectedMapStore.licenseCandidate
          && licenseTargetStatuses.has(selectedMapStore.licenseCandidate.managementNumber))) return;
    setRegisteringStoreId(requestBody.storeId);
    try {
      const created = await createSalesTarget(requestBody);
      setSalesTargets(previous => previous.some(target => target.storeId === created.storeId)
        ? previous.map(target => target.storeId === created.storeId ? created : target)
        : [created, ...previous]);
      setSalesTargetError(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const refreshedTargets = await getSalesTargets().catch(() => null);
        if (refreshedTargets) setSalesTargets(refreshedTargets);
        const existing = refreshedTargets?.find(target => target.storeId === requestBody.storeId
          || (requestBody.sourceType === 'RESTAURANT_LICENSE'
            && target.sourceType === requestBody.sourceType && target.sourceId === requestBody.sourceId))
          ?? await getSalesTarget(requestBody.storeId).catch(() => null);
        if (existing) {
          setSalesTargets(previous => previous.some(target => target.storeId === existing.storeId)
            ? previous.map(target => target.storeId === existing.storeId ? existing : target)
            : [existing, ...previous]);
          setSalesTargetError(null);
          return;
        }
      }
      window.alert(error instanceof ApiError ? error.message : '영업 대상을 등록하지 못했습니다.');
    } finally {
      setRegisteringStoreId(null);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.mapHeader}>
        <span>Field Map</span>
        <h1>음식점 찾기</h1>
        <p>지역을 검색하고 지도에서 바로 영업 대상을 확인하세요.</p>
      </header>
      <section className={styles.section}>
        <label className={styles.sectionLabel} htmlFor="region-search">지역 이동</label>
        <form className={styles.regionSearch} onSubmit={submitRegionSearch}>
          <Icon name="location" />
          <input
            id="region-search"
            value={regionQuery}
            onChange={event => {
              setRegionQuery(event.target.value);
              if (regionSearchRequest) {
                regionRequestId.current += 1;
                setRegionSearchRequest(null);
              }
              if (regionSearchStatus !== 'idle') {
                setRegionResults([]);
                setRegionSearchStatus('idle');
              }
            }}
            placeholder="강남역, 잠실, 홍대입구, 남양주 진접"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" aria-label="지역 검색" disabled={regionSearchStatus === 'loading'}>
            {regionSearchStatus === 'loading' ? <span className={styles.buttonSpinner} /> : <Icon name="search" />}
          </button>
        </form>
        {regionSearchStatus === 'zero' && <p className={styles.feedback} role="status">
          {regionQuery.trim() ? '검색 결과가 없습니다. 지역명을 더 구체적으로 입력해 주세요.' : '검색할 지역명을 입력해 주세요.'}
        </p>}
        {regionSearchStatus === 'error' && <p className={`${styles.feedback} ${styles.error}`} role="alert">
          지역 검색에 실패했습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.
        </p>}
        {regionResults.length > 0 && <div className={styles.regionResults}>
          {regionResults.map((result, index) => <button
            type="button"
            key={result.id || `${result.latitude},${result.longitude},${index}`}
            aria-label={`${result.name} 위치 선택`}
            onClick={() => selectRegion(result)}
          >
            <span className={styles.resultIcon}><Icon name="location" /></span>
            <span className={styles.resultCopy}><strong>{result.name}</strong><small>{result.roadAddress || result.address || result.categoryName}</small></span>
            <Icon name="chevron" />
          </button>)}
        </div>}
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>지도 표시 대상</span>
        <FilterChips
          options={discoveryFilters}
          value={discoveryFilter}
          onChange={value => { setDiscoveryFilter(value); setSelectedMapStore(null); }}
          counts={{ '신규 인허가 후보': licenseCandidates.length }}
        />
        <span className={styles.sectionLabel}>조회된 음식점 찾기</span>
        <SearchField value={storeQuery} onChange={setStoreQuery} placeholder="음식점 이름, 주소 또는 업종 검색" />
        <FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />
      </section>

      <div className={styles.mapSection}>
        <KakaoMap
          latitude={mapCenter.latitude}
          longitude={mapCenter.longitude}
          stores={mapStores}
          regionSearchRequest={regionSearchRequest}
          onRegionSearchResult={handleRegionSearchResult}
          onCenterIdle={(center, userInitiated, regionName) => {
            setMapCenter(center);
            if (regionName) setLicenseRegion(licenseRegionFromAddress(regionName));
            if (userInitiated) {
              if (!regionName) setLicenseRegion('');
              setSelectedRegionName('현재 지도 중심');
              setNeedsAreaSearch(true);
              setSelectedMapStore(null);
            }
          }}
          onStorePress={(storeId, coordinate) => {
            const association = candidateAssociations.find(item => item.markerId === storeId);
            const selected = stores.find(store => store.bizesId === storeId) ?? association?.matchedStore;
            if (selected) setSelectedMapStore({ store: selected, licenseCandidate: association?.candidate });
            else if (association) setSelectedMapStore({
              store: candidateAsPublicStore(association.candidate, coordinate),
              licenseCandidate: association.candidate,
            });
          }}
        />
        {needsAreaSearch && <button
          type="button"
          className={styles.areaSearchButton}
          onClick={() => { void loadStores(mapCenter); void loadLicenseCandidates(licenseRegion); }}
        ><Icon name="search" />이 지역 음식점 검색</button>}
      </div>

      <div className={styles.mapMeta}>
        <div className={styles.metaTitleRow}>
          <strong>{selectedRegionName} · 반경 {SEARCH_RADIUS / 1000}km</strong>
          {(loadingStores || loadingLicenseCandidates) && <span className={styles.metaSpinner} aria-hidden="true" />}
        </div>
        <p role="status">{loadingStores
          ? '음식점을 불러오는 중...'
          : storeError ?? (stores.length
            ? `조회 ${stores.length}곳 · 현재 필터 표시 대상 ${mapStores.length}곳`
            : '이 지역에는 조회된 음식점이 없습니다. 지도를 이동해 다시 검색해 보세요.')}</p>
        <p role="status">{loadingLicenseCandidates
          ? '최근 30일 신규 인허가 후보를 확인하는 중...'
          : licenseCandidateError ?? `신규 인허가 후보 ${licenseCandidates.length}곳`}</p>
        {notificationLocationUnavailable && <p className={styles.error} role="alert">
          이 알림의 위치를 확인하지 못했습니다. 임의 위치는 표시하지 않으며 음식점 상세정보만 제공합니다.
        </p>}
        <div className={styles.legend}>
          <span><i className={styles.unregisteredDot} />미등록</span>
          <span><i className={styles.registeredDot} />등록됨 · 상태별 색상</span>
          <span><i className={styles.newCandidateDot} />신규 인허가 후보 · NEW</span>
        </div>
        {salesTargetError && <p className={styles.error} role="alert">{salesTargetError} 지도와 음식점 마커는 계속 사용할 수 있습니다.</p>}
      </div>

      {selectedMapStore && <StoreDetailsSheet
        key={`${selectedStoreId}:${selectedMapStore.licenseCandidate?.managementNumber ?? ''}`}
        store={selectedMapStore.store}
        licenseCandidate={selectedMapStore.licenseCandidate}
        status={selectedStoreStatus}
        registering={registeringStoreId === selectedStoreId}
        loadingRegistrationStatus={loadingSalesTargets}
        onClose={() => setSelectedMapStore(null)}
        onRegister={() => { void handleRegister(); }}
      />}
    </div>
  );
}
