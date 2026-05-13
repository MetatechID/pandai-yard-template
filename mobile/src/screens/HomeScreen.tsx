import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/**
 * HomeScreen — customer flavor. Asks for an AWB and pushes to the tracking screen.
 *
 * The driver flavor's home screen is a different file (not in this skeleton — would
 * be conditionally rendered based on APP_FLAVOR). The driver landing has the daily
 * job list + camera-scan button.
 */
export default function HomeScreen({ navigation }: Props) {
  const [awb, setAwb] = useState('');

  const submit = () => {
    const trimmed = awb.trim().toUpperCase();
    if (!trimmed) return;
    navigation.navigate('Tracking', { awb: trimmed });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Lacak pengiriman</Text>
        <Text style={styles.subtitle}>Track your shipment</Text>

        <TextInput
          value={awb}
          onChangeText={setAwb}
          placeholder="Nomor resi / AWB"
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={submit}
        />

        <Pressable onPress={submit} style={styles.button}>
          <Text style={styles.buttonText}>Lacak / Track</Text>
        </Pressable>

        <Text style={styles.hint}>
          Tip: nomor resi biasanya berawalan NL diikuti 6–8 digit.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'white' },
  container: { padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0a4d8c',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  hint: { color: '#888', fontSize: 12, marginTop: 8 },
});
