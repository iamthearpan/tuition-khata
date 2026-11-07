import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as DB from './db';
import { Adjustment, AppData, Batch, Payment, Settings, Student } from './types';
import { STRINGS, Strings } from './i18n';
import { DEFAULT_SETTINGS } from './backup';

export { parseBackup, exportBackup } from './backup';
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const DEFAULT_DATA: AppData = { batches: [], students: [], payments: [], adjustments: [], settings: DEFAULT_SETTINGS };

interface Ctx {
  ready: boolean;
  data: AppData;
  t: Strings;
  saveStudent: (s: Student) => void;
  deleteStudent: (id: string) => void;
  saveBatch: (b: Batch) => void;
  deleteBatch: (id: string) => void;
  savePayment: (p: Payment) => void;
  deletePayment: (id: string) => void;
  addAdjustments: (a: Adjustment[]) => void;
  deleteAdjustment: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  replaceAll: (d: AppData) => void;
}

const StoreContext = createContext<Ctx | null>(null);

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some(x => x.id === item.id) ? list.map(x => (x.id === item.id ? item : x)) : [...list, item];
}

const persist = (p: Promise<unknown>) => {
  p.catch(() => {});
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    DB.initDb()
      .then(DB.loadAll)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Write-through: update memory instantly, persist only the changed rows to SQLite.
  const saveStudent = useCallback((s: Student) => {
    setData(d => ({ ...d, students: upsert(d.students, s) }));
    persist(DB.dbSaveStudent(s));
  }, []);
  const deleteStudent = useCallback((id: string) => {
    setData(d => ({
      ...d,
      students: d.students.filter(s => s.id !== id),
      payments: d.payments.filter(p => p.studentId !== id),
      adjustments: d.adjustments.filter(a => a.studentId !== id),
    }));
    persist(DB.dbDeleteStudent(id));
  }, []);
  const saveBatch = useCallback((b: Batch) => {
    setData(d => ({ ...d, batches: upsert(d.batches, b) }));
    persist(DB.dbSaveBatch(b));
  }, []);
  const deleteBatch = useCallback((id: string) => {
    setData(d => ({
      ...d,
      batches: d.batches.filter(b => b.id !== id),
      students: d.students.map(s => (s.batchId === id ? { ...s, batchId: null } : s)),
    }));
    persist(DB.dbDeleteBatch(id));
  }, []);
  const savePayment = useCallback((p: Payment) => {
    setData(d => ({ ...d, payments: upsert(d.payments, p) }));
    persist(DB.dbSavePayment(p));
  }, []);
  const deletePayment = useCallback((id: string) => {
    setData(d => ({ ...d, payments: d.payments.filter(p => p.id !== id) }));
    persist(DB.dbDeletePayment(id));
  }, []);
  const addAdjustments = useCallback((list: Adjustment[]) => {
    setData(d => ({ ...d, adjustments: list.reduce((acc, a) => upsert(acc, a), d.adjustments) }));
    persist(DB.dbSaveAdjustments(list));
  }, []);
  const deleteAdjustment = useCallback((id: string) => {
    setData(d => ({ ...d, adjustments: d.adjustments.filter(a => a.id !== id) }));
    persist(DB.dbDeleteAdjustment(id));
  }, []);
  const updateSettings = useCallback((s: Partial<Settings>) => {
    setData(d => ({ ...d, settings: { ...d.settings, ...s } }));
    for (const [k, v] of Object.entries(s)) persist(DB.dbSaveSetting(k, String(v)));
  }, []);
  const replaceAll = useCallback((d: AppData) => {
    setData(d);
    persist(DB.dbReplaceAll(d));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ready, data, t: STRINGS[data.settings.lang],
      saveStudent, deleteStudent, saveBatch, deleteBatch, savePayment, deletePayment,
      addAdjustments, deleteAdjustment, updateSettings, replaceAll,
    }),
    [ready, data, saveStudent, deleteStudent, saveBatch, deleteBatch, savePayment, deletePayment, addAdjustments, deleteAdjustment, updateSettings, replaceAll],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreContext);
  if (!c) throw new Error('useStore outside StoreProvider');
  return c;
}
