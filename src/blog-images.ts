export function resizeUnsplashImage(src: string, width: number): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  if (url.origin !== "https://images.unsplash.com") return src;

  url.searchParams.set("w", String(width));
  url.searchParams.set("q", "100");
  return url.toString();
}
