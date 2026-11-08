import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Btn, Card, Field, Header, SectionTitle } from '../components/UI';
import { DateField } from '../components/DatePicker';
import Icon from '../components/Icon';
import { useStore } from '../store';
import { parseAmount } from './StudentForm';
import { addMonths, isValidMonth, monthKey, monthLabel } from '../dates';
import { formatAmount } from '../currency';
import { colors } from '../theme';
import { Nav } from '../nav';

export default function FeeChange({ studentId, nav }: { studentId: string; nav: Nav }) {
  const { data, t, saveStudent } = useStore();
  const s = data.students.find(x => x.id === studentId);
  const lang = data.settings.lang;
  const [fee, setFee] = useState('');
  const [month, setMonth] = useState(addMonths(monthKey(), 1));
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!s) return null;

  const history = [{ month: s.joinDate.slice(0, 7), amount: s.fee, start: true }, ...[...s.feeChanges].sort((a, b) => a.month.localeCompare(b.month)).map(c => ({ ...c, start: false }))];

  const submit = () => {
    const e: Record<string, string> = {};
    const a = parseAmount(fee);
    if (a === null) e.fee = t.invalidAmount;
    if (!isValidMonth(month) || month < s.joinDate.slice(0, 7)) e.month = t.invalidMonth;
    setErrors(e);
    if (Object.keys(e).length) return;
    saveStudent({ ...s, feeChanges: [...s.feeChanges.filter(c => c.month !== month), { month, amount: a as number }] });
    nav.pop();
  };

  const remove = (m: string) => saveStudent({ ...s, feeChanges: s.feeChanges.filter(c => c.month !== m) });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={t.changeFee} subtitle={s.name} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Card>
          <Field label={`${t.newFee} (${s.currency})`} value={fee} onChangeText={setFee} keyboardType="decimal-pad" error={errors.fee} />
          <DateField mode="month" label={t.effectiveFrom} value={month} onChange={setMonth} error={errors.month} lang={lang} min={s.joinDate.slice(0, 7)} todayLabel={t.thisMonth} cancelLabel={t.cancel} />
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: -6, marginBottom: 14 }}>{t.feeChangeHint}</Text>
          <Btn title={t.save} icon="check" onPress={submit} />
        </Card>
        <SectionTitle>{t.feeHistory}</SectionTitle>
        <Card style={{ paddingVertical: 4 }}>
          {history.map((h, i) => (
            <View key={h.month + i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: i === history.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>{monthLabel(h.month, lang)}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{h.start ? t.startingFee : t.effectiveFrom}</Text>
              </View>
              <Text style={{ fontWeight: '800', color: colors.primary, marginRight: h.start ? 0 : 12 }}>{formatAmount(h.amount, s.currency)}</Text>
              {h.start ? null : (
                <Pressable onPress={() => remove(h.month)} hitSlop={10} accessibilityLabel={t.delete}>
                  <Icon name="trash" size={18} color={colors.muted} />
                </Pressable>
              )}
            </View>
          ))}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
