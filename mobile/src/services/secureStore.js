import * as SecureStore from 'expo-secure-store';

const KEYS = {
  accessToken: 'rk_access_token',
  refreshToken: 'rk_refresh_token',
  user: 'rk_user',
};

async function setItem(key, value) {
  if (value === null || value === undefined) {
    await SecureStore.deleteItemAsync(key).catch(() => {});
    return;
  }
  await SecureStore.setItemAsync(key, typeof value === 'string' ? value : JSON.stringify(value));
}

async function getItem(key) {
  return SecureStore.getItemAsync(key).catch(() => null);
}

async function getJSON(key) {
  const raw = await getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const tokenStorage = {
  async setTokens({ accessToken, refreshToken }) {
    await setItem(KEYS.accessToken, accessToken);
    if (refreshToken) await setItem(KEYS.refreshToken, refreshToken);
  },

  async getAccessToken() {
    return getItem(KEYS.accessToken);
  },

  async getRefreshToken() {
    return getItem(KEYS.refreshToken);
  },

  async setUser(user) {
    await setItem(KEYS.user, user);
  },

  async getUser() {
    return getJSON(KEYS.user);
  },

  async clear() {
    await Promise.all([
      setItem(KEYS.accessToken, null),
      setItem(KEYS.refreshToken, null),
      setItem(KEYS.user, null),
    ]);
  },
};
