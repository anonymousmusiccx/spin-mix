import { registerPlugin, WebPlugin } from '@capacitor/core';
import type {
  AudioScannerPlugin,
  PermissionStatus,
  ListAudioFilesResult,
  ReadAudioFileOptions,
  ReadAudioFileResult
} from './definitions';

export class AudioScannerWeb extends WebPlugin implements AudioScannerPlugin {
  async checkPermission(): Promise<PermissionStatus> {
    return { audio: 'granted' };
  }

  async requestPermission(): Promise<PermissionStatus> {
    return { audio: 'granted' };
  }

  async checkPermissions(): Promise<PermissionStatus> {
    return { audio: 'granted' };
  }

  async requestPermissions(): Promise<PermissionStatus> {
    return { audio: 'granted' };
  }

  async listAudioFiles(): Promise<ListAudioFilesResult> {
    // In web browser preview, MediaStore is not available; local file picker serves as fallback
    return { files: [] };
  }

  async readAudioFile(options: ReadAudioFileOptions): Promise<ReadAudioFileResult> {
    throw new Error(`Web readAudioFile is not supported for URI: ${options.uri}`);
  }
}

export const AudioScanner = registerPlugin<AudioScannerPlugin>('AudioScanner', {
  web: () => new AudioScannerWeb()
});
