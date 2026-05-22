export interface StreamUrls {
  '360p'?: string;
  '480p'?: string;
  '720p'?: string;
}

export interface VideoData {
  name: string;
  duration: string;
  size_formatted: string;
  quality: string;
  thumbnail?: string;
  fast_stream_url: StreamUrls;
  normal_dlink: string;
  zip_dlink?: string;
  type: string;
}
