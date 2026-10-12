export type ManagedRegion = {
  region1DepthName: string;
  region2DepthName: string;
  region3DepthName: string | null;
  displayName: string;
};

export type UserProfile = {
  userId: string;
  provider: string;
  kakaoNickname: string | null;
  kakaoProfileImageUrl: string | null;
  displayName: string | null;
  effectiveName: string | null;
  customProfileImageUrl: string | null;
  effectiveProfileImageUrl: string | null;
  managedRegion: ManagedRegion | null;
  updatedAt: string | null;
};

export type UpdateUserProfileRequest = {
  displayName: string | null;
  managedRegion: {
    region1DepthName: string;
    region2DepthName: string;
    region3DepthName: string | null;
  } | null;
};
