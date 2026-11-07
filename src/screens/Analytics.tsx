import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Card, Chip, ChipRow, Empty, Header, SectionTitle } from '../components/UI';
import Icon from '../components/Icon';
import { BarChart, HBar, LineChart, StackBar } from '../components/Charts';
import { useStore } from '../store';
import { analyze, analyticsCurrencies, Bucket, RANGES, RangeKey } from '../analytics';
import { formatAmount } from '../currency';
import { colors, shadow } from '../theme';
import { Nav } from '../nav';

const RANGE_KEYS: RangeKey[] = ['d30', 'week', 'month', 'half', 'quarter', 'year'];

function Tile({ label, value, sub, wide, tone }: { label: string; value: string; sub?: string; wide?: boolean; tone?: 'good' | 'bad' }) {
  return (
    <View style={{ width: wide ? '100%' : '48.5%', backgroundColor: '#fff', borderRadius: 18, padding: 14, ...shadow.card }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: tone === 'bad' ? colors.danger : tone === 'good' ? colors.success : colors.text, fontSize: 20, fontWeight: '800', marginTop: 4, letterSpacing: -0.4 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {sub ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
      {items.map(i => (
        <View key={i.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: i.dashed ? 14 : 10, height: i.dashed ? 3 : 10, borderRadius: 3, backgroundColor: i.color }} />
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function Analytics({ nav }: { nav: Nav }) {
  const { data, t } = useStore();
  const currencies = useMemo(() => analyticsCurrencies(data), [data]);
  const [range, setRange] = useState<RangeKey>('month');
  const [cur, setCur] = useState(currencies[0]);
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => { if (!currencies.includes(cur)) setCur(currencies[0]); }, [currencies, cur]);
  useEffect(() => setSel(null), [range, cur]);

  const a = useMemo(() => analyze(data, range, currencies.includes(cur) ? cur : currencies[0], new Date()), [data, range, cur, currencies]);
  const money = (n: number) => formatAmount(n, cur);
  const rname: Record<RangeKey, string> = { d30: t.rd30, week: t.rweek, month: t.rmonth, half: t.rhalf, quarter: t.rquarter, year: t.ryear };
  const hasData = data.students.length > 0;

  // average per bucket from the first bucket that has any activity
  const firstIdx = Math.max(0, a.buckets.findIndex(b => b.collected > 0 || b.billed > 0));
  const active = a.buckets.slice(firstIdx);
  const avgBucket = active.length ? a.collected / active.length : 0;
  const rates = a.buckets.map(b => (b.billed > 0 ? Math.round((b.collected / b.billed) * 100) : 0));
  const picked: Bucket | null = sel != null ? a.buckets[sel] : null;
  const pct = (n: number) => `${Math.round(n)}%`;
  const ageNames = { current: t.age0, d30: t.age30, d60: t.age60, d90: t.age90, d90p: t.age90p };
  const ageColors = [colors.success, '#E6B422', colors.accent, '#E0742E', colors.danger];
  const maxBatch = Math.max(1, ...a.byBatch.map(b => b.amount));
  const maxPayer = Math.max(1, ...a.topPayers.map(b => b.amount));
  const maxDef = Math.max(1, ...a.topDefaulters.map(b => b.amount));

  return (
    <View style={{ flex: 1 }}>
      <Header large title={t.analytics} />
      {!hasData ? (
        <Empty icon="chart" title={t.anNoData} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          <ChipRow>
            {RANGE_KEYS.map(k => <Chip key={k} label={rname[k]} selected={range === k} onPress={() => setRange(k)} />)}
          </ChipRow>
          {currencies.length > 1 ? (
            <View style={{ marginTop: 8 }}>
              <ChipRow>{currencies.map(c => <Chip key={c} label={c} selected={cur === c} onPress={() => setCur(c)} />)}</ChipRow>
            </View>
          ) : null}

          <View style={{ backgroundColor: colors.primaryDark, borderRadius: 28, padding: 20, overflow: 'hidden', marginTop: 12, marginBottom: 16, ...shadow.fab }}>
            <View style={{ position: 'absolute', right: -50, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: colors.primary, opacity: 0.5 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="trend" size={18} color="#BFE3D7" />
              <Text style={{ color: '#BFE3D7', fontWeight: '700', fontSize: 14 }}>{t.anCollected} · {rname[range]}</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 4 }}>{money(a.collected)}</Text>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: a.change == null ? '#BFE3D7' : a.change >= 0 ? '#7FE0B4' : '#FFB4A8', fontWeight: '800', fontSize: 12 }}>
                  {a.change == null ? t.anNoPrev : `${a.change >= 0 ? '+' : ''}${a.change.toFixed(0)}% ${t.anVsPrev}`}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              {[[t.anBilled, money(a.billed)], [t.anDue, money(a.due)], [t.anRate, pct(a.rate * 100)]].map(([l, v]) => (
                <View key={l} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 10 }}>
                  <Text style={{ color: '#BFE3D7', fontSize: 11, fontWeight: '700' }} numberOfLines={1}>{l}</Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          <SectionTitle>{t.anAverages}</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
            <Tile wide label={t.anAvgMonth} value={money(a.perMonth)} sub={`${t.anAvgBilledMonth}: ${money(a.billedPerMonth)}`} />
            <Tile label={t.anAvgWeek} value={money(a.perWeek)} />
            <Tile label={t.anAvgDay} value={money(a.perDay)} />
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>{t.anNote}</Text>

          <SectionTitle>{t.anTrend}</SectionTitle>
          <Card>
            <BarChart
              currency={cur}
              average={avgBucket}
              selected={sel}
              onSelect={i => setSel(sel === i ? null : i)}
              data={a.buckets.map(b => ({ label: b.label, value: b.collected, ghost: b.billed, highlight: b.current }))}
            />
            <Legend items={[{ color: colors.primary, label: t.anLegendCollected }, { color: colors.primaryLight, label: t.anLegendBilled }, { color: colors.danger, label: t.anLegendAvg, dashed: true }]} />
            {picked ? (
              <View style={{ marginTop: 12, backgroundColor: colors.bg, borderRadius: 14, padding: 12 }}>
                <Text style={{ fontWeight: '800', color: colors.text }}>{picked.full}</Text>
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                  {t.anCollected}: {money(picked.collected)}  ·  {t.anBilled}: {money(picked.billed)}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                  {t.anDue}: {money(picked.due)}  ·  {t.anPayments}: {picked.payments}
                </Text>
              </View>
            ) : null}
          </Card>

          {a.gran !== 'day' && a.gran !== 'week' ? (
            <>
              <SectionTitle>{t.anRateTrend}</SectionTitle>
              <Card>
                <LineChart values={rates} labels={a.buckets.map(b => b.label)} selected={sel} onSelect={i => setSel(sel === i ? null : i)} />
              </Card>
            </>
          ) : null}

          <SectionTitle>{t.anPeople}</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
            <Tile label={t.anAvgPayment} value={money(a.avgPayment)} />
            <Tile label={t.anPayments} value={String(a.paymentCount)} />
            <Tile label={t.anPayers} value={String(a.payers)} />
            <Tile label={t.anPerPayer} value={money(a.perPayer)} />
            <Tile label={t.anNew} value={String(a.newStudents)} />
            <Tile label={t.anActive} value={String(a.activeStudents)} />
            <Tile label={t.anDiscounts} value={money(a.discounts)} />
            <Tile label={t.anFines} value={money(a.fines)} />
            <Tile label={t.anBest} value={a.best ? money(a.best.collected) : '-'} sub={a.best?.full} tone="good" />
            <Tile label={t.anWorst} value={a.worst ? money(a.worst.collected) : '-'} sub={a.worst?.full} />
          </View>

          <SectionTitle>{t.anAgeing}</SectionTitle>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View><Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{t.anOutstanding}</Text><Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{money(a.outstandingNow)}</Text></View>
              <View style={{ alignItems: 'flex-end' }}><Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{t.anOverdue}</Text><Text style={{ fontSize: 20, fontWeight: '800', color: colors.danger }}>{money(a.overdueNow)}</Text></View>
            </View>
            <StackBar parts={a.ageing.map((g, i) => ({ value: g.amount, color: ageColors[i] }))} />
            <View style={{ marginTop: 12, gap: 8 }}>
              {a.ageing.map((g, i) => (
                <View key={g.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ageColors[i], marginRight: 10 }} />
                  <Text style={{ flex: 1, color: colors.text, fontSize: 14 }}>{ageNames[g.label]}</Text>
                  <Text style={{ fontWeight: '800', color: colors.text }}>{money(g.amount)}</Text>
                </View>
              ))}
            </View>
          </Card>

          {a.byBatch.length > 0 ? (
            <>
              <SectionTitle>{t.anBatches}</SectionTitle>
              <Card>
                {a.byBatch.map(b => (
                  <HBar key={b.id || 'none'} label={b.name || t.anNoBatch} valueText={money(b.amount)} ratio={b.amount / maxBatch}
                    sub={(b.extra ?? 0) > 0 ? `${t.anDue}: ${money(b.extra ?? 0)}` : undefined} />
                ))}
              </Card>
            </>
          ) : null}

          {a.topPayers.length > 0 ? (
            <>
              <SectionTitle>{t.anTopPayers}</SectionTitle>
              <Card>
                {a.topPayers.map(p => (
                  <Pressable key={p.id} onPress={() => nav.push({ name: 'studentDetail', id: p.id })}>
                    <HBar label={p.name} valueText={money(p.amount)} ratio={p.amount / maxPayer} />
                  </Pressable>
                ))}
              </Card>
            </>
          ) : null}

          {a.topDefaulters.length > 0 ? (
            <>
              <SectionTitle>{t.anTopDefaulters}</SectionTitle>
              <Card>
                {a.topDefaulters.map(p => (
                  <Pressable key={p.id} onPress={() => nav.push({ name: 'studentDetail', id: p.id })}>
                    <HBar label={p.name} valueText={money(p.amount)} ratio={p.amount / maxDef} color={colors.danger}
                      sub={(p.extra ?? 0) > 0 ? `${t.anOverdue}: ${money(p.extra ?? 0)}` : undefined} />
                  </Pressable>
                ))}
              </Card>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
