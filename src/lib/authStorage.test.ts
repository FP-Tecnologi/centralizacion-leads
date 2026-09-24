import { describe, expect, it } from 'vitest';
import { createAuthStorage, setRecordar, type StorageLike } from './authStorage';

function fakeStorage(): StorageLike & { length: number; key(i: number): string | null } {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    get length() {
      return map.size;
    },
    key: (i) => Array.from(map.keys())[i] ?? null,
  };
}

describe('createAuthStorage', () => {
  it('usa localStorage por defecto (sin flag ax:recordar)', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    const adapter = createAuthStorage(local, session);
    adapter.setItem('sb-x-auth-token', 'v1');
    expect(local.getItem('sb-x-auth-token')).toBe('v1');
    expect(session.getItem('sb-x-auth-token')).toBeNull();
  });

  it('usa sessionStorage cuando ax:recordar es "0"', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    local.setItem('ax:recordar', '0');
    const adapter = createAuthStorage(local, session);
    adapter.setItem('sb-x-auth-token', 'v1');
    expect(session.getItem('sb-x-auth-token')).toBe('v1');
    expect(local.getItem('sb-x-auth-token')).toBeNull();
  });

  it('getItem/removeItem respetan el mismo backing store', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    local.setItem('ax:recordar', '0');
    const adapter = createAuthStorage(local, session);
    adapter.setItem('k', 'v');
    expect(adapter.getItem('k')).toBe('v');
    adapter.removeItem('k');
    expect(session.getItem('k')).toBeNull();
  });
});

describe('setRecordar', () => {
  it('recordar=false marca el flag y limpia tokens de localStorage', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    local.setItem('sb-proj-auth-token', 'stale');
    setRecordar(local, session, false);
    expect(local.getItem('ax:recordar')).toBe('0');
    expect(local.getItem('sb-proj-auth-token')).toBeNull();
  });

  it('recordar=true borra el flag y limpia tokens de sessionStorage', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    local.setItem('ax:recordar', '0');
    session.setItem('sb-proj-auth-token', 'stale');
    setRecordar(local, session, true);
    expect(local.getItem('ax:recordar')).toBeNull();
    expect(session.getItem('sb-proj-auth-token')).toBeNull();
  });
});
