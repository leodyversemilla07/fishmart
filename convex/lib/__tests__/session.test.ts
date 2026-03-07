import { assertSameUser, hashSessionToken } from '../session';

describe('session helpers', () => {
  it('hashes the same token consistently', async () => {
    const first = await hashSessionToken('session-token');
    const second = await hashSessionToken('session-token');

    expect(first).toHaveLength(64);
    expect(first).toBe(second);
  });

  it('throws when actor ids do not match', () => {
    expect(() => assertSameUser('user-1' as any, 'user-2' as any)).toThrow('Forbidden');
  });
});
