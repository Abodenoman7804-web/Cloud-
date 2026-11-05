/**
 * إدارة مفتاح الخزنة (Vault Key) في ذاكرة الجلسة.
 * يُحفظ الرخام الخام في sessionStorage (ذاكرة التبويب فقط) ويُمحى بإغلاق التبويب.
 */
import { importRawVaultKey } from "./crypto-client";

const STORE = "sahaab.vault";

let memoryKey: CryptoKey | null = null;
type Resolver = (key: CryptoKey | null) => void;
let pendingResolver: Resolver | null = null;

export async function getVaultKey(): Promise<CryptoKey | null> {
  if (memoryKey) return memoryKey;
  try {
    const raw = sessionStorage.getItem(STORE);
    if (!raw) return null;
    memoryKey = await importRawVaultKey(raw);
    return memoryKey;
  } catch {
    return null;
  }
}

export async function setVaultKeyFromRaw(rawB64: string): Promise<CryptoKey> {
  sessionStorage.setItem(STORE, rawB64);
  memoryKey = await importRawVaultKey(rawB64);
  return memoryKey;
}

/** الرخام الخام من sessionStorage — لاستخدامه في #fragment روابط المشاركة فقط */
export function getRawVaultKey(): string | null {
  try {
    return sessionStorage.getItem(STORE);
  } catch {
    return null;
  }
}

export function clearVault() {
  memoryKey = null;
  try {
    sessionStorage.removeItem(STORE);
  } catch {
    /* ignore */
  }
}

/** يعيد المفتاح إن وُجد، وإلا يفتح نافذة "فتح الخزنة" ويستنتج كلمة المرور */
export async function ensureVaultKey(): Promise<CryptoKey | null> {
  const existing = await getVaultKey();
  if (existing) return existing;
  return new Promise<CryptoKey | null>((resolve) => {
    pendingResolver = resolve;
    window.dispatchEvent(new CustomEvent("sahaab:vault-request"));
  });
}

/** يستدعيه مكوّن VaultModal بعد اشتقاق المفتاح (أو عند الإلغاء) */
export async function resolveVaultRequest(rawB64: string | null) {
  let key: CryptoKey | null = null;
  if (rawB64) key = await setVaultKeyFromRaw(rawB64);
  const resolver = pendingResolver;
  pendingResolver = null;
  resolver?.(key);
}
