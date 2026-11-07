import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar, Card, Empty, Header, SectionTitle } from '../components/UI';
import Icon, { IconName } from '../components/Icon';
import { useStore } from '../store';
import { buildAllLedgers, isStudentActive, sumByCurrency } from '../calc';
import { formatAmount } from '../currency';
import { monthKey, todayDay } from '../dates';
import { colors, radius, shadow } from '../theme';
import { Nav } from '../nav';

export default function Dashboard({ nav }: { nav: Nav }) {
  const { data, t } = useStore();

  const { dueByCur, overdueByCur, collectedByCur, top, activeCount } = useMemo(() => {
    const now = new Date();
    const ledgers = buildAllLedgers(data.students, data.payments, data.adjustments, now, data.settings.graceDays);
    const rows = data.students.map(s => ({ s, l: ledgers.get(s.id)! }));
    const dueByCur = sumByCurrency(rows, r => ({ currency: r.s.currency, amount: r.l.totalDue }));
    const overdueByCur = sumByCurrency(rows, r => ({ currency: r.s.currency, amount: r.l.overdue }));
    const mk = monthKey(now);
    const byId = new Map(data.students.map(s => [s.id, s]));
    const collectedByCur = sumByCurrency(
      data.payments.filter(p => p.date.slice(0, 7) === mk),
      p => ({ currency: byId.get(p.studentId)?.currency ?? data.settings.defaultCurrency, amount: p.amount }),
    );
    const top = rows
      .filter(r => r.l.totalDue > 0)
      .sort((a, b) => b.l.overdue - a.l.overdue || b.l.totalDue - a.l.totalDue)
      .slice(0, 8);
    const today = todayDay(now);
    return { dueByCur, overdueByCur, collectedByCur, top, activeCount: data.students.filter(s => isStudentActive(s, today)).length };
  }, [data]);

  const def = data.settings.defaultCurrency;
  const nonZero = (m: Record<string, number>) => {
    const k = Object.keys(m).filter(c => m[c] !== 0);
    return k.length ? k : [def];
  };
  const overdueKeys = Object.keys(overdueByCur).filter(c => overdueByCur[c] > 0);
  const name = data.settings.teacherName;

  return (
    <View style={{ flex: 1 }}>
      <Header large title={name ? name : t.appName} subtitle={name ? t.hello : t.overview} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: colors.primaryDark, borderRadius: 28, padding: 22, overflow: 'hidden', marginBottom: 16, ...shadow.fab }}>
          <View style={{ position: 'absolute', right: -50, top: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: colors.primary, opacity: 0.55 }} />
          <View style={{ position: 'absolute', right: 30, bottom: -70, width: 140, height: 140, borderRadius: 70, backgroundColor: colors.primary, opacity: 0.3 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Icon name="wallet" size={18} color="#BFE3D7" />
            <Text style={{ color: '#BFE3D7', fontWeight: '700', fontSize: 14 }}>{t.totalDue}</Text>
          </View>
          {nonZero(dueByCur).map(c => (
            <Text key={c} style={{ color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1 }}>
              {formatAmount(dueByCur[c] ?? 0, c)}
            </Text>
          ))}
          {overdueKeys.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {overdueKeys.map(c => (
                <View key={c} style={{ backgroundColor: 'rgba(255,120,120,0.22)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill }}>
                  <Text style={{ color: '#FFC9C9', fontWeight: '800', fontSize: 12 }}>{t.ofWhichOverdue} {formatAmount(overdueByCur[c], c)}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md, padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="trend" size={15} color="#7FE0B4" />
                <Text style={{ color: '#BFE3D7', fontSize: 12, fontWeight: '700' }}>{t.collectedThisMonth}</Text>
              </View>
              {nonZero(collectedByCur).map(c => (
                <Text key={c} style={{ color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 3 }}>
                  {formatAmount(collectedByCur[c] ?? 0, c)}
                </Text>
              ))}
            </View>
            <View style={{ flex: 0.8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md, padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="students" size={15} color="#F8D58F" />
                <Text style={{ color: '#BFE3D7', fontSize: 12, fontWeight: '700' }}>{t.activeStudents}</Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 3 }}>{activeCount}</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <Quick icon="students" label={t.addStudent} onPress={() => nav.push({ name: 'studentForm' })} />
          <Quick icon="batches" label={t.addBatch} onPress={() => nav.push({ name: 'batchForm' })} />
        </View>

        <SectionTitle>{t.topDue}</SectionTitle>
        {top.length === 0 ? (
          <Card>
            <Empty
              icon={data.students.length ? 'check' : 'students'}
              title={data.students.length ? t.noDue : t.noStudents}
              text={data.students.length ? undefined : t.addFirstStudent}
            />
          </Card>
        ) : (
          top.map(({ s, l }) => {
            const n = l.rows.filter(r => r.billable && r.due > 0 && (l.overdue > 0 ? r.overdue : true)).length;
            const word = n === 1 ? t.monthOne : t.monthMany;
            return (
              <Pressable key={s.id} onPress={() => nav.push({ name: 'studentDetail', id: s.id })}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
                  <Avatar name={s.name} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>{s.name}</Text>
                    <Text style={{ color: l.overdue > 0 ? colors.danger : colors.muted, fontSize: 13, fontWeight: l.overdue > 0 ? '700' : '400' }}>
                      {n} {word} {(l.overdue > 0 ? t.overdue : t.pending).toLowerCase()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: l.overdue > 0 ? colors.danger : colors.text }}>{formatAmount(l.totalDue, s.currency)}</Text>
                </Card>
              </Pressable>
            );
          })
        )}
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6, textAlign: 'center' }}>{t.multiCurrencyNote}</Text>
      </ScrollView>
    </View>
  );
}

function Quick({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1, backgroundColor: '#fff', borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center',
        gap: 10, opacity: pressed ? 0.85 : 1, ...shadow.card,
      })}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={{ flex: 1, fontWeight: '700', color: colors.text, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}
