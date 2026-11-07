import React from 'react';
import { Text, View } from 'react-native';
import Icon from './Icon';
import { Ledger } from '../calc';
import { formatAmount } from '../currency';
import { dueLines } from '../reminder';
import { Strings } from '../i18n';
import { Lang, Student } from '../types';
import { colors } from '../theme';

/** The image that is shared with the parent. Plain views only so it renders identically when captured. */
export type CardRef = React.RefObject<React.ComponentRef<typeof View> | null>;

export default function ReminderCard({ cardRef, t, lang, student, ledger, teacher, pay, asOf }: {
  cardRef: CardRef; t: Strings; lang: Lang; student: Student; ledger: Ledger; teacher: string; pay: string; asOf: string;
}) {
  const lines = dueLines(student, ledger, lang, t);
  const shown = lines.slice(0, 5);
  const urgent = ledger.overdue > 0;
  return (
    <View ref={cardRef} collapsable={false} style={{ width: 340, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 26, overflow: 'hidden' }}>
      <View style={{ backgroundColor: colors.primaryDark, padding: 18, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="wallet" size={22} color="#fff" />
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>{t.cardTitle}</Text>
          {teacher ? <Text style={{ color: '#BFE3D7', fontSize: 12 }} numberOfLines={1}>{teacher}</Text> : null}
        </View>
      </View>
      <View style={{ padding: 20 }}>
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700' }}>{student.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 10 }}>{t.totalDue}</Text>
        <Text style={{ color: urgent ? colors.danger : colors.primaryDark, fontSize: 40, fontWeight: '800', letterSpacing: -1 }}>
          {formatAmount(ledger.totalDue, student.currency)}
        </Text>
        {urgent ? (
          <View style={{ alignSelf: 'flex-start', backgroundColor: colors.dangerLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 }}>
            <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>{t.overdue} · {formatAmount(ledger.overdue, student.currency)}</Text>
          </View>
        ) : null}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
        {shown.map((l, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.overdue ? colors.danger : colors.accent, marginRight: 10 }} />
            <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }} numberOfLines={1}>{l.label}</Text>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{l.amount}</Text>
          </View>
        ))}
        {lines.length > shown.length ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{t.cardMore(lines.length - shown.length)}</Text> : null}
        {pay ? (
          <View style={{ backgroundColor: colors.primaryLight, borderRadius: 14, padding: 12, marginTop: 14 }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{t.cardPayVia}</Text>
            <Text style={{ color: colors.text, fontWeight: '700', marginTop: 2 }}>{pay}</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{t.cardAsOf(asOf)}</Text>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>{t.appName}</Text>
        </View>
      </View>
    </View>
  );
}
