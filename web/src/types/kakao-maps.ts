export type KakaoLatLng = {
  getLat(): number;
  getLng(): number;
};

export type KakaoMapInstance = {
  getCenter(): KakaoLatLng;
  setCenter(position: KakaoLatLng): void;
  relayout(): void;
};

export type KakaoMarker = {
  setMap(map: KakaoMapInstance | null): void;
};

export type KakaoMarkerClusterer = {
  addMarker(marker: KakaoMarker): void;
  addMarkers(markers: KakaoMarker[]): void;
  clear(): void;
};

export type KakaoPlace = {
  id?: string;
  place_name?: string;
  address_name?: string;
  road_address_name?: string;
  category_name?: string;
  x?: string;
  y?: string;
};

export type KakaoRegion = {
  region_type?: string;
  region_1depth_name?: string;
  region_2depth_name?: string;
};

export type KakaoAddressResult = { x?: string; y?: string };

export type KakaoMapsApi = {
  load(callback: () => void): void;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number; draggable: boolean; scrollwheel: boolean },
  ) => KakaoMapInstance;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  Marker: new (options: {
    position: KakaoLatLng;
    title: string;
    image: unknown;
  }) => KakaoMarker;
  MarkerImage: new (
    source: string,
    size: unknown,
    options: { offset: unknown },
  ) => unknown;
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  MarkerClusterer?: new (options: {
    map: KakaoMapInstance;
    averageCenter: boolean;
    minLevel: number;
    minClusterSize: number;
  }) => KakaoMarkerClusterer;
  services: {
    Status: { OK: string; ZERO_RESULT: string };
    SortBy: { ACCURACY: string };
    Places: new () => {
      keywordSearch(
        query: string,
        callback: (data: KakaoPlace[], status: string) => void,
        options: { size: number; sort: string },
      ): void;
    };
    Geocoder: new () => {
      addressSearch(address: string, callback: (data: KakaoAddressResult[], status: string) => void): void;
      coord2RegionCode(
        longitude: number,
        latitude: number,
        callback: (data: KakaoRegion[], status: string) => void,
      ): void;
    };
  };
  event: {
    addListener(target: object, event: string, handler: () => void): void;
    removeListener(target: object, event: string, handler: () => void): void;
  };
};

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsApi };
  }
}
