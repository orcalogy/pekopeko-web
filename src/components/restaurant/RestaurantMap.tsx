'use client';

import { Badge, Box, Button, Group, Stack, Text } from '@mantine/core';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Locale } from '@/types/food';
import type { Restaurant } from '@/types/restaurant';

interface RestaurantMapProps {
  restaurants: Restaurant[];
  userLat: number;
  userLng: number;
  focusedId?: string | null;
  locale: Locale;
  height?: string | number;
  minHeight?: number;
  maxHeight?: number;
}

const labels = {
  navigate: { 'zh-CN': '导航', ja: 'ナビ', en: 'Go' },
  open: { 'zh-CN': '营业中', ja: '営業中', en: 'Open' },
  closed: { 'zh-CN': '已打烊', ja: '閉店', en: 'Closed' },
  you: { 'zh-CN': '你的位置', ja: '現在地', en: 'You' },
  following: { 'zh-CN': '当前聚焦', ja: '追従中', en: 'Following' },
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
  html: '<div style="width:24px;height:24px;border-radius:50%;background:rgba(66,133,244,0.20);display:flex;align-items:center;justify-content:center"><div style="width:12px;height:12px;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 0 10px rgba(66,133,244,0.55)"></div></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
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
const focusedPin = makePin('#F76707', 36);

/** Keep the map focused on the active restaurant, falling back to the user's location. */
function SyncMapFocus({
  restaurant,
  userLat,
  userLng,
}: {
  restaurant?: Restaurant;
  userLat: number;
  userLng: number;
}) {
  const map = useMap();
  const previousTargetRef = useRef<string | null>(null);

  useEffect(() => {
    const targetKey = restaurant
      ? `${restaurant.id}:${userLat.toFixed(5)}:${userLng.toFixed(5)}`
      : `user:${userLat.toFixed(5)}:${userLng.toFixed(5)}`;

    if (previousTargetRef.current === targetKey) {
      return;
    }

    if (!restaurant) {
      map.setView([userLat, userLng], Math.max(map.getZoom(), 15), { animate: false });
      previousTargetRef.current = targetKey;
      return;
    }

    const userPoint = L.latLng(userLat, userLng);
    const restaurantPoint = L.latLng(restaurant.lat, restaurant.lng);
    const shouldAnimate = previousTargetRef.current !== null;

    if (userPoint.distanceTo(restaurantPoint) < 8) {
      if (shouldAnimate) {
        map.flyTo([restaurant.lat, restaurant.lng], Math.max(map.getZoom(), 15), {
          animate: true,
          duration: 0.45,
        });
      } else {
        map.setView([restaurant.lat, restaurant.lng], Math.max(map.getZoom(), 15), {
          animate: false,
        });
      }
    } else if (shouldAnimate) {
      map.flyToBounds(L.latLngBounds([userPoint, restaurantPoint]), {
        animate: true,
        duration: 0.45,
        maxZoom: 15,
        padding: [32, 32],
      });
    } else {
      map.fitBounds(L.latLngBounds([userPoint, restaurantPoint]), {
        animate: false,
        maxZoom: 15,
        padding: [32, 32],
      });
    }

    previousTargetRef.current = targetKey;
  }, [map, restaurant, userLat, userLng]);

  return null;
}

export default function RestaurantMap({
  restaurants,
  userLat,
  userLng,
  focusedId,
  locale,
  height = '34vh',
  minHeight = 240,
  maxHeight = 340,
}: RestaurantMapProps) {
  const focusedRestaurant = restaurants.find((restaurant) => restaurant.id === focusedId);

  return (
    <Box style={{ position: 'relative', width: '100%' }}>
      <MapContainer
        center={[userLat, userLng]}
        zoom={15}
        dragging={false}
        touchZoom={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        style={{
          width: '100%',
          height,
          minHeight,
          maxHeight,
          borderRadius: '18px',
          touchAction: 'pan-y',
        }}
        attributionControl={false}
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <SyncMapFocus restaurant={focusedRestaurant} userLat={userLat} userLng={userLng} />

        {/* User location */}
        <Marker
          position={[userLat, userLng]}
          icon={userIcon}
          interactive={false}
          zIndexOffset={2000}
        />

        {/* Restaurant markers */}
        {restaurants.map((r) => {
          const isFocused = r.id === focusedId;
          return (
            <Marker
              key={r.id}
              position={[r.lat, r.lng]}
              icon={isFocused ? focusedPin : defaultPin}
              zIndexOffset={isFocused ? 1000 : 0}
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
                        {'⭐'} {r.rating.toFixed(1)}
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
                    {'📍'} {labels.navigate[locale]}
                  </Button>
                </Stack>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <Group
        gap="xs"
        wrap="wrap"
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          pointerEvents: 'none',
          zIndex: 500,
        }}
      >
        <Box className="app-stat-pill" style={{ maxWidth: focusedRestaurant ? '45%' : 'unset' }}>
          <Text size="xs" fw={700} c="blue">
            {'●'} {labels.you[locale]}
          </Text>
        </Box>
        {focusedRestaurant && (
          <Box className="app-stat-pill" style={{ minWidth: 0, maxWidth: 'calc(100% - 104px)' }}>
            <Text size="xs" fw={700} lineClamp={1}>
              {labels.following[locale]}: {focusedRestaurant.name}
            </Text>
          </Box>
        )}
      </Group>
    </Box>
  );
}
