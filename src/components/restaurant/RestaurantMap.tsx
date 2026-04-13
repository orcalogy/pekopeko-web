'use client';

import { Badge, Button, Group, Stack, Text } from '@mantine/core';
import L from 'leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Locale } from '@/types/food';
import type { Restaurant } from '@/types/restaurant';

interface RestaurantMapProps {
  restaurants: Restaurant[];
  userLat: number;
  userLng: number;
  pickedId?: string;
  locale: Locale;
}

const labels = {
  navigate: { 'zh-CN': '导航', ja: 'ナビ', en: 'Go' },
  open: { 'zh-CN': '营业中', ja: '営業中', en: 'Open' },
  closed: { 'zh-CN': '已打烊', ja: '閉店', en: 'Closed' },
} as const;

function formatDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

function getNavUrl(r: Restaurant): string {
  return r.placeUrl ?? `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`;
}

// Blue dot icon for user location
const userIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 0 6px rgba(66,133,244,0.6)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Restaurant pin icons
function makePin(color: string, size: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="${size}" height="${Math.round(size * 1.4)}" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 22 12 22s12-13 12-22C24 5.37 18.63 0 12 0z" fill="${color}"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>`,
    iconSize: [size, Math.round(size * 1.4)],
    iconAnchor: [size / 2, Math.round(size * 1.4)],
    popupAnchor: [0, -Math.round(size * 1.2)],
  });
}

const defaultPin = makePin('#E03131', 28);
const pickedPin = makePin('#F76707', 36);

/** Sync map center when user location changes */
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [map, lat, lng]);
  return null;
}

export function RestaurantMap({
  restaurants,
  userLat,
  userLng,
  pickedId,
  locale,
}: RestaurantMapProps) {
  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={15}
      style={{
        width: '100%',
        height: '50vh',
        minHeight: 300,
        borderRadius: 'var(--mantine-radius-md)',
      }}
      zoomControl
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <RecenterMap lat={userLat} lng={userLng} />

      {/* User location */}
      <Marker position={[userLat, userLng]} icon={userIcon} interactive={false} />

      {/* Restaurant markers */}
      {restaurants.map((r) => {
        const isPicked = r.id === pickedId;
        return (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={isPicked ? pickedPin : defaultPin}
            zIndexOffset={isPicked ? 1000 : 0}
          >
            <Popup>
              <Stack gap={4} style={{ maxWidth: 220 }}>
                <Text fw={600} size="sm" lineClamp={1}>
                  {r.name}
                </Text>
                {r.cuisineType && (
                  <Text size="xs" c="orange">
                    {r.cuisineType}
                  </Text>
                )}
                <Group gap={6}>
                  <Badge variant="outline" size="xs" color="blue">
                    {formatDist(r.distance)}
                  </Badge>
                  {r.rating && (
                    <Badge variant="light" size="xs" color="yellow">
                      {'\u{2B50}'} {r.rating.toFixed(1)}
                    </Badge>
                  )}
                  {r.isOpenNow !== undefined && (
                    <Badge size="xs" variant="light" color={r.isOpenNow ? 'green' : 'red'}>
                      {r.isOpenNow ? labels.open[locale] : labels.closed[locale]}
                    </Badge>
                  )}
                </Group>
                <Button
                  variant="light"
                  color="orange"
                  size="xs"
                  radius="xl"
                  component="a"
                  href={getNavUrl(r)}
                  target="_blank"
                  rel="noopener noreferrer"
                  fullWidth
                >
                  {'\u{1F4CD}'} {labels.navigate[locale]}
                </Button>
              </Stack>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
