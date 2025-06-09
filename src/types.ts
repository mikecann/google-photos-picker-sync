export interface MediaFile {
  filename: string;
  baseUrl: string;
  mimeType: string;
}

export interface MediaItem {
  id: string;
  createTime: string;
  type: "PHOTO" | "VIDEO";
  mediaFile: MediaFile;
}

export interface DownloadSettings {
  // Media filtering
  includePhotos: boolean;
  includeVideos: boolean;

  // Image settings
  imageQuality: "original" | "high" | "medium" | "low";
  imageMaxWidth?: number;
  imageMaxHeight?: number;
  imageCrop: boolean;

  // Video settings
  videoQuality: "original" | "high" | "thumbnail";
  videoRemoveOverlay: boolean;
}
