import * as Crypto from 'expo-crypto';
import { Snapshot, SnapshotTotals } from './types';

export function createSnapshot(totals: SnapshotTotals, notes?: string): Snapshot {
  const now = new Date();
  const dateISO = now.toISOString().split('T')[0];

  return {
    id: Crypto.randomUUID(),
    dateISO,
    totals,
    notes,
  };
}

export function shouldTakeSnapshot(snapshots: Snapshot[]): boolean {
  if (snapshots.length === 0) return true;
  const today = new Date().toISOString().split('T')[0];
  return !snapshots.some((s) => s.dateISO === today);
}
