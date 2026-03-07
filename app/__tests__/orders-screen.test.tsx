import React from 'react';
import { render } from '@testing-library/react-native';
import OrdersScreen from '../orders/index';

jest.mock('convex/react', () => ({
  useQuery: jest.fn(() => [
    {
      _id: 'order-1',
      _creationTime: Date.now(),
      orderNumber: 'ORD-1',
      total: 250,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'GCASH',
      items: [{ productName: 'Fish Pair' }],
    },
  ]),
  useAction: jest.fn(() => jest.fn()),
}));

jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ sessionToken: 'token' }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('OrdersScreen', () => {
  it('shows retry payment for unpaid online orders', () => {
    const { getByText } = render(<OrdersScreen />);

    expect(getByText('Retry Payment')).toBeTruthy();
  });
});
