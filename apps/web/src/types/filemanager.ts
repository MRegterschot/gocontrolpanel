export interface FileManager {
  url?: string;
  password?: string;
  health: boolean;
}

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  lastModified?: Date;
}

export interface File {
  value: string | ArrayBuffer;
  type: ContentType;
}

export type ContentType = "image" | "text" | "video";
