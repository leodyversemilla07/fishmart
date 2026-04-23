import { assertSameUser, hashSessionToken } from '../session';
import { Id, TableNames } from '../../_generated/dataModel';

function toId<TableName extends TableNames>(value: string): Id<TableName> {
  return value as Id<TableName>;
}

describe('session helpers', () => {
  it('hashes the same token consistently', async () => {
    const first = await hashSessionToken('session-token');
    const second = await hashSessionToken('session-token');

    expect(first).toHaveLength(64);
    expect(first).toBe(second);
  });

  it('throws when actor ids do not match', () => {
    expect(() => assertSameUser(toId<'users'>('user-1'), toId<'users'>('user-2'))).toThrow('Forbidden');
  });
});
