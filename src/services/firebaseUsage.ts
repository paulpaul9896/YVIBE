import {
  collection,
  doc,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

/** Firebase Spark plan Firestore storage limit */
export const SPARK_FIRESTORE_LIMIT_BYTES = 1024 * 1024 * 1024;

export interface UsageBreakdown {
  groups: number;
  members: number;
  markers: number;
  reviews: number;
  drops: number;
  users: number;
  images: number;
}

export interface FirebaseUsageEstimate {
  totalBytes: number;
  documentCount: number;
  breakdown: UsageBreakdown;
  scannedAt: Date;
}

function docSize(data: Record<string, unknown>, docId?: string): number {
  const payload = docId ? { id: docId, ...data } : data;
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

function estimateImageFieldBytes(data: Record<string, unknown>): number {
  let bytes = 0;
  for (const key of ['imageUrl', 'imageUrls', 'userAvatar']) {
    const val = data[key];
    if (typeof val === 'string' && (val.startsWith('data:') || val.length > 200)) {
      bytes += val.length;
    } else if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'string' && (item.startsWith('data:') || item.length > 200)) {
          bytes += item.length;
        }
      }
    }
  }
  return bytes;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getUsagePercent(totalBytes: number): number {
  return Math.min(100, (totalBytes / SPARK_FIRESTORE_LIMIT_BYTES) * 100);
}

export async function estimateFirebaseUsage(
  groupIds: string[],
  userId: string,
): Promise<FirebaseUsageEstimate> {
  const breakdown: UsageBreakdown = {
    groups: 0,
    members: 0,
    markers: 0,
    reviews: 0,
    drops: 0,
    users: 0,
    images: 0,
  };
  let documentCount = 0;

  const userSnap = await getDoc(doc(db, 'users', userId));
  if (userSnap.exists()) {
    breakdown.users += docSize(userSnap.data() as Record<string, unknown>, userSnap.id);
    documentCount += 1;
  }

  for (const groupId of groupIds) {
    const groupSnap = await getDoc(doc(db, 'groups', groupId));
    if (groupSnap.exists()) {
      breakdown.groups += docSize(groupSnap.data() as Record<string, unknown>, groupSnap.id);
      documentCount += 1;
    }

    const membersSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
    membersSnap.forEach(memberDoc => {
      breakdown.members += docSize(memberDoc.data() as Record<string, unknown>, memberDoc.id);
      documentCount += 1;
    });

    const markersSnap = await getDocs(collection(db, 'groups', groupId, 'markers'));
    for (const markerDoc of markersSnap.docs) {
      const data = markerDoc.data() as Record<string, unknown>;
      breakdown.markers += docSize(data, markerDoc.id);
      breakdown.images += estimateImageFieldBytes(data);
      documentCount += 1;

      const reviewsSnap = await getDocs(
        collection(db, 'groups', groupId, 'markers', markerDoc.id, 'reviews'),
      );
      reviewsSnap.forEach(reviewDoc => {
        breakdown.reviews += docSize(reviewDoc.data() as Record<string, unknown>, reviewDoc.id);
        documentCount += 1;
      });
    }
  }

  const dropsSnap = await getDocs(collection(db, 'vibing_drops'));
  dropsSnap.forEach(dropDoc => {
    const data = dropDoc.data() as Record<string, unknown>;
    breakdown.drops += docSize(data, dropDoc.id);
    breakdown.images += estimateImageFieldBytes(data);
    documentCount += 1;
  });

  const totalBytes =
    breakdown.groups +
    breakdown.members +
    breakdown.markers +
    breakdown.reviews +
    breakdown.drops +
    breakdown.users;

  return {
    totalBytes,
    documentCount,
    breakdown,
    scannedAt: new Date(),
  };
}
