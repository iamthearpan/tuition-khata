import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native';
import Icon from './Icon';
import { colors, radius, shadow } from '../theme';
import { addMonths, daysInMonth, dayLabel, isValidDay, isValidMonth, monthKey, monthLabel, todayDay, ymd } from '../dates';

type Lang = 'bn' | 'en';

const WEEK: Record<Lang, string[]> = {
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  bn: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'],
};
const MONTH_SHORT: Record<Lang, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  bn: ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'],
};

/** Cells for a month grid: leading blanks (null) then day numbers. Weeks start on Sunday. */
export function monthGrid(y: number, m: number): (number | null)[] {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const cells: (number | null)[] = Array(first).fill(null);
  for (let d = 1; d <= daysInMonth(y, m); d++) cells.push(d);
  return cells;
}

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mode?: 'day' | 'month';
  lang: Lang;
  error?: string;
  /** Earliest selectable value (inclusive), same format as `value`. */
  min?: string;
  todayLabel: string;
  cancelLabel: string;
}

export function DateField({ label, value, onChange, mode = 'day', lang, error, min, todayLabel, cancelLabel }: Props) {
  const [open, setOpen] = useState(false);
  const valid = mode === 'day' ? isValidDay(value) : isValidMonth(value);
  const shown = !valid ? value : mode === 'day' ? dayLabel(value.trim()) : monthLabel(value, lang);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 7, fontWeight: '700', letterSpacing: 0.2 }}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown}`}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAF9', borderWidth: 1.5,
          borderColor: error ? colors.danger : colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13,
          opacity: pressed ? 0.85 : 1,
        })}>
        <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>{shown}</Text>
        <Icon name="calendar" size={20} color={colors.primary} />
      </Pressable>
      {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 5, fontWeight: '600' }}>{error}</Text> : null}
      {open ? (
        <PickerSheet
          mode={mode} lang={lang} value={valid ? value.trim() : mode === 'day' ? todayDay() : monthKey()} min={min}
          todayLabel={todayLabel} cancelLabel={cancelLabel}
          onClose={() => setOpen(false)} onPick={v => { onChange(v); setOpen(false); }}
        />
      ) : null}
    </View>
  );
}

function PickerSheet({ mode, lang, value, min, todayLabel, cancelLabel, onClose, onPick }: {
  mode: 'day' | 'month'; lang: Lang; value: string; min?: string; todayLabel: string; cancelLabel: string;
  onClose: () => void; onPick: (v: string) => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(anim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [anim]);

  const [vy, vm] = value.split('-').map(Number);
  const [year, setYear] = useState(vy);
  const [month, setMonth] = useState(vm);
  const today = todayDay();
  const thisMonth = monthKey();

  const cells = useMemo(() => monthGrid(year, month), [year, month]);
  const step = (n: number) => {
    const k = addMonths(`${year}-${String(month).padStart(2, '0')}`, n).split('-').map(Number);
    setYear(k[0]); setMonth(k[1]);
  };

  const dayDisabled = (d: number) => !!min && ymd(year, month, d) < min;
  const monthDisabled = (m: number) => !!min && `${year}-${String(m).padStart(2, '0')}` < min.slice(0, 7);
  const prevDisabled = mode === 'day'
    ? !!min && `${year}-${String(month).padStart(2, '0')}` <= min.slice(0, 7)
    : !!min && year <= Number(min.slice(0, 4));

  const close = (after?: () => void) => {
    Animated.timing(anim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => after?.());
  };

  const Arrow = ({ dir, onPress, disabled }: { dir: -1 | 1; onPress: () => void; disabled?: boolean }) => (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} accessibilityRole="button" accessibilityLabel={dir < 0 ? 'Previous' : 'Next'}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}>
      <View style={{ transform: [{ rotate: dir < 0 ? '180deg' : '0deg' }] }}><Icon name="chevron" size={18} color={colors.text} /></View>
    </Pressable>
  );

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => close(onClose)}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(11,31,26,0.5)', opacity: anim, justifyContent: 'center', padding: 20 }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => close(onClose)} accessibilityLabel="Dismiss" />
        <Animated.View style={{ backgroundColor: '#fff', borderRadius: 28, padding: 18, ...shadow.fab, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Arrow dir={-1} onPress={() => (mode === 'day' ? step(-1) : setYear(year - 1))} disabled={prevDisabled} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
              {mode === 'day' ? monthLabel(`${year}-${String(month).padStart(2, '0')}`, lang) : String(year)}
            </Text>
            <Arrow dir={1} onPress={() => (mode === 'day' ? step(1) : setYear(year + 1))} />
          </View>

          {mode === 'day' ? (
            <>
              <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                {WEEK[lang].map(w => (
                  <Text key={w} style={{ flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: '700', color: colors.muted }}>{w}</Text>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {cells.map((d, i) => {
                  if (d === null) return <View key={'b' + i} style={{ width: '14.2857%', height: 44 }} />;
                  const iso = ymd(year, month, d);
                  const sel = iso === value;
                  const isToday = iso === today;
                  const off = dayDisabled(d);
                  return (
                    <Pressable key={iso} disabled={off} onPress={() => close(() => onPick(iso))} accessibilityRole="button" accessibilityLabel={dayLabel(iso)}
                      style={{ width: '14.2857%', height: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{
                        width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: sel ? colors.primary : 'transparent',
                        borderWidth: isToday && !sel ? 1.5 : 0, borderColor: colors.primary,
                      }}>
                        <Text style={{ fontSize: 15, fontWeight: sel || isToday ? '800' : '600', color: sel ? '#fff' : off ? '#C3CDC9' : colors.text }}>{d}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {MONTH_SHORT[lang].map((name, i) => {
                const key = `${year}-${String(i + 1).padStart(2, '0')}`;
                const sel = key === value;
                const off = monthDisabled(i + 1);
                return (
                  <Pressable key={key} disabled={off} onPress={() => close(() => onPick(key))} accessibilityRole="button"
                    style={{ width: '33.333%', padding: 5 }}>
                    <View style={{
                      height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: sel ? colors.primary : colors.bg, borderWidth: key === thisMonth && !sel ? 1.5 : 0, borderColor: colors.primary,
                    }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: sel ? '#fff' : off ? '#C3CDC9' : colors.text }}>{name}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Pressable onPress={() => close(onClose)} accessibilityRole="button"
              style={({ pressed }) => ({ flex: 1, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ fontWeight: '800', color: colors.text, fontSize: 15 }}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={() => close(() => onPick(mode === 'day' ? today : thisMonth))}
              disabled={!!min && (mode === 'day' ? today < min : thisMonth < min.slice(0, 7))}
              accessibilityRole="button"
              style={({ pressed }) => ({ flex: 1, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ fontWeight: '800', color: '#fff', fontSize: 15 }}>{todayLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
