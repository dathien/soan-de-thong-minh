import {
  AppSettings,
  AuditLogEntry,
  ExamDocument,
  ExamMatrix,
  ExamQuestion,
  ExamSpecification,
  TextbookLesson,
  UserDocument,
} from '../types';
import { TEXTBOOK_SEED_LESSONS } from '../data/textbookSeed';

const DB_NAME = 'soan_de_thong_minh_db';
const DB_VERSION = 1;

export type StoreName =
  | 'exams'
  | 'questionBank'
  | 'userDocuments'
  | 'textbookLessons'
  | 'matrices'
  | 'specifications'
  | 'settings'
  | 'auditLogs';

const ALL_STORES: StoreName[] = [
  'exams',
  'questionBank',
  'userDocuments',
  'textbookLessons',
  'matrices',
  'specifications',
  'settings',
  'auditLogs',
];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB không khả dụng trong trình duyệt này.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const storeName of ALL_STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Không thể mở cơ sở dữ liệu IndexedDB.'));
  });
  return dbPromise;
}

export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getByIdFromStore<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function putToStore<T extends { id: string }>(storeName: StoreName, item: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error(`Lỗi ghi dữ liệu vào ${storeName}`));
  });
}

export async function putManyToStore<T extends { id: string }>(storeName: StoreName, items: T[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error(`Lỗi ghi hàng loạt vào ${storeName}`));
  });
}

export async function deleteFromStore(storeName: StoreName, id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  role: 'teacher',
  teacherName: 'Giáo viên',
  departmentName: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO',
  schoolName: 'TRƯỜNG ............................................',
  subjectGroup: 'TỔ CHUYÊN MÔN',
  schoolYear: '2025 - 2026',
  defaultFontSizePt: 13,
  uiFontSize: 16,
  motionLevel: 'gentle',
  showBeginnerTips: true,
  autoSaveIntervalSec: 15,
  firebaseConfigured: false,
};

export async function initializeDatabase(): Promise<void> {
  const existingLessons = await getAllFromStore<TextbookLesson>('textbookLessons');
  if (existingLessons.length === 0) {
    await putManyToStore('textbookLessons', TEXTBOOK_SEED_LESSONS);
  } else {
    // Merge any newly added seed lessons that aren't in IDB yet without overwriting teacher/admin edits
    const existingIds = new Set(existingLessons.map((l) => l.id));
    const missing = TEXTBOOK_SEED_LESSONS.filter((l) => !existingIds.has(l.id));
    if (missing.length > 0) {
      await putManyToStore('textbookLessons', missing);
    }
  }

  const settings = await getByIdFromStore<AppSettings>('settings', 'default');
  if (!settings) {
    await putToStore('settings', DEFAULT_SETTINGS);
  }
}

export async function logAudit(action: string, detail: string): Promise<void> {
  try {
    const entry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      action,
      detail,
    };
    await putToStore('auditLogs', entry);
  } catch {
    // Non-blocking audit logging
  }
}

export interface FullBackupPayload {
  exportedAt: string;
  app: 'soan-de-thong-minh';
  version: 1;
  exams: ExamDocument[];
  questionBank: ExamQuestion[];
  userDocuments: UserDocument[];
  textbookLessons: TextbookLesson[];
  matrices: ExamMatrix[];
  specifications: ExamSpecification[];
  settings: AppSettings[];
}

export async function exportFullBackup(): Promise<FullBackupPayload> {
  const [exams, questionBank, userDocuments, textbookLessons, matrices, specifications, settings] =
    await Promise.all([
      getAllFromStore<ExamDocument>('exams'),
      getAllFromStore<ExamQuestion>('questionBank'),
      getAllFromStore<UserDocument>('userDocuments'),
      getAllFromStore<TextbookLesson>('textbookLessons'),
      getAllFromStore<ExamMatrix>('matrices'),
      getAllFromStore<ExamSpecification>('specifications'),
      getAllFromStore<AppSettings>('settings'),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    app: 'soan-de-thong-minh',
    version: 1,
    exams,
    questionBank,
    userDocuments,
    textbookLessons,
    matrices,
    specifications,
    settings,
  };
}

export async function importFullBackup(payload: FullBackupPayload): Promise<void> {
  if (!payload || payload.app !== 'soan-de-thong-minh') {
    throw new Error('Tệp sao lưu không đúng định dạng của SOẠN ĐỀ THÔNG MINH AI.');
  }
  await Promise.all([
    payload.exams?.length ? putManyToStore('exams', payload.exams) : Promise.resolve(),
    payload.questionBank?.length ? putManyToStore('questionBank', payload.questionBank) : Promise.resolve(),
    payload.userDocuments?.length ? putManyToStore('userDocuments', payload.userDocuments) : Promise.resolve(),
    payload.textbookLessons?.length ? putManyToStore('textbookLessons', payload.textbookLessons) : Promise.resolve(),
    payload.matrices?.length ? putManyToStore('matrices', payload.matrices) : Promise.resolve(),
    payload.specifications?.length ? putManyToStore('specifications', payload.specifications) : Promise.resolve(),
    payload.settings?.length ? putManyToStore('settings', payload.settings) : Promise.resolve(),
  ]);
  await logAudit('RESTORE_BACKUP', `Khôi phục dữ liệu từ bản sao lưu ${payload.exportedAt}`);
}
