import { atomWithStorage } from 'jotai/utils';

// 模型配置列表
export const modelConfigListAtom = atomWithStorage('modelConfigList', []);
export const selectedModelInfoAtom = atomWithStorage('selectedModelInfo', null);

// Auth state
export const authAtom = atomWithStorage('auth', {
  user: null,
  token: null,
  isAuthenticated: false
});
