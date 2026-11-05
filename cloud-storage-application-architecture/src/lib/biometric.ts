/**
 * المصادقة البيومترية عبر WebAuthn (FaceID / البصمة) — تُدار محلياً على الجهاز.
 * تستخدم المنصة مصادقة النظام؛ لا تغادر أي بيانات بيومترية الجهاز.
 */

const storeKey = (userId: string) => `sahaab.bio.${userId}`;

function b64urlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function hasEnrolledBiometric(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(storeKey(userId)));
}

export async function enrollBiometric(userId: string, email: string, name: string): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(userId).slice(0, 64);
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "سحاب — Sahaab Cloud" },
        user: {
          id: userIdBytes as BufferSource,
          name: email,
          displayName: name,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!cred) return false;
    localStorage.setItem(storeKey(userId), b64urlEncode(cred.rawId));
    return true;
  } catch (err) {
    console.warn("biometric enroll failed", err);
    return false;
  }
}

export function removeBiometric(userId: string) {
  localStorage.removeItem(storeKey(userId));
}

export async function biometricUnlock(userId: string): Promise<boolean> {
  const stored = localStorage.getItem(storeKey(userId));
  if (!stored) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: b64urlDecode(stored) as BufferSource, type: "public-key" }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return Boolean(assertion);
  } catch (err) {
    console.warn("biometric unlock failed", err);
    return false;
  }
}
