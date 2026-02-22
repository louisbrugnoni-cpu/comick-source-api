/* eslint-disable @typescript-eslint/no-explicit-any */

const FLARESOLVERR_URL =
  process.env.FLARESOLVERR_URL || "http://localhost:8191/v1";
const MAX_TIMEOUT = 60000;

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

// Cache for session cookies and user agent
let cachedCookies: string = "";
let cachedUserAgent: string = "";
let cookieExpiry: number = 0;

/**
 * Fetch a URL through FlareSolverr (bypasses Cloudflare)
 * Returns the response body as a string
 */
export async function fetchViaFlareSolverr(url: string): Promise<string> {
  console.log("[FlareSolverr] Fetching " + url);

  const response = await fetch(FLARESOLVERR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cmd: "request.get",
      url,
      maxTimeout: MAX_TIMEOUT,
    }),
  });

  if (!response.ok) {
    throw new Error("FlareSolverr returned HTTP " + response.status);
  }

  const data: FlareSolverrResponse = await response.json();

  if (data.status !== "ok") {
    throw new Error("FlareSolverr failed: " + data.message);
  }

  // Update cached cookies for direct fetch attempts
  if (data.solution.cookies && data.solution.cookies.length > 0) {
    cachedCookies = data.solution.cookies
      .map((c) => c.name + "=" + c.value)
      .join("; ");
    cachedUserAgent = data.solution.userAgent;
    // Cache for 10 minutes (cf_clearance typically lasts longer)
    cookieExpiry = Date.now() + 10 * 60 * 1000;
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
 * Fetch JSON from a URL, with FlareSolverr fallback on 403
 * First tries direct fetch (fast), falls back to FlareSolverr on Cloudflare block
 */
export async function fetchJsonWithBypass(url: string): Promise<any> {
  // Try with cached cookies first (if we have them and they haven't expired)
  if (cachedCookies && Date.now() < cookieExpiry) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": cachedUserAgent,
          Cookie: cachedCookies,
          Accept: "application/json, text/plain, */*",
        },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fall through to FlareSolverr
    }
  }

  // Try direct fetch (no cookies)
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
    console.log("[FlareSolverr] Got 403 on " + url + ", using FlareSolverr...");
  } catch (error: any) {
    if (error?.message && !error.message.includes("403")) {
      console.log(
        "[FlareSolverr] Direct fetch failed: " +
          error.message +
          ", trying FlareSolverr...",
      );
    }
  }

  // Use FlareSolverr
  const body = await fetchViaFlareSolverr(url);
  return JSON.parse(body);
}
