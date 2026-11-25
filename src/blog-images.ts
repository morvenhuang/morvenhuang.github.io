const UNSPLASH_HOSTNAMES = new Set(["images.unsplash.com", "plus.unsplash.com"]);

export function resizeUnsplashImage(src: string, width: number): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  if (!UNSPLASH_HOSTNAMES.has(url.hostname)) return src;

  url.searchParams.set("w", String(width));
  url.searchParams.set("q", "100");
  return url.toString();
}
