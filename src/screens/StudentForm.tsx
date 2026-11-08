import React, { useState } from 'react';
import { showDialog } from '../components/Dialog';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Btn, Card, Chip, ChipRow, CurrencyPicker, Field, Header } from '../components/UI';
import { DateField } from '../components/DatePicker';
import Icon from '../components/Icon';
import { uid, useStore } from '../store';
import { feeForMonth } from '../calc';
import { addMonths, isValidDay, monthKey, monthLabel, todayDay } from '../dates';
import { formatAmount } from '../currency';
import { colors, radius } from '../theme';
import { BillingMode, FeeChange, Student } from '../types';
import { Nav } from '../nav';

export function parseAmount(v: string): number | null {
  const n = Number(v.replace(/,/g, '').trim());
  return v.trim() !== '' && isFinite(n) && n > 0 ? n : null;
}

export default function StudentForm({ id, nav }: { id?: string; nav: Nav }) {
  const { data, t, saveStudent } = useStore();
  const existing = data.students.find(s => s.id === id);
  const lang = data.settings.lang;
  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [guardian, setGuardian] = useState(existing?.guardian ?? '');
  const [batchId, setBatchId] = useState<string | null>(existing?.batchId ?? null);
  const [fee, setFee] = useState(existing ? String(existing.fee) : '');
  const [currency, setCurrency] = useState(existing?.currency ?? data.settings.defaultCurrency);
  const [joinDate, setJoinDate] = useState(existing?.joinDate ?? todayDay());
  const [billing, setBilling] = useState<BillingMode>(existing?.billing ?? 'cycle');
  const [stopped, setStopped] = useState(!!existing?.endDate);
  const [endDate, setEndDate] = useState(existing?.endDate ?? todayDay());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pickBatch = (bid: string | null) => {
    setBatchId(bid);
    const b = data.batches.find(x => x.id === bid);
    if (b && !existing && !fee) {
      setFee(String(b.fee));
      setCurrency(b.currency);
    }
  };

  const save = (s: Student) => {
    saveStudent(s);
    nav.pop();
  };

  const submit = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t.required;
    const amt = existing ? existing.fee : parseAmount(fee);
    if (amt === null) e.fee = t.invalidAmount;
    if (!isValidDay(joinDate)) e.joinDate = t.invalidDate;
    if (stopped && (!isValidDay(endDate) || endDate < joinDate)) e.endDate = t.invalidDate;
    setErrors(e);
    if (Object.keys(e).length) return;
    const s: Student = {
      id: existing?.id ?? uid(), name: name.trim(), phone: phone.trim(), guardian: guardian.trim(), batchId,
      fee: amt as number, feeChanges: existing?.feeChanges ?? [], currency, joinDate, billing,
      endDate: stopped ? endDate : null,
    };
    // Moving to a batch with a different fee: offer to apply it from next month, never to the past.
    const nb = data.batches.find(b => b.id === batchId);
    if (existing && nb && batchId !== existing.batchId && nb.currency === existing.currency) {
      const cur = feeForMonth(existing, monthKey());
      if (nb.fee !== cur) {
        const from = addMonths(monthKey(), 1);
        showDialog({
          title: t.batchFeeTitle, message: t.batchFeeMsg(formatAmount(nb.fee, nb.currency), monthLabel(from, lang)), icon: 'tag',
          actions: [
            { label: t.keepFee, tone: 'ghost', onPress: () => save(s) },
            {
              label: t.updateFee, tone: 'primary',
              onPress: () => {
                const changes: FeeChange[] = [...s.feeChanges.filter(c => c.month !== from), { month: from, amount: nb.fee }];
                save({ ...s, feeChanges: changes });
              },
            },
          ],
        });
        return;
      }
    }
    save(s);
  };

  const modes: { key: BillingMode; label: string; desc: string }[] = [
    { key: 'cycle', label: t.billingCycle, desc: t.cycleDesc },
    { key: 'prorate', label: t.billingProrate, desc: t.prorateDesc },
    { key: 'full', label: t.billingFull, desc: t.fullDesc },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={existing ? t.editStudent : t.addStudent} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Card>
          <Field label={t.name} value={name} onChangeText={setName} error={errors.name} />
          <Field label={t.guardian} value={guardian} onChangeText={setGuardian} />
          <Field label={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 7, fontWeight: '700' }}>{t.batch}</Text>
          <ChipRow>
            <Chip label={t.noBatch} selected={batchId === null} onPress={() => pickBatch(null)} />
            {data.batches.map(b => (
              <Chip key={b.id} label={b.name} selected={batchId === b.id} onPress={() => pickBatch(b.id)} />
            ))}
          </ChipRow>
        </Card>

        <Card>
          {existing ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 7, fontWeight: '700' }}>{t.currentFee}</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{formatAmount(feeForMonth(existing, monthKey()), existing.currency)}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 10 }}>{t.editFeeNote}</Text>
              <Btn kind="soft" icon="tag" title={t.changeFee} onPress={() => nav.push({ name: 'feeChange', studentId: existing.id })} />
            </View>
          ) : (
            <>
              <CurrencyPicker label={t.currency} value={currency} onChange={setCurrency} />
              <Field label={t.startingFee} value={fee} onChangeText={setFee} keyboardType="decimal-pad" error={errors.fee} />
            </>
          )}
          <DateField label={t.joinDate} value={joinDate} onChange={setJoinDate} error={errors.joinDate} lang={lang} todayLabel={t.today} cancelLabel={t.cancel} />
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8, fontWeight: '700' }}>{t.billing}</Text>
          {modes.map(m => {
            const on = billing === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setBilling(m.key)}
                style={{ borderWidth: 1.5, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primaryLight : '#fff', borderRadius: radius.md, padding: 12, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Icon name="check" size={12} color={colors.primary} strokeWidth={3} /> : null}
                  </View>
                  <Text style={{ fontWeight: '800', color: colors.text }}>{m.label}</Text>
                </View>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{m.desc}</Text>
              </Pressable>
            );
          })}
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{t.stopped}</Text>
            <Switch value={stopped} onValueChange={setStopped} trackColor={{ true: colors.primary, false: '#CBD5D1' }} thumbColor="#fff" />
          </View>
          {stopped ? (
            <View style={{ marginTop: 14 }}>
              <DateField label={t.endDate} value={endDate} onChange={setEndDate} error={errors.endDate} lang={lang} min={isValidDay(joinDate) ? joinDate : undefined} todayLabel={t.today} cancelLabel={t.cancel} />
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: -8 }}>{t.stoppedHint}</Text>
            </View>
          ) : null}
        </Card>
        <Btn title={t.save} icon="check" onPress={submit} />
        <Btn title={t.cancel} kind="ghost" onPress={nav.pop} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
