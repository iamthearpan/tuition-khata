import React, { useState } from 'react';
import { showInfo } from '../components/Dialog';
import { Linking, ScrollView, Share, Switch, Text, View } from 'react-native';
import { runBackup, runRestore } from '../components/BackupHost';
import { remoteInfo, signIn, signOut, BackupError } from '../drive';
import { showConfirm } from '../components/Dialog';
import { PRIVACY_URL } from '../config';
import { Btn, Card, CurrencyPicker, Field, Header, Segmented, SettingRow } from '../components/UI';
import { exportBackup, parseBackup, useStore } from '../store';
import { colors } from '../theme';

const VERSION = '1.0.0';

export default function SettingsScreen() {
  const { data, t, updateSettings, replaceAll } = useStore();
  const [paste, setPaste] = useState('');
  const [showImport, setShowImport] = useState(false);

  const st0 = data.settings;
  const doImport = () => {
    const d = parseBackup(paste);
    if (!d) return showInfo(t.importFail, undefined, 'info');
    replaceAll({ ...d, settings: { ...d.settings, driveEmail: st0.driveEmail, autoBackup: st0.autoBackup, lastBackup: st0.lastBackup } });
    setPaste('');
    setShowImport(false);
    showInfo(t.importDone, undefined, 'check');
  };

  const st = data.settings;
  const fmt = (iso: string) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : iso; };

  const connect = async () => {
    try { updateSettings({ driveEmail: await signIn() }); }
    catch (e) {
      if (e instanceof BackupError && e.kind === 'cancelled') return;
      showInfo(t.bkFailed, e instanceof BackupError && e.kind === 'network' ? t.bkNoNet : t.bkOther, 'info');
    }
  };
  const disconnect = () => showConfirm({
    title: t.disconnectTitle, message: t.disconnectBody, confirmLabel: t.disconnectYes, danger: true,
    onConfirm: async () => { await signOut(); updateSettings({ driveEmail: '', lastBackup: '' }); },
  });
  const backupNow = () => runBackup(() => exportBackup(data), t, iso => updateSettings({ lastBackup: iso }));
  const restore = async () => {
    let when = '';
    try {
      const info = await remoteInfo();
      if (!info) return showInfo(t.bkFailed, t.bkNoFile, 'info');
      when = fmt(info.modifiedTime);
    } catch (e) {
      return showInfo(t.bkFailed, e instanceof BackupError && e.kind === 'network' ? t.bkNoNet : e instanceof BackupError && e.kind === 'auth' ? t.bkAuth : t.bkOther, 'info');
    }
    showConfirm({
      title: t.rsConfirmTitle, message: t.rsConfirmBody.replace('{date}', when), confirmLabel: t.rsConfirmYes, danger: true,
      onConfirm: () => runRestore(t, raw => {
        const d = parseBackup(raw);
        if (!d) return false;
        replaceAll({ ...d, settings: { ...d.settings, driveEmail: st.driveEmail, autoBackup: st.autoBackup, lastBackup: st.lastBackup } });
        return true;
      }),
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <Header large title={t.settings} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={sec}>{t.preferences}</Text>
        <Card>
          <Text style={lbl}>{t.language}</Text>
          <View style={{ marginBottom: 16 }}>
            <Segmented
              value={data.settings.lang}
              onChange={l => updateSettings({ lang: l })}
              options={[{ key: 'en', label: 'English' }, { key: 'bn', label: 'বাংলা' }]}
            />
          </View>
          <Field label={t.teacherName} defaultValue={data.settings.teacherName} onEndEditing={e => updateSettings({ teacherName: e.nativeEvent.text.trim() })} />
          <Field
            label={t.payDetails} multiline defaultValue={data.settings.paymentNote} style={{ minHeight: 70, textAlignVertical: 'top' }}
            onEndEditing={e => updateSettings({ paymentNote: e.nativeEvent.text.trim() })}
          />
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: -8, marginBottom: 16 }}>{t.payDetailsHint}</Text>
          <Field
            label={t.graceDays} keyboardType="number-pad" defaultValue={String(data.settings.graceDays)}
            onEndEditing={e => { const n = parseInt(e.nativeEvent.text, 10); if (Number.isFinite(n) && n >= 0 && n <= 60) updateSettings({ graceDays: n }); }}
          />
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: -8, marginBottom: 16 }}>{t.graceHint}</Text>
          <Field
            label={t.phoneCode} keyboardType="number-pad" defaultValue={data.settings.phoneCode}
            onEndEditing={e => { const c = e.nativeEvent.text.replace(/\D/g, ''); if (c) updateSettings({ phoneCode: c }); }}
          />
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: -8, marginBottom: 16 }}>{t.phoneCodeHint}</Text>
          <CurrencyPicker label={t.defaultCurrency} value={data.settings.defaultCurrency} onChange={c => updateSettings({ defaultCurrency: c })} />
        </Card>

        <Text style={sec}>{t.driveBackup}</Text>
        <Card style={{ paddingVertical: 4 }}>
          {st.driveEmail ? (
            <>
              <SettingRow icon="user" title={st.driveEmail} subtitle={`${t.connectedAs} · ${t.lastBackupLbl}: ${st.lastBackup ? fmt(st.lastBackup) : t.never}`} onPress={disconnect} />
              <SettingRow icon="cloud" title={t.backupNow} onPress={backupNow} />
              <SettingRow icon="download" title={t.restoreDrive} onPress={restore} />
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{t.autoBackupTitle}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 1 }}>{t.autoBackupSub}</Text>
                </View>
                <Switch value={st.autoBackup === '1'} onValueChange={v => updateSettings({ autoBackup: v ? '1' : '0' })} trackColor={{ true: colors.primary, false: '#CBD5D1' }} thumbColor="#fff" />
              </View>
            </>
          ) : (
            <SettingRow icon="cloud" title={t.connectGoogle} subtitle={t.driveSub} last onPress={connect} />
          )}
        </Card>

        <Text style={sec}>{t.dataSection}</Text>
        <Card style={{ paddingVertical: 4 }}>
          <SettingRow icon="upload" title={t.exportData} subtitle={t.offlineNote} onPress={() => Share.share({ message: exportBackup(data) })} />
          <SettingRow icon="download" title={t.importData} last onPress={() => setShowImport(v => !v)} />
        </Card>
        {showImport ? (
          <Card>
            <Field label={t.importHint} value={paste} onChangeText={setPaste} multiline style={{ minHeight: 90, textAlignVertical: 'top' }} />
            <Btn title={t.save} icon="check" onPress={doImport} />
          </Card>
        ) : null}

        <Text style={sec}>{t.about}</Text>
        <Card style={{ paddingVertical: 4 }}>
          <SettingRow icon="shield" title={t.privacy} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} />
          <SettingRow icon="info" title={t.appName} subtitle={`${t.version} ${VERSION}`} last onPress={() => {}} />
        </Card>
      </ScrollView>
    </View>
  );
}

const sec = { fontSize: 13, fontWeight: '800' as const, color: colors.muted, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 8, marginBottom: 10 };
const lbl = { fontSize: 13, color: colors.muted, marginBottom: 7, fontWeight: '700' as const };
