/**
 * Nusantara mobile — entrypoint.
 *
 * Single binary, two flavors. APP_FLAVOR is read from env at build time
 * ('driver' | 'customer'). The driver flavor enables the camera + background
 * location modules; the customer flavor doesn't.
 *
 * See ADR 0002 for the why.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import TrackingScreen from './src/screens/TrackingScreen';

export type RootStackParamList = {
  Home: undefined;
  Tracking: { awb: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const APP_FLAVOR = (process.env.APP_FLAVOR ?? 'customer') as 'driver' | 'customer';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#0a4d8c' },
            headerTintColor: 'white',
            headerTitleStyle: { fontWeight: '700' },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: APP_FLAVOR === 'driver' ? 'Driver' : 'Nusantara',
            }}
          />
          <Stack.Screen
            name="Tracking"
            component={TrackingScreen}
            options={{ title: 'Lacak / Track' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
