const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
};

const isBackendAuthoritativeKey = (key: string) => key.startsWith('school-compass:');

const getEmptyLikeFallback = <T>(fallback: T): T => {
  if (Array.isArray(fallback)) return [] as T;
  if (fallback && typeof fallback === 'object') return {} as T;
  return fallback;
};

const pushToBackend = async (key: string, value: unknown) => {
  if (!API_URL) return;
  const token = getToken();
  if (!token) return;
  try {
    await fetch(`${API_URL}/api/v1/storage/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value }),
    });
  } catch {
    // silencioso: mantém modo offline
  }
};

export const syncKeysFromBackend = async (keys: string[]) => {
  if (typeof window === 'undefined') return;
  if (!API_URL) return;
  const token = getToken();
  if (!token) return;
  try {
    const res = await fetch(`${API_URL}/api/v1/storage/batch-get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keys }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { items?: Record<string, unknown | null> };
    const items = data.items ?? {};
    Object.entries(items).forEach(([key, value]) => {
      // Se o backend não tem valor para a chave, removemos o cache local
      // para evitar dados "fantasma" divergentes entre perfis.
      if (value === null || value === undefined) {
        window.localStorage.removeItem(key);
        return;
      }
      window.localStorage.setItem(key, JSON.stringify(value));
    });
  } catch {
    // silencioso
  }
};

export const loadFromStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      // Modo profissional: com backend configurado, chaves de dominio devem vir do banco.
      // Evita "ressuscitar" mocks/defaults quando o backend nao possui dados.
      if (API_URL && isBackendAuthoritativeKey(key)) {
        return getEmptyLikeFallback(fallback);
      }
      return fallback;
    }
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    if (API_URL && isBackendAuthoritativeKey(key)) {
      return getEmptyLikeFallback(fallback);
    }
    return fallback;
  }
};

export const saveToStorage = <T>(key: string, value: T) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
  // Fire-and-forget para persistir no backend quando existir
  void pushToBackend(key, value);
};

export const createId = (prefix = 'id') =>
  `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
