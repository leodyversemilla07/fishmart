import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../(tabs)/index';

jest.mock('convex/react', () => ({
  useQuery: jest.fn((_query: unknown, args?: { status?: string; sessionToken?: string }) => {
    if (args?.status === 'ACTIVE') {
      return [
        {
          _id: 'prod-1',
          name: 'Blue Guppy',
          price: 120,
          category: { name: 'Guppies' },
          images: [],
        },
      ];
    }
    if (args?.sessionToken === 'token') {
      return 0;
    }
    return [{ _id: 'cat-1', name: 'Guppies', slug: 'guppies' }];
  }),
}));

jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ sessionToken: 'token' }),
}));

jest.mock('@/store/cartStore', () => ({
  useCartStore: (selector: (state: { totalItems: () => number }) => unknown) => selector({ totalItems: () => 0 }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/fish/product-card', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    ProductCard: ({ product }: { product: { name: string } }) => <Text>{product.name}</Text>,
  };
});

describe('HomeScreen', () => {
  const originalWarn = console.warn;
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation((...args) => {
      const [message] = args;
      if (typeof message === 'string' && message.includes("Tried to use the icon")) {
        return;
      }
      originalWarn(...args);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('renders category names from joined product data', () => {
    const { getByText } = render(<HomeScreen />);

    expect(getByText('Guppies')).toBeTruthy();
    expect(getByText('Blue Guppy')).toBeTruthy();
  });
});
