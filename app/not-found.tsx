import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <FileQuestion className="size-8 text-stone-400" />
      <h1 className="text-xl font-semibold">That shop isn’t on this street</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The profile may have moved, or the link is old.
      </p>
      <Button nativeButton={false} render={<Link href="/" />} className="mt-2">
        Back to neighborhood
      </Button>
    </div>
  );
}
