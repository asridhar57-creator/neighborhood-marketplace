import { Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatTelLink, formatWhatsAppLink } from "@/lib/format";
import type { Store } from "@/lib/types";

export function ContactActions({ store }: { store: Store }) {
  const message =
    store.businessType === "service"
      ? `Hi ${store.name}, I found you on Neighborhood Marketplace. Are you available today?`
      : `Hi ${store.name}, I have a question about an item.`;

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        size="lg"
        className="h-11"
        nativeButton={false}
        render={<a href={formatTelLink(store.whatsappNumber)} />}
      >
        <Phone className="size-4" />
        Call
      </Button>
      <Button
        size="lg"
        className="h-11"
        nativeButton={false}
        render={<a href={formatWhatsAppLink(store.whatsappNumber, message)} />}
      >
        WhatsApp
      </Button>
    </div>
  );
}
