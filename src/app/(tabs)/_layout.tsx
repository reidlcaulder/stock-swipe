import { Tabs } from 'expo-router/js-tabs';

import { Icon } from '@/components/icon';
import { DeckProvider } from '@/hooks/deck-provider';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <DeckProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
          tabBarLabelStyle: { fontWeight: '700' },
          sceneStyle: { backgroundColor: colors.background },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color, size }) => <Icon name="discover" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="watchlist"
          options={{
            title: 'Watchlist',
            tabBarIcon: ({ color, size }) => <Icon name="watchlist" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: 'Account',
            tabBarIcon: ({ color, size }) => <Icon name="account" color={color} size={size} />,
          }}
        />
      </Tabs>
    </DeckProvider>
  );
}
