export interface ImageResult {
  url: string;
  width?: number;
  height?: number;
  source: 'og:image' | 'article-img' | 'json-data' | 'page-img' | 'carousel-img';
}

export interface ScraperResult {
  images: ImageResult[];
}

export interface ScraperError {
  code: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ScraperError;
}
