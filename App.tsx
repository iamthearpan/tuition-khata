import React, { useCallback, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from './src/store';
import { Nav, Route } from './src/nav';
import { colors, shadow } from './src/theme';
import Icon, { IconName } from './src/components/Icon';
import Dashboard from './src/screens/Dashboard';
import Students from './src/screens/Students';
import Batches from './src/screens/Batches';
import SettingsScreen from './src/screens/SettingsScreen';
import StudentDetail from './src/screens/StudentDetail';
import StudentForm from './src/screens/StudentForm';
import BatchForm from './src/screens/BatchForm';
import PaymentForm from './src/screens/PaymentForm';
import FeeChange from './src/screens/FeeChange';
import Adjust from './src/screens/Adjust';
import Reminder from './src/screens/Reminder';
import Analytics from './src/screens/Analytics';
import { DialogHost, setDialogLabels } from './src/components/Dialog';
import { BackupHost, runAutoBackup } from './src/components/BackupHost';
import { autoBackupDue } from './src/drive';
import { exportBackup } from './src/backup';

type Tab = 'home' | 'students' | 'batches' | 'analytics' | 'settings';
const TABS: { key: Tab; icon: IconName }[] = [
  { key: 'home', icon: 'home' },
  { key: 'students', icon: 'students' },
  { key: 'batches', icon: 'batches' },
  { key: 'analytics', icon: 'chart' },
  { key: 'settings', icon: 'settings' },
];

function Shell() {
  const { ready, t, data, updateSettings } = useStore();
  const dataRef = React.useRef(data);
  dataRef.current = data;
  const autoRunning = React.useRef(false);
  setDialogLabels(t.cancel, t.ok);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('home');
  const [stack, setStack] = useState<Route[]>([]);

  const push = useCallback((r: Route) => setStack(s => [...s, r]), []);
  const pop = useCallback(() => setStack(s => s.slice(0, -1)), []);
  const nav: Nav = { push, pop };

  // Automatic daily Drive backup (silent) when the app opens or returns to the foreground.
  React.useEffect(() => {
    if (!ready) return;
    const tryAuto = () => {
      const d = dataRef.current;
      if (autoRunning.current || !autoBackupDue(d.settings, new Date())) return;
      autoRunning.current = true;
      runAutoBackup(exportBackup(d), iso => updateSettings({ lastBackup: iso })).finally(() => { autoRunning.current = false; });
    };
    const timer = setTimeout(tryAuto, 4000);
    const sub = AppState.addEventListener('change', st => { if (st === 'active') tryAuto(); });
    return () => { clearTimeout(timer); sub.remove(); };
  }, [ready, updateSettings]);

  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length) { pop(); return true; }
      if (tab !== 'home') { setTab('home'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, tab, pop]);

  if (!ready) return <View style={styles.center}><StatusBar barStyle="dark-content" /><ActivityIndicator size="large" color={colors.primary} /></View>;

  const top = stack[stack.length - 1];
  let body: React.ReactNode;
  if (top) {
    switch (top.name) {
      case 'studentDetail': body = <StudentDetail key={top.id} id={top.id} nav={nav} />; break;
      case 'studentForm': body = <StudentForm id={top.id} nav={nav} />; break;
      case 'batchForm': body = <BatchForm id={top.id} nav={nav} />; break;
      case 'payment': body = <PaymentForm key={top.paymentId ?? 'new'} studentId={top.studentId} paymentId={top.paymentId} nav={nav} />; break;
      case 'reminder': body = <Reminder studentId={top.studentId} nav={nav} />; break;
      case 'feeChange': body = <FeeChange studentId={top.studentId} nav={nav} />; break;
      case 'adjust': body = <Adjust studentId={top.studentId} month={top.month} nav={nav} />; break;
    }
  } else {
    body = tab === 'home' ? <Dashboard nav={nav} /> : tab === 'students' ? <Students nav={nav} /> : tab === 'batches' ? <Batches nav={nav} /> : tab === 'analytics' ? <Analytics nav={nav} /> : <SettingsScreen />;
  }

  const labels: Record<Tab, string> = { home: t.home, students: t.students, batches: t.batches, analytics: t.analytics, settings: t.settings };
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1, paddingBottom: top ? insets.bottom : 0 }}>{body}</View>
      <DialogHost />
      <BackupHost t={t} />
      {!top && (
        <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {TABS.map(x => {
            const on = tab === x.key;
            return (
              <Pressable key={x.key} style={styles.tab} onPress={() => setTab(x.key)} accessibilityRole="tab" accessibilityLabel={labels[x.key]}>
                <View key={on ? 'on' : 'off'} style={[styles.pill, { backgroundColor: on ? colors.primaryLight : 'rgba(227,241,236,0)' }]}>
                  <Icon name={x.icon} size={22} color={on ? colors.primary : colors.muted} strokeWidth={on ? 2.2 : 1.9} />
                </View>
                <Text style={{ fontSize: 11, marginTop: 2, color: on ? colors.primary : colors.muted, fontWeight: on ? '800' : '600' }}>{labels[x.key]}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  tabs: {
    flexDirection: 'row', backgroundColor: '#fff', paddingTop: 8, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    ...shadow.card, shadowOffset: { width: 0, height: -4 },
  },
  tab: { flex: 1, alignItems: 'center' },
  pill: { width: 58, height: 32, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
