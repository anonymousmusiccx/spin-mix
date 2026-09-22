import { registerPlugin } from '@capacitor/core';
import type { AudioScannerPlugin } from './definitions';

const AudioScanner = registerPlugin<AudioScannerPlugin>('AudioScanner');

export * from './definitions';
export { AudioScanner };
