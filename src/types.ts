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
