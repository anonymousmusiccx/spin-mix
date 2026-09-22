import type { PermissionState } from '@capacitor/core';

export interface PermissionStatus {
  audio: PermissionState;
}

export interface AudioMetadata {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  uri: string;
  mimeType: string;
  size: number;
}

export interface ListAudioFilesResult {
  files: AudioMetadata[];
}

export interface ReadAudioFileOptions {
  uri: string;
}

export interface ReadAudioFileResult {
  data: string; // base64-encoded audio bytes
  size?: number;
}

export interface AudioScannerPlugin {
  checkPermission(): Promise<PermissionStatus>;
  requestPermission(): Promise<PermissionStatus>;
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;
  listAudioFiles(): Promise<ListAudioFilesResult>;
  readAudioFile(options: ReadAudioFileOptions): Promise<ReadAudioFileResult>;
}
