import { createHmac, timingSafeEqual, createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { eq } from "drizzle-orm";

const encoder = new TextEncoder();
const SECRET = process.env.APP_SECRET || "sahaab-dev-secret-change-me-in-production";

export const ACCESS_COOKIE = "sa_access";
export const REFRESH_COOKIE = "sa_refresh";
export const ACCESS_TTL = 15 * 60;
export const REFRESH_TTL = 30 * 24 * 60 * 60;
export const ONE_TB = 1099511627776;

const jwtSecret = () => encoder.encode(SECRET);

export const sha256hex = (input: string) => createHash("sha256").update(input).digest("hex");
export const randomToken = (bytes = 48) => randomBytes(bytes).toString("base64url");
export const storageHmac = (message: string) =>
  createHmac("sha256", SECRET).update(message).digest("base64url");

export function safeCompare(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function signStorageKey(key: string, expires: number) {
  return storageHmac(`v1.${key}.${expires}`);
}

export function verifyStorageSignature(key: string, expires: number, sig: string) {
  if (!expires || Number.isNaN(expires)) return false;
  if (Math.floor(Date.now() / 1000) > expires) return false;
  return safeCompare(signStorageKey(key, expires), sig);
}

export function presignPath(key: string, ttlSeconds: number) {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = signStorageKey(key, expires);
  return `/api/storage/blob?key=${encodeURIComponent(key)}&exp=${expires}&sig=${encodeURIComponent(sig)}`;
}

async function signAccessToken(user: User) {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(jwtSecret());
}

async function createRefreshSession(userId: string) {
  const token = randomToken(48);
  await db.insert(sessions).values({
    userId,
    tokenHash: sha256hex(token),
    expiresAt: new Date(Date.now() + REFRESH_TTL * 1000),
  });
  return token;
}

export async function issueSessionCookies(user: User) {
  const store = await cookies();
  const access = await signAccessToken(user);
  const refresh = await createRefreshSession(user.id);
  const base = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: process.env.NODE_ENV === "production" };
  store.set(ACCESS_COOKIE, access, { ...base, maxAge: ACCESS_TTL });
  store.set(REFRESH_COOKIE, refresh, { ...base, maxAge: REFRESH_TTL });
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getAuthUser(): Promise<User | null> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (access) {
    try {
      const { payload } = await jwtVerify(access, jwtSecret());
      if (payload.sub) {
        const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
        if (user) return user;
      }
    } catch {
      // invalid/expired
    }
  }

  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  const tokenHash = sha256hex(refresh);
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  if (!row) return null;
  if (new Date(row.session.expiresAt).getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, row.session.id));
    return null;
  }

  await db.delete(sessions).where(eq(sessions.id, row.session.id));
  await issueSessionCookies(row.user);
  return row.user;
}

export async function destroyRefreshSession() {
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (refresh) {
    await db.delete(sessions).where(eq(sessions.tokenHash, sha256hex(refresh)));
  }
  await clearSessionCookies();
}

export function publicUser(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    encryptionSalt: u.encryptionSalt,
    pinSet: Boolean(u.pinHash),
    storageLimitBytes: u.storageLimitBytes,
    storageUsedBytes: u.storageUsedBytes,
    createdAt: u.createdAt,
  };
}
