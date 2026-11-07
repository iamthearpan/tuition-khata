import React, { useState } from 'react';
import {
  Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { avatarPalette, colors, radius, shadow } from '../theme';
import Icon, { IconName } from './Icon';
import { CURRENCIES } from '../currency';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

type BtnKind = 'primary' | 'soft' | 'ghost' | 'danger';
export function Btn({
  title, onPress, kind = 'primary', icon, style,
}: { title: string; onPress: () => void; kind?: BtnKind; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const map: Record<BtnKind, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
    soft: { bg: colors.primaryLight, fg: colors.primary, border: colors.primaryLight },
    ghost: { bg: 'transparent', fg: colors.primary, border: colors.border },
    danger: { bg: colors.dangerLight, fg: colors.danger, border: colors.dangerLight },
  };
  const c = map[kind];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.btn, { backgroundColor: c.bg, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
        kind === 'primary' && shadow.card, style,
      ]}>
      {icon ? <Icon name={icon} size={19} color={c.fg} /> : null}
      <Text style={[s.btnText, { color: c.fg }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon, onPress, label, tint = colors.text, bg = colors.card, size = 42, style,
}: { icon: IconName; onPress: () => void; label: string; tint?: string; bg?: string; size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 },
        shadow.card, style,
      ]}>
      <Icon name={icon} size={size * 0.5} color={tint} />
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        onFocus={e => { setFocus(true); props.onFocus?.(e); }}
        onBlur={e => { setFocus(false); props.onBlur?.(e); }}
        style={[s.input, focus && { borderColor: colors.primary, backgroundColor: '#fff' }, error ? { borderColor: colors.danger } : null]}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, flexGrow: 0 }}>
      {children}
    </ScrollView>
  );
}

export function CurrencyPicker({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <ChipRow>
        {CURRENCIES.map(c => (
          <Chip key={c.code} label={`${c.symbol} ${c.code}`} selected={value === c.code} onPress={() => onChange(c.code)} />
        ))}
      </ChipRow>
    </View>
  );
}

export function Segmented<T extends string>({
  options, value, onChange,
}: { options: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  return (
    <View style={s.seg}>
      {options.map(o => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[s.segItem, on && s.segOn]}>
            <Text style={{ fontWeight: '700', fontSize: 14, color: on ? colors.primary : colors.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Header({
  title, subtitle, onBack, right, large,
}: { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode; large?: boolean }) {
  return (
    <View style={s.header}>
      {onBack ? <IconButton icon="back" label="Back" onPress={onBack} style={{ marginRight: 14 }} /> : null}
      <View style={{ flex: 1 }}>
        {subtitle ? <Text style={s.headerSub}>{subtitle}</Text> : null}
        <Text style={[s.headerTitle, large && { fontSize: 30 }]} numberOfLines={1}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{children}</Text>
      {right}
    </View>
  );
}

export function Avatar({ name, size = 46 }: { name: string; size?: number }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const p = avatarPalette[h % avatarPalette.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: p.fg, fontWeight: '800', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function Pill({ label, kind }: { label: string; kind: 'due' | 'paid' | 'partial' | 'muted' }) {
  const m = {
    due: { bg: colors.dangerLight, fg: colors.danger },
    paid: { bg: colors.successLight, fg: colors.success },
    partial: { bg: colors.accentLight, fg: '#A96A05' },
    muted: { bg: '#ECEFEE', fg: colors.muted },
  }[kind];
  return (
    <View style={{ backgroundColor: m.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}>
      <Text style={{ color: m.fg, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.fab, shadow.fab, { opacity: pressed ? 0.9 : 1 }]}>
      <Icon name="plus" size={22} color="#fff" strokeWidth={2.3} />
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Empty({ icon, title, text }: { icon: IconName; title: string; text?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 }}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon name={icon} size={38} color={colors.primary} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' }}>{title}</Text>
      {text ? <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 4 }}>{text}</Text> : null}
    </View>
  );
}

export function SettingRow({
  icon, title, subtitle, onPress, last,
}: { icon: IconName; title: string; subtitle?: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, opacity: pressed ? 0.7 : 1 },
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
        <Icon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 1 }}>{subtitle}</Text> : null}
      </View>
      <Icon name="chevron" size={18} color={colors.muted} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 12, ...shadow.card },
  btn: {
    flexDirection: 'row', gap: 8, paddingVertical: 15, paddingHorizontal: 20, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 1.5,
  },
  btnText: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 13, color: colors.muted, marginBottom: 7, fontWeight: '700', letterSpacing: 0.2 },
  input: {
    backgroundColor: '#F8FAF9', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: colors.text,
  },
  error: { color: colors.danger, fontSize: 12, marginTop: 5, fontWeight: '600' },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: '#fff', marginRight: 8,
  },
  seg: { flexDirection: 'row', backgroundColor: '#E6ECE9', borderRadius: radius.md, padding: 4 },
  segItem: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  segOn: { backgroundColor: '#fff', ...shadow.card },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, flexDirection: 'row', alignItems: 'center' },
  headerSub: { color: colors.muted, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  fab: {
    position: 'absolute', right: 20, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, paddingVertical: 15, paddingHorizontal: 22, borderRadius: radius.pill,
  },
});
