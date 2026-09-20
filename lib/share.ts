import { MARKETPLACE_SHARE_NAME } from "@/lib/constants";

export function marketplaceShareText(headline: string, url: string): string {
  return `${headline}\n${MARKETPLACE_SHARE_NAME}\n${url}`;
}

export function whatsAppShareHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function pageUrlFromWindow(path?: string): string {
  if (typeof window === "undefined") {
    return path ?? "";
  }
  if (path) {
    return `${window.location.origin}${path}`;
  }
  return window.location.href;
}
