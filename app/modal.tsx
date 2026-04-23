import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.content}>
        <Text variant="headlineSmall" style={styles.title}>Welcome to Fishmart</Text>
        <Text variant="bodyMedium" style={styles.description}>
          Your one-stop shop for all things aquatic. Browse, buy, and sell with ease in the biggest community in PH.
        </Text>
      </View>
      
      <Button 
        mode="contained" 
        onPress={() => router.dismiss()} 
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Got it
      </Button>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 12,
  },
});
