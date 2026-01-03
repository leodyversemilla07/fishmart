import { convex } from '@/lib/convex';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConvexProvider } from 'convex/react';
import 'react-native-reanimated';
import RootWrapper from './RootWrapper';

const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        <RootWrapper />
      </QueryClientProvider>
    </ConvexProvider>
  );
}
