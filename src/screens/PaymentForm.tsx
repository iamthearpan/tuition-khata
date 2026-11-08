import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Avatar, Btn, Card, Chip, ChipRow, Field, Header } from '../components/UI';
import { DateField } from '../components/DatePicker';
import { uid, useStore } from '../store';
import { parseAmount } from './StudentForm';
import { buildLedger, feeForMonth } from '../calc';
import { formatAmount } from '../currency';
import { addMonths, isoFromDay, isValidDay, monthLabel, todayDay } from '../dates';
import { periodLabel } from '../labels';
import { colors } from '../theme';
import { Nav } from '../nav';

export default function PaymentForm({ studentId, paymentId, nav }: { studentId: string; paymentId?: string; nav: Nav }) {
  const { data, t, savePayment } = useStore();
  const s = data.students.find(x => x.id === studentId);
  const existing = data.payments.find(p => p.id === paymentId);
  const lang = data.settings.lang;

  // Ledger without the payment being edited, so its own money is not double counted.
  const ledger = useMemo(
    () => (s ? buildLedger(s, data.payments.filter(p => p.id !== paymentId), data.adjustments, new Date(), data.settings.graceDays) : null),
    [s, data, paymentId],
  );
  const [forMonth, setForMonth] = useState<string | null>(existing?.forMonth ?? null);
  const [amount, setAmount] = useState(existing ? String(existing.amount) : ledger && ledger.totalDue > 0 ? String(ledger.totalDue) : s ? String(ledger?.currentFee ?? s.fee) : '');
  const [date, setDate] = useState(existing ? todayDay(new Date(existing.date)) : todayDay());
  const [note, setNote] = useState(existing?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!s || !ledger) return null;

  // Periods that can be targeted: unpaid ones plus the next two after the last period.
  const unpaid = ledger.rows.filter(r => r.due > 0);
  const lastKey = ledger.rows.length ? ledger.rows[ledger.rows.length - 1].month : s.joinDate.slice(0, 7);
  const next = [1, 2].map(i => addMonths(lastKey, i)).filter(k => !ledger.rows.some(r => r.month === k));
  const choices: { key: string; label: string; amount: number }[] = [
    ...unpaid.map(r => ({ key: r.month, label: periodLabel(r, s.billing, lang, t), amount: r.due })),
    ...next.map(k => ({ key: k, label: monthLabel(k, lang), amount: feeForMonth(s, k) })),
  ].slice(0, 12);

  const choose = (key: string | null) => {
    setForMonth(key);
    const c = choices.find(x => x.key === key);
    setAmount(String(c ? c.amount : ledger.totalDue > 0 ? ledger.totalDue : ledger.currentFee));
  };

  const submit = () => {
    const e: Record<string, string> = {};
    const a = parseAmount(amount);
    if (a === null) e.amount = t.invalidAmount;
    if (!isValidDay(date)) e.date = t.invalidDate;
    setErrors(e);
    if (Object.keys(e).length) return;
    savePayment({ id: existing?.id ?? uid(), studentId: s.id, amount: a as number, date: isoFromDay(date) as string, forMonth, note: note.trim() });
    nav.pop();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={existing ? t.editPayment : t.recordPayment} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar name={s.name} size={52} />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }} numberOfLines={1}>{s.name}</Text>
            <Text style={{ color: colors.muted }}>{t.due}: <Text style={{ color: ledger.totalDue > 0 ? colors.danger : colors.success, fontWeight: '800' }}>{formatAmount(ledger.totalDue, s.currency)}</Text></Text>
          </View>
        </Card>
        <Card>
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 7, fontWeight: '700' }}>{t.appliesTo}</Text>
          <ChipRow>
            <Chip label={t.autoOldest} selected={forMonth === null} onPress={() => choose(null)} />
            {choices.map(c => (
              <Chip key={c.key} label={c.label} selected={forMonth === c.key} onPress={() => choose(c.key)} />
            ))}
          </ChipRow>
          <Field label={`${t.amount} (${s.currency})`} value={amount} onChangeText={v => { setAmount(v); setErrors(x => ({ ...x, amount: '' })); }} keyboardType="decimal-pad" error={errors.amount} />
          <DateField label={t.paymentDate} value={date} onChange={setDate} error={errors.date} lang={lang} todayLabel={t.today} cancelLabel={t.cancel} />
          <Field label={t.note} value={note} onChangeText={setNote} />
        </Card>
        <Btn title={t.save} icon="check" onPress={submit} />
        <Btn title={t.cancel} kind="ghost" onPress={nav.pop} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
