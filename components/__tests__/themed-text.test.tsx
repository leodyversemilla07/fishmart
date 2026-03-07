import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemedText } from '@/components/themed-text';

describe('ThemedText', () => {
  it('renders correctly with default props', () => {
    const { getByText } = render(<ThemedText>Test</ThemedText>);
    const textElement = getByText('Test');
    expect(textElement).toBeTruthy();
  });
});
