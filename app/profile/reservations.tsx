import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { LucideArrowLeft, LucideClock, LucideTimerReset } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReservationMetricsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { sessionToken, user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const metrics = useQuery(
    api.orders.getReservationMetrics,
    sessionToken && user?.role === 'ADMIN' ? { sessionToken, refreshKey } : 'skip'
  );
  const runReservationSweep = useMutation(api.orders.runReservationSweep);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey(Date.now());
    setTimeout(() => setRefreshing(false), 800);
  };

  useEffect(() => {
    if (!sessionToken || user?.role !== 'ADMIN') return;
    const interval = setInterval(() => {
      setRefreshKey(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, [sessionToken, user?.role]);

  const handleSweepNow = async () => {
    if (!sessionToken) return;
    try {
      const result = await runReservationSweep({ sessionToken });
      setRefreshKey(Date.now());
      Alert.alert('Sweep complete', `Released ${result.released} expired reservations.`);
    } catch (error) {
      console.error('Failed to run reservation sweep:', error);
      Alert.alert('Error', 'Unable to run sweep right now.');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="titleMedium">Admin access required.</Text>
      </View>
    );
  }

  if (metrics === undefined) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <LucideArrowLeft size={24} color="black" />
        </TouchableOpacity>
        <Text variant="titleLarge" style={styles.headerTitle}>Reservation Metrics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={[styles.row, styles.overviewHeaderRow]}>
              <View style={styles.row}>
                <LucideTimerReset size={18} color={theme.colors.primary} />
                <Text variant="titleMedium" style={styles.cardTitle}>Overview</Text>
              </View>
              <Button mode="outlined" compact onPress={handleSweepNow}>Sweep now</Button>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.metricRow}>
              <Text>Pending Orders</Text>
              <Text variant="titleMedium">{metrics.pendingOrderCount}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text>Active Reservations</Text>
              <Text variant="titleMedium">{metrics.activeReservationCount}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text>Expired Reservations</Text>
              <Text variant="titleMedium" style={{ color: metrics.expiredReservationCount > 0 ? theme.colors.error : '#10B981' }}>
                {metrics.expiredReservationCount}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <LucideClock size={18} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>Last Snapshot</Text>
            </View>
            <Divider style={styles.divider} />
            <Text variant="bodyMedium">{new Date(metrics.now).toLocaleString()}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Expired Order IDs</Text>
            <Divider style={styles.divider} />
            {metrics.expiredOrderIds.length === 0 ? (
              <Text variant="bodyMedium" style={styles.muted}>No expired reservations right now.</Text>
            ) : (
              metrics.expiredOrderIds.map((id) => (
                <Text key={String(id)} style={styles.orderIdText}>{String(id)}</Text>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overviewHeaderRow: {
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontWeight: '700',
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#F1F5F9',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  muted: {
    color: '#64748B',
  },
  orderIdText: {
    color: '#334155',
    marginBottom: 6,
  },
});
