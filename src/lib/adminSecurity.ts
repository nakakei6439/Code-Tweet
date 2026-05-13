export const ADMIN_SESSION_COOKIE = "code_tweet_admin_session";
export const ADMIN_LOGIN_SESSION_COOKIE = "code_tweet_admin_login_session";

type AdminSecurityConfig = {
  basicUser: string;
  basicPassword: string;
  totpSecret: string;
  sessionSecret: string;
  maxFailedAttempts: number;
  lockoutMinutes: number;
};

type AdminSessionPayload = {
  email: string;
  exp: number;
  iat: number;
};

type AdminAttemptRow = {
  identifier: string;
  failed_count: number | null;
  locked_until: string | null;
};

export type AdminLockState = {
  locked: boolean;
  lockedUntil: string | null;
};

const textEncoder = new TextEncoder();

export function getAdminSecurityConfig(): AdminSecurityConfig | null {
  const basicUser = process.env.ADMIN_BASIC_USER;
  const basicPassword = process.env.ADMIN_BASIC_PASSWORD;
  const totpSecret = process.env.ADMIN_TOTP_SECRET;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!basicUser || !basicPassword || !totpSecret || !sessionSecret) {
    return null;
  }

  return {
    basicUser,
    basicPassword,
    totpSecret,
    sessionSecret,
    maxFailedAttempts: positiveNumber(process.env.ADMIN_MAX_FAILED_ATTEMPTS, 10),
    lockoutMinutes: positiveNumber(process.env.ADMIN_LOCKOUT_MINUTES, 30),
  };
}

export function getMissingAdminSecurityEnv(): string[] {
  return [
    "ADMIN_BASIC_USER",
    "ADMIN_BASIC_PASSWORD",
    "ADMIN_TOTP_SECRET",
    "ADMIN_SESSION_SECRET",
  ].filter((key) => !process.env[key]);
}

export function getAdminBasicAttemptIdentifier(): string {
  const config = getAdminSecurityConfig();
  return `admin-basic:${config?.basicUser ?? "missing"}`;
}

export function getAdminTotpAttemptIdentifier(email: string): string {
  return `admin-totp:${email.trim().toLowerCase()}`;
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const aBytes = textEncoder.encode(a);
  const bBytes = textEncoder.encode(b);
  const length = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (aBytes[index] ?? 0) ^ (bBytes[index] ?? 0);
  }

  return diff === 0;
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const config = getAdminSecurityConfig();
  if (!config) return false;

  return (
    timingSafeEqualString(username, config.basicUser) &&
    timingSafeEqualString(password, config.basicPassword)
  );
}

export async function createAdminSessionCookieValue(email: string): Promise<string> {
  const config = getAdminSecurityConfig();
  if (!config) throw new Error("Admin security environment variables are missing");

  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    email: email.trim().toLowerCase(),
    iat: now,
    exp: now + 60 * 60,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signAdminSession(encodedPayload, config.sessionSecret);
  return `${encodedPayload}.${signature}`;
}

export async function verifyAdminSessionCookieValue(
  value: string | undefined,
  email: string | null | undefined,
): Promise<boolean> {
  const config = getAdminSecurityConfig();
  if (!config || !value || !email) return false;

  const [encodedPayload, signature, extra] = value.split(".");
  if (!encodedPayload || !signature || extra) return false;

  const expectedSignature = await signAdminSession(encodedPayload, config.sessionSecret);
  if (!timingSafeEqualString(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminSessionPayload;
    const now = Math.floor(Date.now() / 1000);
    return (
      payload.exp > now &&
      timingSafeEqualString(payload.email, email.trim().toLowerCase())
    );
  } catch {
    return false;
  }
}

type AdminLoginSessionPayload = {
  user: string;
  exp: number;
  iat: number;
};

export async function createAdminLoginSessionCookieValue(username: string): Promise<string> {
  const config = getAdminSecurityConfig();
  if (!config) throw new Error("Admin security environment variables are missing");

  const now = Math.floor(Date.now() / 1000);
  const payload: AdminLoginSessionPayload = {
    user: username,
    iat: now,
    exp: now + 60 * 60,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signAdminSession(encodedPayload, config.sessionSecret);
  return `${encodedPayload}.${signature}`;
}

export async function verifyAdminLoginSessionCookieValue(value: string | undefined): Promise<boolean> {
  const config = getAdminSecurityConfig();
  if (!config || !value) return false;

  const [encodedPayload, signature, extra] = value.split(".");
  if (!encodedPayload || !signature || extra) return false;

  const expectedSignature = await signAdminSession(encodedPayload, config.sessionSecret);
  if (!timingSafeEqualString(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminLoginSessionPayload;
    const now = Math.floor(Date.now() / 1000);
    return (
      payload.exp > now &&
      timingSafeEqualString(payload.user, config.basicUser)
    );
  } catch {
    return false;
  }
}

export async function verifyTotp(code: string): Promise<boolean> {
  const config = getAdminSecurityConfig();
  if (!config) return false;

  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;

  const timestep = Math.floor(Date.now() / 1000 / 30);
  let secret: Uint8Array;
  try {
    secret = base32Decode(config.totpSecret);
  } catch {
    return false;
  }
  const expectedCodes = await Promise.all(
    [-1, 0, 1].map((offset) => generateTotp(secret, timestep + offset)),
  );

  return expectedCodes.some((expected) => timingSafeEqualString(expected, normalized));
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getAdminLockState(identifier: string): Promise<AdminLockState> {
  const row = await fetchAdminAttemptRow(identifier);
  return toLockState(row);
}

export async function recordAdminLoginFailure(identifier: string): Promise<AdminLockState> {
  const config = getAdminSecurityConfig();
  if (!config) {
    return { locked: true, lockedUntil: null };
  }

  const existing = await fetchAdminAttemptRow(identifier);
  const existingLock = toLockState(existing);
  if (existingLock.locked) return existingLock;

  const failedCount = (existing?.failed_count ?? 0) + 1;
  const lockedUntil =
    failedCount >= config.maxFailedAttempts
      ? new Date(Date.now() + config.lockoutMinutes * 60 * 1000).toISOString()
      : null;

  await upsertAdminAttemptRow(identifier, failedCount, lockedUntil);
  return { locked: Boolean(lockedUntil), lockedUntil };
}

export async function resetAdminLoginFailures(identifier: string): Promise<void> {
  await upsertAdminAttemptRow(identifier, 0, null);
}

function toLockState(row: AdminAttemptRow | null): AdminLockState {
  if (!row?.locked_until) return { locked: false, lockedUntil: null };
  const locked = Date.parse(row.locked_until) > Date.now();
  return { locked, lockedUntil: locked ? row.locked_until : null };
}

async function fetchAdminAttemptRow(identifier: string): Promise<AdminAttemptRow | null> {
  const url = getSupabaseRestUrl(
    `/admin_login_attempts?identifier=eq.${encodeURIComponent(identifier)}&select=identifier,failed_count,locked_until&limit=1`,
  );
  if (!url) return null;

  const response = await fetch(url, {
    headers: getSupabaseAdminHeaders(),
    cache: "no-store",
  });
  if (!response.ok) return null;

  const rows = (await response.json()) as AdminAttemptRow[];
  return rows[0] ?? null;
}

async function upsertAdminAttemptRow(
  identifier: string,
  failedCount: number,
  lockedUntil: string | null,
): Promise<void> {
  const url = getSupabaseRestUrl("/admin_login_attempts?on_conflict=identifier");
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: {
      ...getSupabaseAdminHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      identifier,
      failed_count: failedCount,
      locked_until: lockedUntil,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });
}

function getSupabaseRestUrl(path: string): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return `${baseUrl.replace(/\/$/, "")}/rest/v1${path}`;
}

function getSupabaseAdminHeaders(): Record<string, string> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

async function signAdminSession(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function base64UrlEncode(value: string): string {
  return base64UrlEncodeBytes(textEncoder.encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

function base32Decode(value: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = value.toUpperCase().replace(/=+$/g, "").replace(/\s/g, "");
  let bits = "";

  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("Invalid TOTP secret");
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return new Uint8Array(bytes);
}

async function generateTotp(secret: Uint8Array, counter: number): Promise<string> {
  const counterBytes = new ArrayBuffer(8);
  const view = new DataView(counterBytes);
  view.setUint32(4, counter);

  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes));
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, "0");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
