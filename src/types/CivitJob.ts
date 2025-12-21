// Types for Civit job status and photo management

export interface CivitJobStatus {
  scheduled: boolean;
  result: Array<{
    available: boolean;
    blobUrl: string;
  }>;
}

export interface CivitJobResult {
  photoBase64: string | null;
  scheduled: boolean;
  isLoading: boolean;
  error: Error | null;
}

export interface PhotoData {
  base64: string;
}
