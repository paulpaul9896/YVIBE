import {
  collection,
  doc,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

export const BACKUP_VERSION = 1;

export type TribeBackupReview = { id: string; [key: string]: unknown };
export type TribeBackupMarker = {
  id: string;
  reviews: TribeBackupReview[];
  [key: string]: unknown;
};
export type TribeBackupMember = { id: string; [key: string]: unknown };
export type TribeBackupEntry = {
  group: { id: string; [key: string]: unknown };
  members: TribeBackupMember[];
  markers: TribeBackupMarker[];
};
export type TribeBackupFile = {
  version: number;
  exportedAt: string;
  userId: string;
  tribeCount: number;
  markerCount: number;
  tribes: TribeBackupEntry[];
};

function serializeFirestoreValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'object') {
    const maybeTs = value as { toDate?: () => Date; toMillis?: () => number };
    if (typeof maybeTs.toDate === 'function') {
      return maybeTs.toDate().toISOString();
    }
    if (typeof maybeTs.toMillis === 'function') {
      return new Date(maybeTs.toMillis()).toISOString();
    }
    if (Array.isArray(value)) {
      return value.map(serializeFirestoreValue);
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        serializeFirestoreValue(val),
      ]),
    );
  }
  return value;
}

function docToRecord(id: string, data: Record<string, unknown>) {
  return serializeFirestoreValue({ id, ...data }) as Record<string, unknown> & { id: string };
}

export async function buildTribesBackup(
  groupIds: string[],
  userId: string,
): Promise<TribeBackupFile> {
  const tribes: TribeBackupEntry[] = [];
  let markerCount = 0;

  for (const groupId of groupIds) {
    const groupSnap = await getDoc(doc(db, 'groups', groupId));
    if (!groupSnap.exists()) continue;

    const membersSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
    const members = membersSnap.docs.map(memberDoc =>
      docToRecord(memberDoc.id, memberDoc.data() as Record<string, unknown>),
    ) as TribeBackupMember[];

    const markersSnap = await getDocs(collection(db, 'groups', groupId, 'markers'));
    const markers: TribeBackupMarker[] = [];

    for (const markerDoc of markersSnap.docs) {
      const reviewsSnap = await getDocs(
        collection(db, 'groups', groupId, 'markers', markerDoc.id, 'reviews'),
      );
      const reviews = reviewsSnap.docs.map(reviewDoc =>
        docToRecord(reviewDoc.id, reviewDoc.data() as Record<string, unknown>),
      ) as TribeBackupReview[];

      const markerRecord = docToRecord(
        markerDoc.id,
        markerDoc.data() as Record<string, unknown>,
      ) as TribeBackupMarker;

      markers.push({
        ...markerRecord,
        reviews,
      });
      markerCount += 1;
    }

    tribes.push({
      group: docToRecord(groupSnap.id, groupSnap.data() as Record<string, unknown>) as TribeBackupEntry['group'],
      members,
      markers,
    });
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    userId,
    tribeCount: tribes.length,
    markerCount,
    tribes,
  };
}

export function downloadTribeBackupJson(backup: TribeBackupFile) {
  const date = new Date().toISOString().slice(0, 10);
  const filename = `yvibe-tribes-backup-${date}.json`;
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return filename;
}
