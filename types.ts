export interface ImageMetadata {
  title: string;
  caption: string;
  description: string;
  altText: string;
  tags: string;
  author: string;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  metadata: ImageMetadata;
  thumbnail: string; // Base64 de uma versão reduzida da imagem
  fileName: string;
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  CONVERTING = 'CONVERTING',
  SAVING = 'SAVING',
  OPTIMIZING = 'OPTIMIZING'
}