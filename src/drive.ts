import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from './config';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export const BACKUP_FILE = 'tuitionkhata-backup.json';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export type BackupErrorKind = 'cancelled' | 'network' | 'auth' | 'nofile' | 'other';
export class BackupError extends Error {
  constructor(public kind: BackupErrorKind, message?: string) { super(message ?? kind); }
}

export interface RemoteBackup { id: string; modifiedTime: string; size: number }

/** Multipart/related body for Drive uploads (metadata JSON + file content). */
export function buildMultipart(meta: object, content: string, boundary: string): string {
  return (
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${content}\r\n--${boundary}--`
  );
}

/** True when an automatic backup is due: signed in, enabled, and none in the last `hours`. */
export function autoBackupDue(s: { driveEmail: string; autoBackup: string; lastBackup: string }, now: Date, hours = 24): boolean {
  if (!s.driveEmail || s.autoBackup !== '1') return false;
  if (!s.lastBackup) return true;
  const last = Date.parse(s.lastBackup);
  return !Number.isFinite(last) || now.getTime() - last >= hours * 3600_000;
}

let configured = false;
function configure() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, scopes: [DRIVE_SCOPE] });
  configured = true;
}

function wrap(e: unknown): BackupError {
  if (e instanceof BackupError) return e;
  if (isErrorWithCode(e)) {
    if (e.code === statusCodes.SIGN_IN_CANCELLED) return new BackupError('cancelled');
    if (e.code === statusCodes.SIGN_IN_REQUIRED) return new BackupError('auth');
  }
  const msg = String((e as any)?.message ?? e);
  if (/network|timeout|offline|failed to connect|unable to resolve/i.test(msg)) return new BackupError('network', msg);
  return new BackupError('other', msg);
}

export async function signIn(): Promise<string> {
  try {
    configure();
    await GoogleSignin.hasPlayServices?.();
    const r: any = await GoogleSignin.signIn();
    if (r?.type === 'cancelled') throw new BackupError('cancelled');
    const email = r?.data?.user?.email;
    if (!email) throw new BackupError('auth');
    return email;
  } catch (e) { throw wrap(e); }
}

export async function signOut(): Promise<void> {
  try { configure(); await GoogleSignin.signOut(); } catch { /* ignore */ }
}

async function token(): Promise<string> {
  configure();
  try {
    if (!GoogleSignin.hasPreviousSignIn()) {
      const r: any = await GoogleSignin.signInSilently();
      if (r?.type === 'noSavedCredentialFound') throw new BackupError('auth');
    }
    const { accessToken } = await GoogleSignin.getTokens();
    return accessToken;
  } catch (e) { throw wrap(e); }
}

/** XHR so uploads report real progress (fetch cannot). */
function request(method: string, url: string, headers: Record<string, string>, body: string | undefined, onProgress?: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open(method, url);
    for (const [k, v] of Object.entries(headers)) x.setRequestHeader(k, v);
    x.timeout = 60_000;
    if (x.upload && onProgress) x.upload.onprogress = ev => { if (ev.lengthComputable && ev.total > 0) onProgress(ev.loaded / ev.total); };
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) return resolve(x.responseText);
      if (x.status === 401 || x.status === 403) return reject(new BackupError('auth', x.responseText));
      reject(new BackupError('other', `HTTP ${x.status}: ${x.responseText?.slice(0, 200)}`));
    };
    x.onerror = () => reject(new BackupError('network'));
    x.ontimeout = () => reject(new BackupError('network'));
    x.send(body);
  });
}

export async function findBackup(accessToken: string): Promise<RemoteBackup | null> {
  const q = encodeURIComponent(`name='${BACKUP_FILE}' and trashed=false`);
  const res = await request('GET', `${API}/files?spaces=appDataFolder&q=${q}&orderBy=modifiedTime desc&pageSize=1&fields=files(id,modifiedTime,size)`,
    { Authorization: `Bearer ${accessToken}` }, undefined);
  const f = JSON.parse(res).files?.[0];
  return f ? { id: f.id, modifiedTime: f.modifiedTime, size: Number(f.size) || 0 } : null;
}

/** Upload (create or replace) the single backup file. `onProgress` gets 0..1 for the upload itself. */
export async function uploadBackup(json: string, onProgress?: (p: number) => void, onStage?: (s: 'connect' | 'upload') => void): Promise<void> {
  try {
    onStage?.('connect');
    const tk = await token();
    const existing = await findBackup(tk);
    onStage?.('upload');
    const boundary = 'tk' + Date.now().toString(36);
    const meta = existing ? { name: BACKUP_FILE } : { name: BACKUP_FILE, parents: ['appDataFolder'] };
    const url = existing ? `${UPLOAD}/files/${existing.id}?uploadType=multipart` : `${UPLOAD}/files?uploadType=multipart`;
    await request(existing ? 'PATCH' : 'POST', url,
      { Authorization: `Bearer ${tk}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      buildMultipart(meta, json, boundary), onProgress);
  } catch (e) { throw wrap(e); }
}

export async function remoteInfo(): Promise<RemoteBackup | null> {
  try { return await findBackup(await token()); } catch (e) { throw wrap(e); }
}

export async function downloadBackup(): Promise<string> {
  try {
    const tk = await token();
    const f = await findBackup(tk);
    if (!f) throw new BackupError('nofile');
    return await request('GET', `${API}/files/${f.id}?alt=media`, { Authorization: `Bearer ${tk}` }, undefined);
  } catch (e) { throw wrap(e); }
}
