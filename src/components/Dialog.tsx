import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native';
import Icon, { IconName } from './Icon';
import { colors, shadow } from '../theme';

type Tone = 'primary' | 'danger';
interface DialogAction { label: string; tone?: Tone | 'ghost'; onPress?: () => void }
interface DialogOptions { title: string; message?: string; icon?: IconName; tone?: Tone; actions: DialogAction[] }

let present: ((o: DialogOptions) => void) | null = null;
let t0 = { cancel: 'Cancel', ok: 'OK' };
export function setDialogLabels(cancel: string, ok: string) { t0 = { cancel, ok }; }

/** Generic dialog with any number of actions. */
export function showDialog(o: DialogOptions) { present?.(o); }

/** Two-button confirmation. `danger` paints the confirm button red. */
export function showConfirm(o: { title: string; message?: string; confirmLabel: string; onConfirm: () => void; icon?: IconName; danger?: boolean }) {
  showDialog({
    title: o.title, message: o.message, icon: o.icon ?? (o.danger ? 'trash' : 'info'), tone: o.danger ? 'danger' : 'primary',
    actions: [{ label: t0.cancel, tone: 'ghost' }, { label: o.confirmLabel, tone: o.danger ? 'danger' : 'primary', onPress: o.onConfirm }],
  });
}

/** Single-button notice. */
export function showInfo(title: string, message?: string, icon: IconName = 'info') {
  showDialog({ title, message, icon, actions: [{ label: t0.ok, tone: 'primary' }] });
}

/** Mount once near the app root. */
export function DialogHost() {
  const [opts, setOpts] = useState<DialogOptions | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    present = o => { setOpts(o); anim.setValue(0); Animated.timing(anim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); };
    return () => { present = null; };
  }, [anim]);

  const close = (after?: () => void) => {
    Animated.timing(anim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => { setOpts(null); after?.(); });
  };
  if (!opts) return null;
  const danger = opts.tone === 'danger';
  const accent = danger ? colors.danger : colors.primary;
  const soft = danger ? colors.dangerLight : colors.primaryLight;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => close()}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(11,31,26,0.5)', opacity: anim, justifyContent: 'center', padding: 24 }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => close()} accessibilityLabel="Dismiss" />
        <Animated.View style={{
          backgroundColor: '#fff', borderRadius: 28, padding: 24, alignItems: 'center', ...shadow.fab,
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
        }}>
          {opts.icon ? (
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: soft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Icon name={opts.icon} size={28} color={accent} />
            </View>
          ) : null}
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' }}>{opts.title}</Text>
          {opts.message ? <Text style={{ fontSize: 14.5, lineHeight: 21, color: colors.muted, textAlign: 'center', marginTop: 8 }}>{opts.message}</Text> : null}
          <View style={{ flexDirection: opts.actions.length > 2 ? 'column' : 'row', gap: 10, marginTop: 22, alignSelf: 'stretch' }}>
            {opts.actions.map((a, i) => {
              const tone = a.tone ?? 'primary';
              const bg = tone === 'primary' ? colors.primary : tone === 'danger' ? colors.danger : colors.bg;
              const fg = tone === 'ghost' ? colors.text : '#fff';
              return (
                <Pressable key={i} onPress={() => close(a.onPress)} accessibilityRole="button"
                  style={({ pressed }) => ({ flex: opts.actions.length > 2 ? undefined : 1, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, opacity: pressed ? 0.85 : 1, paddingHorizontal: 12 })}>
                  <Text style={{ color: fg, fontWeight: '800', fontSize: 15 }} numberOfLines={2}>{a.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
