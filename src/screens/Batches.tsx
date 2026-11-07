import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Card, Empty, Fab, Header } from '../components/UI';
import Icon from '../components/Icon';
import { useStore } from '../store';
import { formatAmount } from '../currency';
import { colors } from '../theme';
import { Nav } from '../nav';

export default function Batches({ nav }: { nav: Nav }) {
  const { data, t } = useStore();
  return (
    <View style={{ flex: 1 }}>
      <Header large title={t.batches} subtitle={`${data.batches.length}`} />
      <FlatList
        data={data.batches}
        keyExtractor={b => b.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Empty icon="batches" title={t.noBatches} text={t.addFirstBatch} />}
        renderItem={({ item: b }) => {
          const n = data.students.filter(s => s.batchId === b.id).length;
          return (
            <Pressable onPress={() => nav.push({ name: 'batchForm', id: b.id })}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
                <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="batches" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>{b.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 1 }} numberOfLines={1}>
                    {[b.subject, `${n} ${t.studentsCount}`].filter(Boolean).join('  ·  ')}
                  </Text>
                </View>
                <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 15 }}>{formatAmount(b.fee, b.currency)}</Text>
              </Card>
            </Pressable>
          );
        }}
      />
      <Fab label={t.addBatch} onPress={() => nav.push({ name: 'batchForm' })} />
    </View>
  );
}
