import { EventEmitter } from 'events';
import type { ScanStage } from '../types';

const progressStore = new Map<string, EventEmitter>();
const latestStage = new Map<string, ScanStage>();

export function getScanEmitter(scanId: string): EventEmitter {
  if (!progressStore.has(scanId)) {
    progressStore.set(scanId, new EventEmitter());
  }
  return progressStore.get(scanId)!;
}

export function emitScanProgress(scanId: string, stage: ScanStage): void {
  latestStage.set(scanId, stage);
  const emitter = getScanEmitter(scanId);
  emitter.emit('progress', stage);
}

export function getLatestProgress(scanId: string): ScanStage | undefined {
  return latestStage.get(scanId);
}

export function cleanupScan(scanId: string): void {
  const emitter = progressStore.get(scanId);
  if (emitter) {
    emitter.removeAllListeners();
    progressStore.delete(scanId);
  }
  latestStage.delete(scanId);
}
