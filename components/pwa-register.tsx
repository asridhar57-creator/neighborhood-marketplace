"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    const host = window.location.hostname;
    if (host === "127.0.0.1" || host === "localhost") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
          void reg.unregister();
        });
      });
      return;
    }
    void navigator.serviceWorker.register("/sw.js");
  }, []);
  return null;
}
