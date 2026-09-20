"use client";

import { useEffect } from "react";

import {
  useActiveOrder,
  writeActiveOrderToStorage,
  type ActiveOrderSnapshot,
} from "@/lib/store/use-active-order";

export function RememberActiveOrder({
  order_id,
  verification_pin,
  store_name,
  total_amount,
  status,
  whatsapp_number,
  fulfillment_type,
}: ActiveOrderSnapshot) {
  const saveOrder = useActiveOrder((state) => state.saveOrder);

  useEffect(() => {
    if (!verification_pin) {
      return;
    }
    const snapshot: ActiveOrderSnapshot = {
      order_id,
      verification_pin,
      store_name,
      total_amount,
      status,
      whatsapp_number,
      fulfillment_type,
    };
    saveOrder(snapshot);
    writeActiveOrderToStorage(snapshot);
  }, [
    order_id,
    verification_pin,
    store_name,
    total_amount,
    status,
    whatsapp_number,
    fulfillment_type,
    saveOrder,
  ]);

  return null;
}
