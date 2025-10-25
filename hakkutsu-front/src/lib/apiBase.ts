// Centralized API base resolver for local/dev/prod
// Priority:
// 1) NEXT_PUBLIC_API_URL if set (Vercel/CI or local .env)
// 2) If running in browser and on localhost, default to local API
// 3) Otherwise, require env (fail loud to avoid hitting wrong host)

export function apiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:4000";
    }
  }

  // As a safe default for server-side or unknown hosts, throw to surface misconfig
  throw new Error(
    "NEXT_PUBLIC_API_URL is not set. Configure it for dev/prod or run on localhost."
  );
}

