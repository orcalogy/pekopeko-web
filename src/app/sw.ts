import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry } from 'serwist';
import { CacheFirst, ExpirationPlugin, Serwist } from 'serwist';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const llmRuntimeCache = new CacheFirst({
  cacheName: 'llm-runtime-assets',
  plugins: [
    new ExpirationPlugin({
      maxEntries: 48,
      maxAgeSeconds: 30 * 24 * 60 * 60,
      maxAgeFrom: 'last-used',
    }),
  ],
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) =>
        ['huggingface.co', 'hf.co', 'raw.githubusercontent.com'].some(
          (hostname) => url.hostname === hostname || url.hostname.endsWith(`.${hostname}`),
        ),
      handler: llmRuntimeCache,
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
