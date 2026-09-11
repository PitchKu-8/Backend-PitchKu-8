// src/modules/image-service/image-service.types.ts
export type ImageSearchResult = {
  url: string;
  thumbnailUrl: string;
  provider: "unsplash" | "pexels" | "placeholder";
};
