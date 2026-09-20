export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function formatTelLink(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length === 10) {
    return `tel:+91${digits}`;
  }
  if (digits.startsWith("91")) {
    return `tel:+${digits}`;
  }
  return `tel:${phone.replace(/\s/g, "")}`;
}

export function googleMapsNavigateUrl(input: {
  fulfillmentType: "pickup" | "self_delivery";
  deliveryAddress: string | null;
  latitude: number;
  longitude: number;
  address: string;
}): string {
  const destination =
    input.fulfillmentType === "self_delivery" && input.deliveryAddress
      ? input.deliveryAddress
      : input.latitude && input.longitude
        ? `${input.latitude},${input.longitude}`
        : input.address;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
