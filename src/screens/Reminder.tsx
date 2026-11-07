import React, { useMemo, useRef, useState } from 'react';
import { showInfo } from '../components/Dialog';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Share from 'react-native-share';
import { captureRef } from 'react-native-view-shot';
import { Btn, Header, Segmented } from '../components/UI';
import ReminderCard from '../components/ReminderCard';
import { useStore } from '../store';
import { buildLedger } from '../calc';
import { buildReminderMessage } from '../reminder';
import { waNumber } from '../labels';
import { dayLabel, todayDay } from '../dates';
import { colors, radius } from '../theme';
import { Nav } from '../nav';

type Tone = 'gentle' | 'firm';

export default function Reminder({ studentId, nav }: { studentId: string; nav: Nav }) {
  const { data, t } = useStore();
  const s = data.students.find(x => x.id === studentId);
  const lang = data.settings.lang;
  const ledger = useMemo(
    () => (s ? buildLedger(s, data.payments, data.adjustments, new Date(), data.settings.graceDays) : null),
    [s, data],
  );
  const [tone, setTone] = useState<Tone>(ledger && ledger.overdue > 0 ? 'firm' : 'gentle');
  const make = (tn: Tone) =>
    s && ledger ? buildReminderMessage(t, s, ledger, lang, data.settings.teacherName, data.settings.paymentNote, tn === 'firm') : '';
  const [message, setMessage] = useState(() => make(tone));
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);
  if (!s || !ledger) return null;

  const changeTone = (tn: Tone) => {
    setTone(tn);
    setMessage(make(tn));
  };
  const digits = s.phone.replace(/[^\d+]/g, '');
  const open = (url: string) => Linking.openURL(url).catch(() => {});
  const capture = () => captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
  const cancelled = (e: unknown) => /did not share|cancel/i.test(String((e as Error)?.message ?? e));

  const shareImage = async (whatsapp: boolean) => {
    let uri: string;
    try {
      uri = await capture();
    } catch {
      return showInfo(t.shareFailed, undefined, 'info');
    }
    const opts = { url: uri, type: 'image/png', message, failOnCancel: false };
    try {
      if (whatsapp) await Share.shareSingle({ ...opts, social: Share.Social.WHATSAPP as any });
      else await Share.open(opts);
    } catch (e) {
      if (cancelled(e)) return;
      if (whatsapp) {
        showInfo(t.shareFailed, undefined, 'info');
        Share.open(opts).catch(() => {});
      }
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={t.remTitle} subtitle={s.name} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ReminderCard
          cardRef={cardRef} t={t} lang={lang} student={s} ledger={ledger}
          teacher={data.settings.teacherName} pay={data.settings.paymentNote} asOf={dayLabel(todayDay())}
        />

        <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 13, marginTop: 20, marginBottom: 8 }}>{t.tone}</Text>
        <Segmented value={tone} onChange={changeTone} options={[{ key: 'gentle', label: t.toneGentle }, { key: 'firm', label: t.toneFirm }]} />

        <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 13, marginTop: 16, marginBottom: 8 }}>{t.messageLabel}</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          multiline
          style={{ backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: 14, minHeight: 150, fontSize: 15, color: colors.text, textAlignVertical: 'top', marginBottom: 16 }}
        />

        <Btn icon="whatsapp" title={t.sendWhatsApp} onPress={() => shareImage(true)} style={{ marginBottom: 6 }} />
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 14, textAlign: 'center' }}>{t.sendWhatsAppHint}</Text>
        {s.phone ? (
          <>
            <Btn kind="soft" icon="whatsapp" title={t.whatsappText} onPress={() => open(`https://wa.me/${waNumber(s.phone, data.settings.phoneCode)}?text=${encodeURIComponent(message)}`)} />
            <Btn kind="ghost" icon="sms" title={t.smsText} onPress={() => open(`sms:${digits}?body=${encodeURIComponent(message)}`)} />
          </>
        ) : (
          <Text style={{ color: colors.muted, textAlign: 'center', marginBottom: 10 }}>{t.noPhoneHint}</Text>
        )}
        <Btn kind="ghost" icon="upload" title={t.shareAny} onPress={() => shareImage(false)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
