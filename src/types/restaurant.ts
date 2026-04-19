export interface SearchOptions {
  lat: number;
  lng: number;
  radius: number;
  keyword?: string;
  openNow?: boolean;
  type?: string;
}

export type MapProviderType = 'amap' | 'google' | 'hotpepper';

export interface RestaurantProviderRef {
  provider: MapProviderType;
  providerId: string;
}

export interface Restaurant {
  id: string;
  /** Stable server-managed restaurant identity */
  restaurantKey?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
  rating?: number;
  priceLevel?: number;
  isOpenNow?: boolean;
  openingHours?: string[];
  cuisineType?: string;
  photoUrl?: string;
  phone?: string;
  /** Direct link to this place on Google Maps or Amap */
  placeUrl?: string;
  /** Link to the shop detail page on the source platform */
  detailUrl?: string;
  /** Coupon page URL (HotPepper etc.) */
  couponUrl?: string;
  /** Transit access directions (e.g. "渋谷駅徒歩5分") */
  accessInfo?: string;
  /** Human-readable budget text (e.g. "3000～4000円") */
  budgetText?: string;
  /** Approximate supported seats / capacity when available from the provider */
  capacity?: number;
  /** Feature codes: "wifi", "lunch", "private_room", "english", "non_smoking", "card", "parking" */
  features?: string[];
  /** Best link to view food menu (HotPepper /food/ page or restaurant website) */
  menuUrl?: string;
  /** Restaurant's own website */
  websiteUrl?: string;
  /** Provider used to fetch this result or enrich it */
  source?: 'google' | 'hotpepper' | 'amap' | 'hybrid';
  /** Stable provider references retained across normalization and merge steps */
  providerRefs?: RestaurantProviderRef[];
  /** Google Places photo resource name, when photo proxying must stay server-side */
  photoRef?: string;
}

export interface MapProvider {
  searchNearby(options: SearchOptions): Promise<Restaurant[]>;
  getDetails(placeId: string): Promise<Restaurant>;
}
