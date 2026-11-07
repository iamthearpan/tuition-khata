import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Avatar, Card, Empty, Fab, Header, Pill, Segmented } from '../components/UI';
import Icon from '../components/Icon';
import { useStore } from '../store';
import { buildAllLedgers, isStudentActive } from '../calc';
import { todayDay } from '../dates';
import { formatAmount } from '../currency';
import { colors, radius, shadow } from '../theme';
import { Nav } from '../nav';

type Filter = 'all' | 'due' | 'paid';

export default function Students({ nav }: { nav: Nav }) {
  const { data, t } = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const ledgers = buildAllLedgers(data.students, data.payments, data.adjustments, new Date(), data.settings.graceDays);
    return data.students
      .filter(s => !ql || s.name.toLowerCase().includes(ql))
      .map(s => ({ s, l: ledgers.get(s.id)! }))
      .filter(r => (filter === 'due' ? r.l.totalDue > 0 : filter === 'paid' ? r.l.totalDue === 0 : true))
      .sort((a, b) => a.s.name.localeCompare(b.s.name));
  }, [data, q, filter]);

  const batchName = (id: string | null) => data.batches.find(b => b.id === id)?.name;

  return (
    <View style={{ flex: 1 }}>
      <Header large title={t.students} subtitle={`${data.students.length}`} />
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 14, marginBottom: 12, ...shadow.card }}>
          <Icon name="search" size={20} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t.search}
            placeholderTextColor={colors.muted}
            style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 10, fontSize: 16, color: colors.text }}
          />
        </View>
        <View style={{ marginBottom: 14 }}>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[{ key: 'all', label: t.all }, { key: 'due', label: t.dueOnly }, { key: 'paid', label: t.paidUp }]}
          />
        </View>
      </View>
      <FlatList
        data={rows}
        keyExtractor={r => r.s.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Empty icon="students" title={t.noStudents} text={t.addFirstStudent} />}
        renderItem={({ item: { s, l } }) => (
          <Pressable onPress={() => nav.push({ name: 'studentDetail', id: s.id })}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, opacity: isStudentActive(s, todayDay()) ? 1 : 0.6 }}>
              <Avatar name={s.name} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>{s.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 1 }} numberOfLines={1}>
                  {[batchName(s.batchId), formatAmount(l.currentFee, s.currency)].filter(Boolean).join('  ·  ')}
                </Text>
              </View>
              {l.totalDue > 0 ? (
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontWeight: '800', color: colors.danger, fontSize: 15 }}>{formatAmount(l.totalDue, s.currency)}</Text>
                  <Pill kind={l.overdue > 0 ? 'due' : 'partial'} label={l.overdue > 0 ? t.overdue : t.pending} />
                </View>
              ) : (
                <Pill kind="paid" label={t.paidUp} />
              )}
            </Card>
          </Pressable>
        )}
      />
      <Fab label={t.addStudent} onPress={() => nav.push({ name: 'studentForm' })} />
    </View>
  );
}
