import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AuditLog, AuditAction } from '../types';

const COLLECTION = 'auditLogs';

export const auditService = {
  async log(params: {
    actorId: string;
    actorName: string;
    action: AuditAction;
    targetType: string;
    targetId: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await addDoc(collection(db, COLLECTION), {
        actorId: params.actorId,
        actorName: params.actorName,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: params.details ?? {},
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      // Audit logging is best-effort — never block the main operation
      console.error('Audit log failed:', err);
    }
  },

  async getRecent(count = 50): Promise<AuditLog[]> {
    const q = query(
      collection(db, COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(count)
    );
    const snaps = await getDocs(q);
    return snaps.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLog);
  },
};
