"use client";

import { useEffect } from "react";

import {
  useActiveOrder,
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
    void Promise.resolve(useActiveOrder.persist.rehydrate()).then(() => {
      saveOrder({
        order_id,
        verification_pin,
        store_name,
        total_amount,
        status,
        whatsapp_number,
        fulfillment_type,
      });
    });
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
