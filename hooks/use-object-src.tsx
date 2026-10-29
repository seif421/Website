import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";
const SIGN_TTL_SECONDS = 3600;
// Re-sign slightly before expiry so cached URLs never go stale mid-session.
const REFRESH_MARGIN_MS = 10 * 60 * 1000;

type CacheEntry = { url: string; exp: number };

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<string | null>>();

/** True when the stored value is an object path inside the product-images bucket
 *  (as opposed to a full external URL, a data URI, or a bundled asset URL). */
export function isObjectPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("http://") &&
    !value.startsWith("https://") &&
    !value.startsWith("data:") &&
    !value.startsWith("blob:")
  );
}

async function signObjectPath(path: string): Promise<string | null> {
  const hit = cache.get(path);
  if (hit && hit.exp > Date.now()) return hit.url;

  let p = pending.get(path);
  if (!p) {
    p = supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGN_TTL_SECONDS)
      .then(({ data, error }) => {
        pending.delete(path);
        if (error || !data?.signedUrl) return null;
        cache.set(path, {
          url: data.signedUrl,
          exp: Date.now() + (SIGN_TTL_SECONDS * 1000 - REFRESH_MARGIN_MS),
        });
        return data.signedUrl;
      });
    pending.set(path, p);
  }
  return p;
}

/** Resolves a stored image reference (object path or full URL) into a renderable URL. */
export function useObjectSrc(value: string | null | undefined): string | null {
  const [src, setSrc] = useState<string | null>(() =>
    value && !isObjectPath(value) ? value : null,
  );

  useEffect(() => {
    let alive = true;
    if (!value) {
      setSrc(null);
      return;
    }
    if (!isObjectPath(value)) {
      setSrc(value);
      return;
    }
    setSrc(cache.get(value)?.url ?? null);
    signObjectPath(value).then((url) => {
      if (alive && url) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [value]);

  return src;
}

type ObjectImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  value: string | null | undefined;
};

/** <img> that renders stored product-images object paths via short-lived signed URLs. */
export function ObjectImg({ value, alt = "", ...rest }: ObjectImgProps) {
  const src = useObjectSrc(value);
  if (!src) return null;
  return <img src={src} alt={alt} {...rest} />;
}
