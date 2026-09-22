export interface ScannedAudioFile {
  /** MediaStore row id, stable for the life of the file on-device */
  id: string;
  title: string;
  artist: string;
  /** Duration in milliseconds, as stored by MediaStore */
  durationMs: number;
  /** content:// URI - not a filesystem path, must be read via readAudioFile */
  uri: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ListAudioFilesResult {
  files: ScannedAudioFile[];
}

export interface ReadAudioFileOptions {
  uri: string;
}

export interface ReadAudioFileResult {
  /** Base64-encoded file bytes */
  data: string;
}

export interface PermissionStatus {
  audio: 'granted' | 'denied' | 'prompt';
}

export interface AudioScannerPlugin {
  /** Check current READ_MEDIA_AUDIO / READ_EXTERNAL_STORAGE permission state */
  checkPermissions(): Promise<PermissionStatus>;
  /** Trigger the OS runtime permission dialog */
  requestPermissions(): Promise<PermissionStatus>;
  /** Query MediaStore.Audio.Media for every audio file on device. Metadata only - fast. */
  listAudioFiles(): Promise<ListAudioFilesResult>;
  /** Read one file's raw bytes via ContentResolver, for local decodeAudioData(). */
  readAudioFile(options: ReadAudioFileOptions): Promise<ReadAudioFileResult>;
}
