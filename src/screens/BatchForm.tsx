import React, { useState } from 'react';
import { showConfirm } from '../components/Dialog';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Btn, Card, CurrencyPicker, Field, Header, IconButton } from '../components/UI';
import { uid, useStore } from '../store';
import { parseAmount } from './StudentForm';
import { colors } from '../theme';
import { Nav } from '../nav';

export default function BatchForm({ id, nav }: { id?: string; nav: Nav }) {
  const { data, t, saveBatch, deleteBatch } = useStore();
  const b = data.batches.find(x => x.id === id);
  const [name, setName] = useState(b?.name ?? '');
  const [subject, setSubject] = useState(b?.subject ?? '');
  const [fee, setFee] = useState(b ? String(b.fee) : '');
  const [currency, setCurrency] = useState(b?.currency ?? data.settings.defaultCurrency);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t.required;
    const a = parseAmount(fee);
    if (a === null) e.fee = t.invalidAmount;
    setErrors(e);
    if (Object.keys(e).length) return;
    saveBatch({ id: b?.id ?? uid(), name: name.trim(), subject: subject.trim(), fee: a as number, currency });
    nav.pop();
  };

  const askDelete = () =>
    showConfirm({ title: t.confirmDelete, confirmLabel: t.delete, danger: true, onConfirm: () => { if (b) deleteBatch(b.id); nav.pop(); } });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header
        title={b ? t.editBatch : t.addBatch}
        onBack={nav.pop}
        right={b ? <IconButton icon="trash" label={t.delete} tint={colors.danger} onPress={askDelete} /> : undefined}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Card>
          <Field label={t.batchName} value={name} onChangeText={setName} error={errors.name} />
          <Field label={t.subject} value={subject} onChangeText={setSubject} />
        </Card>
        <Card>
          <CurrencyPicker label={t.currency} value={currency} onChange={setCurrency} />
          <Field label={t.monthlyFee} value={fee} onChangeText={setFee} keyboardType="decimal-pad" error={errors.fee} />
        </Card>
        <Btn title={t.save} icon="check" onPress={submit} />
        <Btn title={t.cancel} kind="ghost" onPress={nav.pop} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
