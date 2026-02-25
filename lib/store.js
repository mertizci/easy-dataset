import { atomWithStorage } from 'jotai/utils';

// Model config list
export const modelConfigListAtom = atomWithStorage('modelConfigList', []);
export const selectedModelInfoAtom = atomWithStorage('selectedModelInfo', null);

// Auth state
export const authAtom = atomWithStorage('auth', {
  user: null,
  token: null,
  isAuthenticated: false
});
