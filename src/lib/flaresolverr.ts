/* eslint-disable @typescript-eslint/no-explicit-any */

const FLARESOLVERR_URL =
  process.env.FLARESOLVERR_URL || "http://localhost:8191/v1";
const MAX_TIMEOUT = 60000;
const SESSION_NAME = "comix";

interface FlareSolverrResponse {
  status: string;
  message: string;
  solution: {
    url: string;
    status: number;
    cookies: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      expires: number;
      httpOnly: boolean;
      secure: boolean;
    }>;
    userAgent: string;
    response: string;
  };
}

let sessionReady = false;
let sessionInitPromise: Promise<void> | null = null;

/** Create or reuse a FlareSolverr session (keeps browser open for fast reuse) */
async function ensureSession(): Promise<void> {
  if (sessionReady) return;
  if (sessionInitPromise) return sessionInitPromise;

  sessionInitPromise = (async () => {
    try {
      // Try to create session (will fail if already exists, that's OK)
      await fetch(FLARESOLVERR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: "sessions.create", session: SESSION_NAME }),
      });
    } catch {
      // FlareSolverr might not be running yet
    }
    sessionReady = true;
  })();

  return sessionInitPromise;
}

/**
 * Fetch a URL through FlareSolverr with session reuse.
 * First request ~20s (solves challenge), subsequent requests ~0.3s.
 */
async function fetchViaFlareSolverr(url: string): Promise<string> {
  await ensureSession();
  console.log("[FlareSolverr] Fetching " + url);

  const response = await fetch(FLARESOLVERR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cmd: "request.get",
      url,
      session: SESSION_NAME,
      maxTimeout: MAX_TIMEOUT,
    }),
  });

  if (!response.ok) {
    throw new Error("FlareSolverr returned HTTP " + response.status);
  }

  const data: FlareSolverrResponse = await response.json();

  if (data.status !== "ok") {
    // Session might have expired, recreate it
    if (data.message && data.message.includes("not found")) {
      sessionReady = false;
      sessionInitPromise = null;
      await ensureSession();
      // Retry once
      return fetchViaFlareSolverr(url);
    }
    throw new Error("FlareSolverr failed: " + data.message);
  }

  // FlareSolverr wraps JSON in HTML <pre> tags, extract JSON
  let body = data.solution.response;
  const preMatch = body.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
  if (preMatch) {
    body = preMatch[1];
  }

  return body;
}

/**
 * Fetch JSON from a URL, with FlareSolverr fallback on 403.
 * Uses persistent session for speed (~0.3s after first solve).
 */
export async function fetchJsonWithBypass(url: string): Promise<any> {
  // Try direct fetch first (fast path, works if Cloudflare isn't blocking)
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
      },
    });
    if (response.ok) {
      return await response.json();
    }
    if (response.status !== 403) {
      throw new Error("HTTP " + response.status + ": " + response.statusText);
    }
  } catch (error: any) {
    if (error?.message && !error.message.includes("403")) {
      // Non-403 error, still try FlareSolverr
    }
  }

  // Use FlareSolverr with session
  const body = await fetchViaFlareSolverr(url);
  return JSON.parse(body);
}

// Pre-warm the session on module load
ensureSession().catch(() => {});
