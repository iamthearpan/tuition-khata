import { open, DB } from '@op-engineering/op-sqlite';
import { Adjustment, AppData, Batch, Payment, Settings, Student } from './types';
import { isValidDay, todayDay } from './dates';

// Fully offline on-device SQLite database. Nothing ever leaves the phone.
let db: DB | null = null;

const DEFAULT_SETTINGS: Settings = { lang: 'en', teacherName: '', defaultCurrency: 'INR', graceDays: 7, phoneCode: '91', paymentNote: '', driveEmail: '', autoBackup: '1', lastBackup: '' };
const SCHEMA_VERSION = 2;

function conn(): DB {
  if (!db) {
    db = open({ name: 'tuition_khata.db' });
  }
  return db;
}

export async function initDb(): Promise<void> {
  const d = conn();
  await d.execute('PRAGMA foreign_keys = ON');
  await d.execute('PRAGMA journal_mode = WAL');
  const v = Number((await d.execute('PRAGMA user_version')).rows[0]?.user_version ?? 0);
  if (v < 1) {
    await d.transaction(async tx => {
      await tx.execute(`CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '',
        fee REAL NOT NULL, currency TEXT NOT NULL)`);
      await tx.execute(`CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
        guardian TEXT NOT NULL DEFAULT '', batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL,
        fee REAL NOT NULL, currency TEXT NOT NULL, join_month TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1)`);
      await tx.execute(`CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY NOT NULL, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        amount REAL NOT NULL, date TEXT NOT NULL, for_month TEXT NOT NULL, note TEXT NOT NULL DEFAULT '')`);
      await tx.execute('CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id)');
      await tx.execute('CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)');
      await tx.execute('CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch_id)');
      await tx.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)');
    });
    await d.execute('PRAGMA user_version = 1');
  }
  if (v < 2) {
    await d.transaction(async tx => {
      await tx.execute("ALTER TABLE students ADD COLUMN join_date TEXT NOT NULL DEFAULT ''");
      await tx.execute('ALTER TABLE students ADD COLUMN end_date TEXT');
      await tx.execute("ALTER TABLE students ADD COLUMN billing_mode TEXT NOT NULL DEFAULT 'cycle'");
      // Data from v1 was billed per whole calendar month starting on the 1st.
      await tx.execute("UPDATE students SET join_date = join_month || '-01', billing_mode = 'full'");
      // v1 payments were always applied oldest-first: keep that behaviour (NULL target stored as '').
      await tx.execute("UPDATE payments SET for_month = ''");
      await tx.execute(`CREATE TABLE IF NOT EXISTS fee_changes (
        student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        month TEXT NOT NULL, amount REAL NOT NULL, PRIMARY KEY (student_id, month))`);
      await tx.execute(`CREATE TABLE IF NOT EXISTS adjustments (
        id TEXT PRIMARY KEY NOT NULL, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        month TEXT NOT NULL, amount REAL NOT NULL, note TEXT NOT NULL DEFAULT '')`);
      await tx.execute('CREATE INDEX IF NOT EXISTS idx_adjustments_student ON adjustments(student_id)');
    });
    await d.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
}

export async function loadAll(): Promise<AppData> {
  const d = conn();
  const [b, s, p, st, fc, ad] = await Promise.all([
    d.execute('SELECT * FROM batches ORDER BY name'),
    d.execute('SELECT * FROM students'),
    d.execute('SELECT * FROM payments ORDER BY date'),
    d.execute('SELECT key, value FROM settings'),
    d.execute('SELECT * FROM fee_changes ORDER BY month'),
    d.execute('SELECT * FROM adjustments'),
  ]);
  const settings: Settings = { ...DEFAULT_SETTINGS };
  for (const r of st.rows) {
    const k = String(r.key);
    const v = String(r.value);
    if (k === 'graceDays') settings.graceDays = Number.isFinite(Number(v)) ? Number(v) : DEFAULT_SETTINGS.graceDays;
    else (settings as any)[k] = v;
  }
  const changes = new Map<string, { month: string; amount: number }[]>();
  for (const r of fc.rows) {
    const id = String(r.student_id);
    const list = changes.get(id) ?? [];
    list.push({ month: String(r.month), amount: Number(r.amount) });
    changes.set(id, list);
  }
  return {
    batches: b.rows.map(r => ({
      id: String(r.id), name: String(r.name), subject: String(r.subject), fee: Number(r.fee), currency: String(r.currency),
    })),
    students: s.rows.map(r => {
      const jd = String(r.join_date || '');
      return {
        id: String(r.id), name: String(r.name), phone: String(r.phone), guardian: String(r.guardian),
        batchId: r.batch_id == null ? null : String(r.batch_id), fee: Number(r.fee), currency: String(r.currency),
        feeChanges: changes.get(String(r.id)) ?? [],
        joinDate: isValidDay(jd) ? jd : `${String(r.join_month)}-01`,
        endDate: r.end_date == null || r.end_date === '' ? null : String(r.end_date),
        billing: (['cycle', 'prorate', 'full'].includes(String(r.billing_mode)) ? String(r.billing_mode) : 'cycle') as Student['billing'],
      };
    }),
    payments: p.rows.map(r => ({
      id: String(r.id), studentId: String(r.student_id), amount: Number(r.amount), date: String(r.date),
      forMonth: r.for_month ? String(r.for_month) : null, note: String(r.note),
    })),
    adjustments: ad.rows.map(r => ({
      id: String(r.id), studentId: String(r.student_id), month: String(r.month), amount: Number(r.amount), note: String(r.note),
    })),
    settings,
  };
}

export async function dbSaveBatch(x: Batch) {
  await conn().execute(
    `INSERT INTO batches (id,name,subject,fee,currency) VALUES (?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, subject=excluded.subject, fee=excluded.fee, currency=excluded.currency`,
    [x.id, x.name, x.subject, x.fee, x.currency],
  );
}
export async function dbDeleteBatch(id: string) {
  await conn().execute('DELETE FROM batches WHERE id = ?', [id]);
}
const STUDENT_UPSERT = `INSERT INTO students
  (id,name,phone,guardian,batch_id,fee,currency,join_month,active,join_date,end_date,billing_mode)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone, guardian=excluded.guardian,
    batch_id=excluded.batch_id, fee=excluded.fee, currency=excluded.currency, join_month=excluded.join_month,
    active=excluded.active, join_date=excluded.join_date, end_date=excluded.end_date, billing_mode=excluded.billing_mode`;

const studentParams = (x: Student) => [
  x.id, x.name, x.phone, x.guardian, x.batchId, x.fee, x.currency, x.joinDate.slice(0, 7),
  !x.endDate || x.endDate >= todayDay() ? 1 : 0, x.joinDate, x.endDate, x.billing,
];

export async function dbSaveStudent(x: Student) {
  await conn().transaction(async tx => {
    await tx.execute(STUDENT_UPSERT, studentParams(x));
    await tx.execute('DELETE FROM fee_changes WHERE student_id = ?', [x.id]);
    for (const c of x.feeChanges) {
      await tx.execute('INSERT INTO fee_changes (student_id, month, amount) VALUES (?,?,?)', [x.id, c.month, c.amount]);
    }
  });
}
export async function dbDeleteStudent(id: string) {
  await conn().execute('DELETE FROM students WHERE id = ?', [id]); // payments, fee changes, adjustments cascade
}
export async function dbSavePayment(x: Payment) {
  await conn().execute(
    `INSERT INTO payments (id,student_id,amount,date,for_month,note) VALUES (?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET amount=excluded.amount, date=excluded.date, for_month=excluded.for_month, note=excluded.note`,
    [x.id, x.studentId, x.amount, x.date, x.forMonth ?? '', x.note],
  );
}
export async function dbDeletePayment(id: string) {
  await conn().execute('DELETE FROM payments WHERE id = ?', [id]);
}
export async function dbSaveAdjustments(list: Adjustment[]) {
  await conn().transaction(async tx => {
    for (const a of list) {
      await tx.execute(
        `INSERT INTO adjustments (id,student_id,month,amount,note) VALUES (?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET month=excluded.month, amount=excluded.amount, note=excluded.note`,
        [a.id, a.studentId, a.month, a.amount, a.note],
      );
    }
  });
}
export async function dbDeleteAdjustment(id: string) {
  await conn().execute('DELETE FROM adjustments WHERE id = ?', [id]);
}
export async function dbSaveSetting(key: string, value: string) {
  await conn().execute(
    'INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, value],
  );
}

/** Replace the whole database (used by backup restore), atomically. */
export async function dbReplaceAll(data: AppData) {
  await conn().transaction(async tx => {
    for (const t of ['adjustments', 'fee_changes', 'payments', 'students', 'batches', 'settings']) {
      await tx.execute(`DELETE FROM ${t}`);
    }
    for (const b of data.batches)
      await tx.execute('INSERT INTO batches (id,name,subject,fee,currency) VALUES (?,?,?,?,?)', [b.id, b.name, b.subject, b.fee, b.currency]);
    for (const x of data.students) {
      await tx.execute(STUDENT_UPSERT, studentParams(x));
      for (const c of x.feeChanges)
        await tx.execute('INSERT INTO fee_changes (student_id, month, amount) VALUES (?,?,?)', [x.id, c.month, c.amount]);
    }
    for (const p of data.payments)
      await tx.execute('INSERT INTO payments (id,student_id,amount,date,for_month,note) VALUES (?,?,?,?,?,?)', [p.id, p.studentId, p.amount, p.date, p.forMonth ?? '', p.note]);
    for (const a of data.adjustments)
      await tx.execute('INSERT INTO adjustments (id,student_id,month,amount,note) VALUES (?,?,?,?,?)', [a.id, a.studentId, a.month, a.amount, a.note]);
    for (const [k, v] of Object.entries(data.settings))
      await tx.execute('INSERT INTO settings (key,value) VALUES (?,?)', [k, String(v)]);
  });
}
