export type BusinessType = "retail" | "service";

export type FulfillmentType = "pickup" | "self_delivery";

export type Store = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  category: string;
  serviceTags: string[];
  visitingCharge: number | null;
  latitude: number;
  longitude: number;
  address: string;
  landmark: string | null;
  whatsappNumber: string;
  allowsPickup: boolean;
  allowsSelfDelivery: boolean;
  deliveryRadiusKm: number;
  isTakingOrders: boolean;
  completedOrdersCount: number;
  isActive: boolean;
  isSponsored: boolean;
  sponsoredUntil: string | null;
};

export type Product = {
  id: string;
  storeId: string;
  title: string;
  shortDescription: string | null;
  attributes: Record<string, string>;
  price: number;
  mrp: number | null;
  images: string[];
  isAvailable: boolean;
  unitsSoldCount: number;
};

export type NeighborhoodListing = {
  store: Store;
  distanceMeters: number;
  matchedProductTitle: string | null;
  matchedProductPrice: number | null;
  searchText: string;
};

export type CartItem = {
  productId: string;
  storeId: string;
  title: string;
  unitPrice: number;
  quantity: number;
};

export type PlacedOrder = {
  id: string;
  storeId: string;
  storeName: string;
  totalAmount: number;
  fulfillmentType: FulfillmentType;
  deliveryAddress: string | null;
  verificationPin: string;
  status: "placed";
  items: CartItem[];
  createdAt: string;
};
