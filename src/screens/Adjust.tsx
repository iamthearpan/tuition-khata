import React, { useMemo, useState } from 'react';
import { showConfirm } from '../components/Dialog';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Btn, Card, Field, Header, SectionTitle, Segmented } from '../components/UI';
import Icon from '../components/Icon';
import { uid, useStore } from '../store';
import { buildLedger } from '../calc';
import { parseAmount } from './StudentForm';
import { addMonths, daysInclusive, daysInMonth, isValidMonth } from '../dates';
import { formatAmount } from '../currency';
import { periodLabel } from '../labels';
import { colors } from '../theme';
import { Nav } from '../nav';
import { Adjustment } from '../types';
import { STRINGS } from '../i18n';

/** A waiver is a negative adjustment whose note is the "Waived" word (either language). */
const isWaiver = (a: { amount: number; note: string }) => a.amount < 0 && (a.note === STRINGS.en.waived || a.note === STRINGS.bn.waived);

type Kind = 'discount' | 'fine';
type Mode = 'fixed' | 'percent';

export default function Adjust({ studentId, month, nav }: { studentId: string; month: string; nav: Nav }) {
  const { data, t, addAdjustments, deleteAdjustment } = useStore();
  const s = data.students.find(x => x.id === studentId);
  const [kind, setKind] = useState<Kind>('discount');
  const [mode, setMode] = useState<Mode>('fixed');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [from, setFrom] = useState(month);
  const [to, setTo] = useState(month);
  const [rangeError, setRangeError] = useState('');

  const ledger = useMemo(
    () => (s ? buildLedger(s, data.payments, data.adjustments, new Date(), data.settings.graceDays) : null),
    [s, data],
  );
  if (!s || !ledger) return null;
  const row = ledger.rows.find(r => r.month === month);
  const mine = data.adjustments.filter(a => a.studentId === s.id && a.month === month);
  const base = row ? row.fee * row.fraction : s.fee;

  const add = () => {
    const a = parseAmount(amount);
    if (a === null) return setError(t.invalidAmount);
    if (mode === 'percent' && a > 100 && kind === 'discount') return setError(t.invalidAmount);
    const value = mode === 'percent' ? Math.round(base * a) / 100 : a;
    const signed = kind === 'discount' ? -value : value;
    const label = mode === 'percent' ? `${a}%${note ? ' · ' + note : ''}` : note.trim();
    addAdjustments([{ id: uid(), studentId: s.id, month, amount: signed, note: label }]);
    setAmount('');
    setNote('');
    setError('');
  };

  const waive = () => {
    if (!row || row.expected <= 0) return;
    const label = periodLabel(row, s.billing, data.settings.lang, t);
    showConfirm({
      title: t.confirmWaiveTitle, message: t.confirmWaiveBody(label, formatAmount(row.expected, s.currency)), confirmLabel: t.confirmYes, icon: 'tag',
      onConfirm: () => addAdjustments([{ id: uid(), studentId: s.id, month, amount: -row.expected, note: t.waived }]),
    });
  };

  const confirmRemove = (id: string) =>
    showConfirm({ title: t.removeTitle, message: t.removeBody, confirmLabel: t.removeYes, danger: true, onConfirm: () => deleteAdjustment(id) });

  const removeWaivers = () => {
    if (!isValidMonth(from) || !isValidMonth(to) || from > to) return setRangeError(t.rangeInvalid);
    const hit = data.adjustments.filter(a => a.studentId === s.id && a.month >= from && a.month <= to && isWaiver(a));
    if (!hit.length) return setRangeError(t.noWaiversInRange);
    setRangeError('');
    showConfirm({ title: t.removeWaivers, message: t.removeWaiversBody(hit.length), confirmLabel: t.removeYes, danger: true, onConfirm: () => hit.forEach(a => deleteAdjustment(a.id)) });
  };

  const pause = () => {
    if (!isValidMonth(from) || !isValidMonth(to) || from > to) return setRangeError(t.rangeInvalid);
    const list: Adjustment[] = [];
    for (let m = from, i = 0; m <= to && i < 60; m = addMonths(m, 1), i++) {
      const r = ledger.rows.find(x => x.month === m);
      if (r && r.expected > 0) list.push({ id: uid(), studentId: s.id, month: m, amount: -r.expected, note: t.waived });
    }
    if (!list.length) return setRangeError(t.rangeInvalid);
    const total = list.reduce((x, a) => x - a.amount, 0);
    setRangeError('');
    showConfirm({
      title: t.confirmPauseTitle, message: t.confirmPauseBody(list.length, formatAmount(total, s.currency)), confirmLabel: t.confirmYes, icon: 'calendar',
      onConfirm: () => { addAdjustments(list); nav.pop(); },
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={t.adjustPeriod} subtitle={s.name} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {row ? (
          <Card>
            <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>{periodLabel(row, s.billing, data.settings.lang, t)}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              {t.monthlyFee}: {formatAmount(row.fee, s.currency)}
              {row.fraction < 1 ? `  ·  ${t.daysCharged(daysInclusive(row.start, row.end), daysInMonth(Number(row.month.slice(0, 4)), Number(row.month.slice(5, 7))))}` : ''}
            </Text>
            <Text style={{ color: colors.muted }}>{t.expected}: <Text style={{ fontWeight: '800', color: colors.text }}>{formatAmount(row.expected, s.currency)}</Text>  ·  {t.paid}: {formatAmount(row.paid, s.currency)}</Text>
          </Card>
        ) : null}

        <Card>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>{t.adjustHint}</Text>
          <View style={{ marginBottom: 12 }}>
            <Segmented value={kind} onChange={setKind} options={[{ key: 'discount', label: t.discount }, { key: 'fine', label: t.fine }]} />
          </View>
          <View style={{ marginBottom: 14 }}>
            <Segmented value={mode} onChange={setMode} options={[{ key: 'fixed', label: t.amountMode }, { key: 'percent', label: t.percentMode }]} />
          </View>
          <Field label={mode === 'percent' ? '%' : `${t.amount} (${s.currency})`} value={amount} onChangeText={v => { setAmount(v); setError(''); }} keyboardType="decimal-pad" error={error} />
          <Field label={t.note} value={note} onChangeText={setNote} />
          <Btn title={t.addAdjustment} icon="plus" onPress={add} />
          {row && row.expected > 0 ? <Btn kind="soft" title={t.waivePeriod} onPress={waive} /> : null}
        </Card>

        <SectionTitle>{t.adjustments}</SectionTitle>
        <Card style={{ paddingVertical: mine.length ? 4 : 16 }}>
          {mine.length === 0 ? (
            <Text style={{ color: colors.muted, textAlign: 'center' }}>{t.noAdjustments}</Text>
          ) : mine.map((a, i) => (
            <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: i === mine.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>{isWaiver(a) ? t.waiverWord : a.amount < 0 ? t.discountWord : t.fineWord}</Text>
                {a.note && !isWaiver(a) ? <Text style={{ color: colors.muted, fontSize: 12 }}>{a.note}</Text> : null}
              </View>
              <Text style={{ fontWeight: '800', color: a.amount < 0 ? colors.success : colors.danger, marginRight: 12 }}>
                {a.amount < 0 ? '−' : '+'}{formatAmount(Math.abs(a.amount), s.currency)}
              </Text>
              <Pressable onPress={() => confirmRemove(a.id)} hitSlop={10} accessibilityLabel={isWaiver(a) ? t.undoWaive : t.delete}
                style={isWaiver(a) ? { backgroundColor: colors.dangerLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 } : undefined}>
                {isWaiver(a) ? <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>{t.undoWaive}</Text> : <Icon name="trash" size={18} color={colors.muted} />}
              </Pressable>
            </View>
          ))}
        </Card>

        <SectionTitle>{t.pauseTitle}</SectionTitle>
        <Card>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>{t.pauseHint}</Text>
          <Field label={t.pauseFrom} value={from} onChangeText={setFrom} />
          <Field label={t.pauseTo} value={to} onChangeText={setTo} error={rangeError} />
          <Btn kind="ghost" title={t.pauseBtn} onPress={pause} />
          <Btn kind="soft" title={t.removeWaivers} onPress={removeWaivers} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
