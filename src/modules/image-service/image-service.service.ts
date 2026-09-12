// src/modules/image-service/image-service.service.ts
import { env } from "@config/env";
import { createModuleLogger } from "@shared/lib/logger";

import { getCached, setCached } from "./image-service.cache";
import type { ImageSearchResult } from "./image-service.types";

const log = createModuleLogger("image-service");

const PLACEHOLDER_IMAGE: ImageSearchResult = {
  url: "https://placehold.co/1920x1080/e2e8f0/64748b?text=Image+Not+Available",
  thumbnailUrl:
    "https://placehold.co/400x225/e2e8f0/64748b?text=Image+Not+Available",
  provider: "placeholder",
};

type UnsplashPhoto = {
  urls: { regular: string; thumb: string };
};

type UnsplashSearchResponse = {
  results: UnsplashPhoto[];
};

async function searchUnsplash(
  query: string,
): Promise<ImageSearchResult | null> {
  if (!env.UNSPLASH_ACCESS_KEY) return null;

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Unsplash API returned ${response.status}`);
  }

  const data = (await response.json()) as UnsplashSearchResponse;
  const photo = data.results[0];

  if (!photo) return null;

  return {
    url: photo.urls.regular,
    thumbnailUrl: photo.urls.thumb,
    provider: "unsplash",
  };
}

type PexelsPhoto = {
  src: { large: string; medium: string };
};

type PexelsSearchResponse = {
  photos: PexelsPhoto[];
};

async function searchPexels(query: string): Promise<ImageSearchResult | null> {
  if (!env.PEXELS_API_KEY) return null;

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url, {
    headers: { Authorization: env.PEXELS_API_KEY },
  });

  if (!response.ok) {
    throw new Error(`Pexels API returned ${response.status}`);
  }

  const data = (await response.json()) as PexelsSearchResponse;
  const photo = data.photos[0];

  if (!photo) return null;

  return {
    url: photo.src.large,
    thumbnailUrl: photo.src.medium,
    provider: "pexels",
  };
}

/**
 * Searches for a stock photo matching the given query. Tries Unsplash
 * first, falls back to Pexels on failure or empty results, and finally
 * falls back to a static placeholder image — this function NEVER
 * throws, since a missing image must never block deck generation
 * (see the FR-03.3 fallback rationale established when ai-engine.service.ts
 * was written: image search failures return 200 with a placeholder,
 * not an error).
 */
export async function searchImage(query: string): Promise<ImageSearchResult> {
  const cacheKey = `image-search:${query.toLowerCase().trim()}`;
  const cached = getCached<ImageSearchResult>(cacheKey);
  if (cached) return cached;

  try {
    const unsplashResult = await searchUnsplash(query);
    if (unsplashResult) {
      setCached(cacheKey, unsplashResult);
      return unsplashResult;
    }
  } catch (error) {
    log.warn(
      { action: "searchImage", provider: "unsplash", query, error },
      "Unsplash search failed, trying Pexels",
    );
  }

  try {
    const pexelsResult = await searchPexels(query);
    if (pexelsResult) {
      setCached(cacheKey, pexelsResult);
      return pexelsResult;
    }
  } catch (error) {
    log.warn(
      { action: "searchImage", provider: "pexels", query, error },
      "Pexels search failed, using placeholder",
    );
  }

  log.info(
    { action: "searchImage", query },
    "No results from either provider, using placeholder",
  );
  return PLACEHOLDER_IMAGE;
}
