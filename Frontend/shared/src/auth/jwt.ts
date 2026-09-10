const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

export interface DecodedAccessToken {
  sub: string;
  email: string;
  name: string;
  staff_member_id?: string;
  exp: number;
  [ROLE_CLAIM]: string | string[] | undefined;
}

/** Plain atob+JSON.parse mangles any non-ASCII payload byte (e.g. a Cyrillic
 * FullName claim) — decode via TextDecoder so UTF-8 survives. */
function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Decodes a JWT payload for reading claims client-side, purely for UI
 * purposes. Never treat this as verification — the server is the only
 * authority on whether the token is genuine.
 */
export function decodeJwt(token: string): DecodedAccessToken | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(base64UrlDecode(payload)) as DecodedAccessToken;
  } catch {
    return null;
  }
}

export function isTokenExpired(decoded: { exp: number } | null): boolean {
  if (!decoded) return true;
  return decoded.exp * 1000 <= Date.now();
}

export { ROLE_CLAIM };
