/** A random id per device, so a Station can undo only its own awards. */
export function deviceId(): string {
  try {
    let id = localStorage.getItem('device-id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('device-id', id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

export function store(key: string, value?: string | null): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
  return value ?? null;
}

export const appUrl = (route: string) => `${location.origin}${location.pathname}#/${route}`;

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
