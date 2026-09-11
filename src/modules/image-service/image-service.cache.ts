// src/modules/image-service/image-service.cache.ts

/**
 * Simple in-memory cache for image search results, keyed by query
 * string. Many UMKM in similar categories will generate similar
 * imageQuery values (e.g. "coffee shop interior"), so caching avoids
 * redundant API calls to Unsplash/Pexels within the cache TTL — see
 * the cost-saving rationale from the original architecture plan.
 *
 * In-memory only: acceptable for a single-instance MVP deployment.
 * If the service is ever horizontally scaled, this should move to
 * Redis (already planned as an optional dependency for BullMQ).
 */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value as T;
}

export function setCached<T>(key: string, value: T): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}
