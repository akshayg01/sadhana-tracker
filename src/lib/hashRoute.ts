import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Minimal hash-based routing — no dependency, no server SPA-fallback config.
 * Survives a hard reload on any static host and never collides with Supabase's
 * OAuth callback. Route shape: `#/<segment>/<segment>/…` e.g. `#/coordinator`.
 */

export function parseHash(hash: string = window.location.hash): string[] {
  const cleaned = hash.replace(/^#\/?/, "");
  return cleaned ? cleaned.split("/").filter(Boolean) : [];
}

export function buildHash(segments: string[]): string {
  const path = segments.filter(Boolean).join("/");
  return path ? `#/${path}` : "#/";
}

export function useHashSegments() {
  const [hash, setHash] = useState<string>(() => window.location.hash);

  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const segments = useMemo(() => parseHash(hash), [hash]);

  const navigate = useCallback((segs: string[], replace = false) => {
    const url = buildHash(segs);
    if (url === buildHash(parseHash(window.location.hash))) return;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    window.dispatchEvent(new Event("hashchange"));
  }, []);

  return [segments, navigate] as const;
}
