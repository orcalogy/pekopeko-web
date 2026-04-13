import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MapProviderType } from '@/types/restaurant';

interface LocationState {
  lat: number | null;
  lng: number | null;
  country: string | null;
  provider: MapProviderType | null;
  locatedAt: number | null;
  loading: boolean;
  error: string | null;

  setLocation: (lat: number, lng: number) => void;
  setCountry: (country: string) => void;
  setProvider: (provider: MapProviderType) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  requestLocation: () => void;
}

export const useLocation = create<LocationState>()(
  persist(
    (set) => ({
      lat: null,
      lng: null,
      country: null,
      provider: null,
      locatedAt: null,
      loading: false,
      error: null,

      setLocation: (lat, lng) => set({ lat, lng, locatedAt: Date.now(), error: null }),
      setCountry: (country) => set({ country }),
      setProvider: (provider) => set({ provider }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, loading: false }),

      requestLocation: () => {
        if (!navigator.geolocation) {
          set({ error: 'Geolocation is not supported', loading: false });
          return;
        }

        set({ loading: true, error: null });

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            set({
              lat: latitude,
              lng: longitude,
              country: null,
              provider: null,
              locatedAt: Date.now(),
              loading: false,
              error: null,
            });

            // Auto-detect region
            try {
              const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
              const data = await res.json();
              let provider: MapProviderType = 'google';
              if (data.country === 'CN') provider = 'amap';
              else if (data.country === 'JP') provider = 'hotpepper';
              set({ country: data.country ?? 'UNKNOWN', provider });
            } catch {
              // Default to google if detection fails
              set({ country: 'UNKNOWN', provider: 'google' });
            }
          },
          (err) => {
            set({ error: err.message, loading: false });
          },
          { enableHighAccuracy: true, timeout: 10000 },
        );
      },
    }),
    {
      name: 'pekopeko-location',
      partialize: (state) => ({
        lat: state.lat,
        lng: state.lng,
        country: state.country,
        provider: state.provider,
        locatedAt: state.locatedAt,
      }),
    },
  ),
);
