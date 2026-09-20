"use client";

import { Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  marketplaceShareText,
  pageUrlFromWindow,
  whatsAppShareHref,
} from "@/lib/share";

export function ShareWhatsAppButton({
  headline,
  path,
  className,
}: {
  headline: string;
  path?: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const url = pageUrlFromWindow(path);
        window.open(whatsAppShareHref(marketplaceShareText(headline, url)), "_blank");
      }}
    >
      <Share2 className="size-3.5" />
      Share
    </Button>
  );
}
