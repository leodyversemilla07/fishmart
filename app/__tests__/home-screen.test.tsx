import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../(tabs)/index';

jest.mock('convex/react', () => ({
  useQuery: jest
    .fn()
    .mockImplementationOnce(() => [{ _id: 'cat-1', name: 'Guppies', slug: 'guppies' }])
    .mockImplementationOnce(() => [
      {
        _id: 'prod-1',
        name: 'Blue Guppy',
        price: 120,
        category: { name: 'Guppies' },
        images: [],
      },
    ])
    .mockImplementationOnce(() => 0),
}));

jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ sessionToken: 'token' }),
}));

jest.mock('@/store/cartStore', () => ({
  useCartStore: (selector: any) => selector({ totalItems: () => 0 }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('HomeScreen', () => {
  it('renders category names from joined product data', () => {
    const { getByText } = render(<HomeScreen />);

    expect(getByText('Guppies')).toBeTruthy();
    expect(getByText('Blue Guppy')).toBeTruthy();
  });
});
