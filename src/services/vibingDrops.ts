import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { VibingDrop } from '../types';

type CreateDropInput = Omit<VibingDrop, 'id' | 'createdAt' | 'expiresAt'>;

/**
 * 建立一個新的 Vibing Drop，並自動設定 expiresAt 為 24 小時後。
 * 回傳新建立的 document ID。
 */
export const createVibingDrop = async (input: CreateDropInput): Promise<string> => {
  const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
  const docRef = await addDoc(collection(db, 'vibing_drops'), {
    ...input,
    createdAt: serverTimestamp(),
    expiresAt,
  });
  return docRef.id;
};

/**
 * 刪除指定的 Vibing Drop（只有創建者才應該呼叫）。
 */
export const deleteVibingDrop = async (dropId: string): Promise<void> => {
  await deleteDoc(doc(db, 'vibing_drops', dropId));
};

/**
 * 即時監聽所有尚未過期的 Vibing Drops（expiresAt > 現在），
 * 回傳一個取消訂閱的 unsubscribe function。
 */
export const subscribeToActiveDrops = (
  callback: (drops: VibingDrop[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  const q = query(
    collection(db, 'vibing_drops'),
    where('expiresAt', '>', Timestamp.now()),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as VibingDrop)));
    },
    onError,
  );
};
