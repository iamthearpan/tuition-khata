import React, { useMemo } from 'react';
import { showConfirm } from '../components/Dialog';
import { Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { Avatar, Card, Empty, Header, IconButton, Pill, SectionTitle, SettingRow } from '../components/UI';
import Icon, { IconName } from '../components/Icon';
import { useStore } from '../store';
import { buildLedger, isStudentActive } from '../calc';
import { formatAmount } from '../currency';
import { dateLabel, dayLabel, monthLabel, todayDay } from '../dates';
import { periodLabel, statusMeta, waNumber } from '../labels';
import { colors, radius, shadow } from '../theme';
import { Nav } from '../nav';

export default function StudentDetail({ id, nav }: { id: string; nav: Nav }) {
  const { data, t, deleteStudent, deletePayment } = useStore();
  const s = data.students.find(x => x.id === id);
  const lang = data.settings.lang;
  const ledger = useMemo(
    () => (s ? buildLedger(s, data.payments, data.adjustments, new Date(), data.settings.graceDays) : null),
    [s, data.payments, data.adjustments, data.settings.graceDays],
  );
  if (!s || !ledger) return <Header title="" onBack={nav.pop} />;

  const pays = data.payments.filter(p => p.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date));
  const digits = s.phone.replace(/[^\d+]/g, '');
    const open = (url: string) => Linking.openURL(url).catch(() => {});
  const batch = data.batches.find(b => b.id === s.batchId)?.name;
  const active = isStudentActive(s, todayDay());
  const owing = ledger.totalDue > 0;

  const confirmDelete = () =>
    showConfirm({ title: t.confirmDelete, message: t.deleteStudentMsg, confirmLabel: t.delete, danger: true, onConfirm: () => { deleteStudent(s.id); nav.pop(); } });
  const confirmDeletePayment = (pid: string) =>
    showConfirm({ title: t.deletePayment, message: t.confirmDelete, confirmLabel: t.delete, danger: true, onConfirm: () => deletePayment(pid) });
  const forLabel = (m: string | null) => {
    if (!m) return t.autoLabel;
    const r = ledger.rows.find(x => x.month === m);
    return r ? periodLabel(r, s.billing, lang, t) : monthLabel(m, lang);
  };
  const receipt = (p: (typeof pays)[number]) =>
    Share.share({
      message: t.receiptText(s.name, formatAmount(p.amount, s.currency), dateLabel(p.date), forLabel(p.forMonth), formatAmount(ledger.totalDue, s.currency), data.settings.teacherName),
    });

  return (
    <View style={{ flex: 1 }}>
      <Header
        title={t.student}
        onBack={nav.pop}
        right={
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <IconButton icon="edit" label={t.edit} onPress={() => nav.push({ name: 'studentForm', id: s.id })} />
            <IconButton icon="trash" label={t.delete} tint={colors.danger} onPress={confirmDelete} />
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: owing ? colors.primaryDark : colors.primary, borderRadius: 28, padding: 20, overflow: 'hidden', marginBottom: 16, ...shadow.fab }}>
          <View style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: '#fff', opacity: 0.07 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar name={s.name} size={56} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }} numberOfLines={1}>{s.name}</Text>
              <Text style={{ color: '#BFE3D7', fontSize: 13 }} numberOfLines={1}>
                {[batch, s.guardian, active ? null : `${t.stopped} · ${dayLabel(s.endDate!)}`].filter(Boolean).join('  ·  ') || `${t.joinDate} ${dayLabel(s.joinDate)}`}
              </Text>
            </View>
          </View>
          <Text style={{ color: '#BFE3D7', fontWeight: '700', marginTop: 20 }}>{owing ? t.totalDue : t.paidFull}</Text>
          <Text style={{ color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -1 }}>{formatAmount(ledger.totalDue, s.currency)}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <Chip2 text={`${t.currentFee}  ${formatAmount(ledger.currentFee, s.currency)}`} />
            {ledger.overdue > 0 ? <Chip2 text={`${t.overdue}  ${formatAmount(ledger.overdue, s.currency)}`} danger /> : null}
            {ledger.advance > 0 ? <Chip2 text={`${t.advance}  ${formatAmount(ledger.advance, s.currency)}`} /> : null}
          </View>
        </View>

        {/* Smart actions: reminder only when something is due; plain chat/SMS otherwise. */}
        <View style={{ flexDirection: 'row', justifyContent: owing || s.phone ? 'space-between' : 'flex-start', marginBottom: 20 }}>
          <Action icon="rupee" label={t.collect} primary onPress={() => nav.push({ name: 'payment', studentId: s.id })} />
          {owing ? (
            <Action icon="whatsapp" label={t.sendReminder} accent onPress={() => nav.push({ name: 'reminder', studentId: s.id })} />
          ) : s.phone ? (
            <>
              <Action icon="whatsapp" label={t.chat} onPress={() => open(`https://wa.me/${waNumber(s.phone, data.settings.phoneCode)}`)} />
              <Action icon="sms" label={t.sms} onPress={() => open(`sms:${digits}`)} />
            </>
          ) : null}
          {s.phone ? <Action icon="phone" label={t.call} onPress={() => open(`tel:${digits}`)} /> : null}
        </View>
        {!s.phone && !owing ? <Text style={{ color: colors.muted, textAlign: 'center', marginTop: -8, marginBottom: 16 }}>{t.hasPhone}</Text> : null}

        <Card style={{ paddingVertical: 2 }}>
          <SettingRow
            icon="tag" title={t.feeHistory} last
            subtitle={`${t.currentFee}: ${formatAmount(ledger.currentFee, s.currency)}${s.feeChanges.length ? `  ·  ${s.feeChanges.length}` : ''}`}
            onPress={() => nav.push({ name: 'feeChange', studentId: s.id })}
          />
        </Card>

        <SectionTitle>{t.monthlyLedger}</SectionTitle>
        {ledger.rows.length === 0 ? (
          <Card><Empty icon="calendar" title={t.noPeriods} /></Card>
        ) : (
          <Card style={{ paddingVertical: 4 }}>
            {[...ledger.rows].reverse().map((r, i, arr) => {
              const m = statusMeta(r.status, t);
              return (
                <Pressable
                  key={r.month}
                  onPress={() => nav.push({ name: 'adjust', studentId: s.id, month: r.month })}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: m.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={m.icon} size={19} color={m.fg} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontWeight: '700', color: colors.text }} numberOfLines={1}>{periodLabel(r, s.billing, lang, t)}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>
                      {formatAmount(r.fee, s.currency)}
                      {r.fraction < 1 ? ` × ${Math.round(r.fraction * 100)}%` : ''}
                      {r.adjust < 0 ? `  ·  −${formatAmount(-r.adjust, s.currency)} ${t.discountWord}` : ''}
                      {r.adjust > 0 ? `  ·  +${formatAmount(r.adjust, s.currency)} ${t.fineWord}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <Pill kind={m.kind} label={m.label} />
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>
                      {formatAmount(r.status === 'paid' || r.status === 'waived' ? r.expected : r.due, s.currency)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        )}

        <SectionTitle>{t.paymentHistory}</SectionTitle>
        {pays.length === 0 ? (
          <Card><Empty icon="wallet" title={t.noPayments} /></Card>
        ) : (
          <Card style={{ paddingVertical: 4 }}>
            {pays.map((p, i) => (
              <Pressable
                key={p.id}
                onPress={() => nav.push({ name: 'payment', studentId: s.id, paymentId: p.id })}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: i === pays.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.successLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="download" size={18} color={colors.success} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>{dateLabel(p.date)}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                    {t.forLabel}: {forLabel(p.forMonth)}{p.note ? `  ·  ${p.note}` : ''}
                  </Text>
                </View>
                <Text style={{ fontWeight: '800', color: colors.success, marginRight: 10 }}>+{formatAmount(p.amount, s.currency)}</Text>
                <Pressable onPress={() => receipt(p)} hitSlop={8} accessibilityLabel={t.shareReceipt} style={{ marginRight: 12 }}>
                  <Icon name="upload" size={18} color={colors.muted} />
                </Pressable>
                <Pressable onPress={() => confirmDeletePayment(p.id)} hitSlop={8} accessibilityLabel={t.deletePayment}>
                  <Icon name="trash" size={18} color={colors.muted} />
                </Pressable>
              </Pressable>
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function Chip2({ text, danger }: { text: string; danger?: boolean }) {
  return (
    <View style={{ backgroundColor: danger ? 'rgba(255,120,120,0.25)' : 'rgba(255,255,255,0.14)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
      <Text style={{ color: danger ? '#FFC9C9' : '#fff', fontWeight: '700', fontSize: 12 }}>{text}</Text>
    </View>
  );
}

function Action({ icon, label, onPress, primary, accent }: { icon: IconName; label: string; onPress: () => void; primary?: boolean; accent?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ alignItems: 'center', width: 84, opacity: pressed ? 0.8 : 1 })} accessibilityRole="button" accessibilityLabel={label}>
      <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: primary ? colors.accent : accent ? colors.primary : '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.card }}>
        <Icon name={icon} size={25} color={primary ? colors.primaryDark : accent ? '#fff' : colors.primary} />
      </View>
      <Text style={{ marginTop: 7, fontSize: 12, fontWeight: '700', color: colors.text }}>{label}</Text>
    </Pressable>
  );
}
