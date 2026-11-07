jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {}, isErrorWithCode: () => false, statusCodes: {},
}));
import { autoBackupDue, buildMultipart } from '../src/drive';
import { exportBackup, parseBackup, DEFAULT_SETTINGS } from '../src/backup';

test('multipart body has metadata then content and closing boundary', () => {
  const b = buildMultipart({ name: 'x' }, '{"a":1}', 'BND');
  expect(b.startsWith('--BND\r\n')).toBe(true);
  expect(b).toContain('{"name":"x"}');
  expect(b).toContain('{"a":1}');
  expect(b.endsWith('--BND--')).toBe(true);
});

test('auto backup due rules', () => {
  const now = new Date('2026-11-07T10:00:00Z');
  const base = { driveEmail: 'a@b.c', autoBackup: '1', lastBackup: '' };
  expect(autoBackupDue(base, now)).toBe(true);
  expect(autoBackupDue({ ...base, driveEmail: '' }, now)).toBe(false);
  expect(autoBackupDue({ ...base, autoBackup: '0' }, now)).toBe(false);
  expect(autoBackupDue({ ...base, lastBackup: '2026-11-07T02:00:00Z' }, now)).toBe(false);
  expect(autoBackupDue({ ...base, lastBackup: '2026-11-06T09:00:00Z' }, now)).toBe(true);
});

test('export omits drive state and round-trips', () => {
  const d = { batches: [], students: [], payments: [], adjustments: [], settings: { ...DEFAULT_SETTINGS, driveEmail: 'a@b.c', lastBackup: 'x' } };
  const raw = exportBackup(d);
  expect(raw).not.toContain('a@b.c');
  const back = parseBackup(raw)!;
  expect(back.settings.driveEmail).toBe('');
});
