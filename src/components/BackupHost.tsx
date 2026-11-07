import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native';
import Icon from './Icon';
import { colors, shadow } from '../theme';
import { BackupError, downloadBackup, uploadBackup } from '../drive';
import type { Strings } from '../i18n';

type Phase = 'running' | 'done' | 'error';
interface View_ { mode: 'backup' | 'restore'; phase: Phase; pct: number; stage: string; message?: string; retry?: () => void }

let present: ((v: View_ | null) => void) | null = null;
const show = (v: View_ | null) => present?.(v);

function errText(e: unknown, t: Strings): string {
  const k = e instanceof BackupError ? e.kind : 'other';
  return k === 'network' ? t.bkNoNet : k === 'auth' ? t.bkAuth : k === 'nofile' ? t.bkNoFile : t.bkOther;
}

/** Manual backup with a WhatsApp-style progress dialog. */
export async function runBackup(getJson: () => string, t: Strings, onSuccess: (iso: string) => void): Promise<void> {
  const go = async () => {
    show({ mode: 'backup', phase: 'running', pct: 0.04, stage: t.bkPreparing });
    try {
      const json = getJson();
      await uploadBackup(
        json,
        p => show({ mode: 'backup', phase: 'running', pct: 0.2 + p * 0.78, stage: t.bkUploading }),
        s => show({ mode: 'backup', phase: 'running', pct: s === 'connect' ? 0.12 : 0.2, stage: s === 'connect' ? t.bkConnecting : t.bkUploading }),
      );
      onSuccess(new Date().toISOString());
      show({ mode: 'backup', phase: 'done', pct: 1, stage: t.bkDone, message: t.bkDoneMsg });
    } catch (e) {
      if (e instanceof BackupError && e.kind === 'cancelled') return show(null);
      show({ mode: 'backup', phase: 'error', pct: 0, stage: t.bkFailed, message: errText(e, t), retry: go });
    }
  };
  await go();
}

/** Silent daily backup: no dialog, never throws. */
export async function runAutoBackup(json: string, onSuccess: (iso: string) => void): Promise<void> {
  try { await uploadBackup(json); onSuccess(new Date().toISOString()); } catch { /* try again next time */ }
}

/** Download the Drive backup with progress; `apply` parses and installs it (false = unreadable). */
export async function runRestore(t: Strings, apply: (raw: string) => boolean): Promise<void> {
  const go = async () => {
    show({ mode: 'restore', phase: 'running', pct: 0.3, stage: t.rsDownloading });
    try {
      const raw = await downloadBackup();
      show({ mode: 'restore', phase: 'running', pct: 0.85, stage: t.rsWorking });
      if (!apply(raw)) return show({ mode: 'restore', phase: 'error', pct: 0, stage: t.bkFailed, message: t.rsBad });
      show({ mode: 'restore', phase: 'done', pct: 1, stage: t.rsDone, message: t.rsDoneMsg });
    } catch (e) {
      if (e instanceof BackupError && e.kind === 'cancelled') return show(null);
      show({ mode: 'restore', phase: 'error', pct: 0, stage: t.bkFailed, message: errText(e, t), retry: go });
    }
  };
  await go();
}

export function BackupHost({ t }: { t: Strings }) {
  const [v, setV] = useState<View_ | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    present = nv => {
      setV(nv);
      Animated.timing(fade, { toValue: nv ? 1 : 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    };
    return () => { present = null; };
  }, [fade]);

  useEffect(() => { if (v) Animated.timing(bar, { toValue: v.pct, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(); }, [v, bar]);
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  if (!v) return null;
  const running = v.phase === 'running';
  const err = v.phase === 'error';
  const accent = err ? colors.danger : colors.primary;
  const soft = err ? colors.dangerLight : colors.primaryLight;
  const pct = Math.round(v.pct * 100);

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => { if (!running) show(null); }}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(11,31,26,0.55)', opacity: fade, justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 28, padding: 26, alignItems: 'center', ...shadow.fab }}>
          <Animated.View style={{
            width: 76, height: 76, borderRadius: 38, backgroundColor: soft, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            transform: [{ scale: running ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) : 1 }],
          }}>
            <Icon name={err ? 'info' : v.phase === 'done' ? 'check' : v.mode === 'backup' ? 'cloud' : 'download'} size={36} color={accent} />
          </Animated.View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
            {running ? (v.mode === 'backup' ? t.bkWorking : t.rsWorking) : v.stage}
          </Text>
          {running ? (
            <>
              <Text style={{ color: colors.muted, fontSize: 14.5, marginTop: 6 }}>{v.stage}</Text>
              <View style={{ alignSelf: 'stretch', height: 10, borderRadius: 5, backgroundColor: colors.primaryLight, marginTop: 20, overflow: 'hidden' }}>
                <Animated.View style={{ height: 10, borderRadius: 5, backgroundColor: colors.primary, width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
              </View>
              <View style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color: colors.muted, fontSize: 12.5 }}>{t.bkKeepOpen}</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{pct}%</Text>
              </View>
            </>
          ) : (
            <>
              {v.message ? <Text style={{ fontSize: 14.5, lineHeight: 21, color: colors.muted, textAlign: 'center', marginTop: 8 }}>{v.message}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 22, alignSelf: 'stretch' }}>
                {err && v.retry ? (
                  <Pressable onPress={() => v.retry?.()} style={({ pressed }) => ({ flex: 1, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, opacity: pressed ? 0.85 : 1 })}>
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{t.bkRetry}</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => show(null)} style={({ pressed }) => ({ flex: 1, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: accent, opacity: pressed ? 0.85 : 1 })}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{err ? t.bkClose : t.ok}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}
