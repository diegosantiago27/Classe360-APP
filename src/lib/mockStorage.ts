export const loadFromStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export const saveToStorage = <T>(key: string, value: T) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const createId = (prefix = 'id') =>
  `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
