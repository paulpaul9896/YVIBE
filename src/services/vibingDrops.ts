import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  limit,
  getDocs,
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

/** 每次最多清理幾個過期 drop，避免一次寫入太多 */
const CLEANUP_BATCH_SIZE = 50;
const CLEANUP_MAX_BATCHES = 5;
/** 同一裝置最少隔幾分鐘再跑背景清理（避免每次開 app 狂刪） */
const CLEANUP_THROTTLE_MS = 15 * 60 * 1000;
const CLEANUP_TS_KEY = 'yvibe_drop_cleanup_at';

/**
 * 刪除一批已過期的 Vibing Drops（best-effort，靜默失敗）。
 * 回傳本批刪除數量。
 */
export const cleanupExpiredDrops = async (): Promise<number> => {
  const q = query(
    collection(db, 'vibing_drops'),
    where('expiresAt', '<=', Timestamp.now()),
    limit(CLEANUP_BATCH_SIZE),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;

  const results = await Promise.allSettled(
    snapshot.docs.map(d => deleteDoc(d.ref)),
  );
  return results.filter(r => r.status === 'fulfilled').length;
};

type CleanupOptions = {
  /** 略過節流（例如剛建立 drop 後） */
  force?: boolean;
  /** 最多跑幾批，每批最多 CLEANUP_BATCH_SIZE 個 */
  maxBatches?: number;
};

/**
 * 順手清理過期 drops：可節流、可多批，適合 app 啟動 / 回到前景 / 建立 drop 後呼叫。
 */
export const runExpiredDropCleanup = async (options: CleanupOptions = {}): Promise<number> => {
  const { force = false, maxBatches = CLEANUP_MAX_BATCHES } = options;

  if (!force && typeof sessionStorage !== 'undefined') {
    const last = sessionStorage.getItem(CLEANUP_TS_KEY);
    if (last && Date.now() - Number(last) < CLEANUP_THROTTLE_MS) {
      return 0;
    }
  }

  let total = 0;
  for (let i = 0; i < maxBatches; i++) {
    const deleted = await cleanupExpiredDrops();
    total += deleted;
    if (deleted === 0) break;
  }

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(CLEANUP_TS_KEY, String(Date.now()));
  }
  return total;
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
