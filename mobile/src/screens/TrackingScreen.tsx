import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { fetchTracking, type TrackingResponse } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Tracking'>;

export default function TrackingScreen({ route }: Props) {
  const { awb } = route.params;
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTracking(awb)
      .then((res) => {
        if (cancelled) return;
        if (!res) {
          setError('Resi tidak ditemukan / Shipment not found');
        } else {
          setData(res);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'unknown error');
      });
    return () => {
      cancelled = true;
    };
  }, [awb]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.awb}>{data.awb}</Text>
      <Text style={styles.route}>
        {data.origin} → {data.destination}
      </Text>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Status saat ini</Text>
        <Text style={styles.statusValue}>{data.status_label_id}</Text>
        <Text style={styles.statusValueEn}>{data.status_label_en}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  awb: { fontSize: 18, fontWeight: '700' },
  route: { color: '#666', marginBottom: 12 },
  statusBox: {
    backgroundColor: '#f5f9ff',
    borderColor: '#d6e6fb',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
  },
  statusLabel: { color: '#666', fontSize: 12, textTransform: 'uppercase' },
  statusValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  statusValueEn: { color: '#888', fontSize: 14, marginTop: 2 },
  error: { color: '#a40' },
});
