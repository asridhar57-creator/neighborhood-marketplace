"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ONBOARDING_WHATSAPP } from "@/lib/constants";
import { DEFAULT_NEIGHBORHOOD } from "@/lib/mock-data";
import { formatWhatsAppLink } from "@/lib/format";
import { createStoreForOwner } from "@/lib/seller/onboard";
import { createClient } from "@/lib/supabase/client";
import { useSellerUi } from "@/lib/store/use-seller-ui";
import type { BusinessType } from "@/lib/types";

type AuthMode = "password" | "otp";
type Step = "auth" | "shop";

const RETAIL_CATEGORIES = [
  "Groceries",
  "Sweets & Bakery",
  "Pharmacy",
  "Kirana",
] as const;
const SERVICE_CATEGORIES = [
  "Electrician & Repairs",
  "Plumbing",
  "Home Salon",
] as const;

export function BecomeSellerSheet() {
  const router = useRouter();
  const open = useSellerUi((state) => state.open);
  const setOpen = useSellerUi((state) => state.setOpen);
  const [step, setStep] = useState<Step>("auth");
  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("retail");
  const [category, setCategory] = useState<string>(RETAIL_CATEGORIES[0]);
  const [whatsapp, setWhatsapp] = useState("+91");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [latitude, setLatitude] = useState<number>(DEFAULT_NEIGHBORHOOD.latitude);
  const [longitude, setLongitude] = useState<number>(DEFAULT_NEIGHBORHOOD.longitude);
  const [locationLabel, setLocationLabel] = useState(
    "Madhapur default pin — tap Use Current Location",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const helpHref = formatWhatsAppLink(
    ONBOARDING_WHATSAPP,
    "Hi, I need help listing my shop on Madhapur Marketplace.",
  );

  function resetOnClose(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setStep("auth");
      setError(null);
      setOtpSent(false);
    }
  }

  function runAuth() {
    setError(null);
    startTransition(() => {
      void (async () => {
        const supabase = createClient();
        if (!supabase) {
          setStep("shop");
          return;
        }
        if (authMode === "password") {
          const signedIn = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (!signedIn.error) {
            setStep("shop");
            return;
          }
          const signedUp = await supabase.auth.signUp({
            email: email.trim(),
            password,
          });
          if (signedUp.error) {
            setError(signedUp.error.message);
            return;
          }
          if (signedUp.data.session) {
            setStep("shop");
            return;
          }
          setError(
            "Account created. Confirm the email if asked, then sign in with the same password.",
          );
          return;
        }
        if (!otpSent) {
          const sent = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: { shouldCreateUser: true },
          });
          if (sent.error) {
            setError(sent.error.message);
            return;
          }
          setOtpSent(true);
          return;
        }
        const verified = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otp.trim(),
          type: "email",
        });
        if (verified.error) {
          setError(verified.error.message);
          return;
        }
        setStep("shop");
      })();
    });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("This browser does not share location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationLabel(
          `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)} (lng/lat for ST_MakePoint)`,
        );
        setError(null);
      },
      () => {
        setError("Could not read your location. Leave the Madhapur pin or type the address.");
      },
    );
  }

  function submitShop() {
    setError(null);
    if (name.trim().length < 2) {
      setError("Add the shop or service name.");
      return;
    }
    if (!/^\+?\d{10,15}$/.test(whatsapp.replace(/\s/g, ""))) {
      setError("WhatsApp needs a country code, like +91…");
      return;
    }
    if (address.trim().length < 6) {
      setError("Add a street address so neighbors can find you.");
      return;
    }
    startTransition(() => {
      void (async () => {
        const result = await createStoreForOwner({
          name: name.trim(),
          businessType,
          category,
          whatsappNumber: whatsapp.trim(),
          address: address.trim(),
          landmark: landmark.trim(),
          longitude,
          latitude,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setOpen(false);
        setStep("auth");
        router.push("/counter");
        router.refresh();
      })();
    });
  }

  const categories =
    businessType === "retail" ? RETAIL_CATEGORIES : SERVICE_CATEGORIES;

  return (
    <Sheet open={open} onOpenChange={resetOnClose}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92dvh] max-w-3xl overflow-y-auto rounded-t-2xl pb-8"
      >
        <SheetHeader>
          <SheetTitle>
            {step === "auth" ? "Become a seller" : "Your shop on the street"}
          </SheetTitle>
          <SheetDescription>
            {step === "auth"
              ? "Sign in first so the listing is tied to your account (RLS owner_id)."
              : "Retail or service. Location is stored as ST_MakePoint(lng, lat)."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4">
          {step === "auth" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={authMode === "password" ? "default" : "outline"}
                  onClick={() => setAuthMode("password")}
                >
                  Email & password
                </Button>
                <Button
                  variant={authMode === "otp" ? "default" : "outline"}
                  onClick={() => setAuthMode("otp")}
                >
                  Email OTP
                </Button>
              </div>
              <label className="flex flex-col gap-1.5 text-sm">
                Email
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 bg-white"
                  placeholder="you@shop.in"
                />
              </label>
              {authMode === "password" ? (
                <label className="flex flex-col gap-1.5 text-sm">
                  Password
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 bg-white"
                    placeholder="At least 6 characters"
                  />
                </label>
              ) : otpSent ? (
                <label className="flex flex-col gap-1.5 text-sm">
                  OTP from email
                  <Input
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    className="h-11 bg-white"
                    placeholder="6-digit code"
                  />
                </label>
              ) : null}
              <Button
                size="lg"
                className="h-11"
                disabled={pending || email.trim().length < 3}
                onClick={runAuth}
              >
                {pending
                  ? "Working…"
                  : authMode === "otp" && !otpSent
                    ? "Send OTP"
                    : "Continue"}
              </Button>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1.5 text-sm">
                Shop or service name
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 bg-white"
                  placeholder="Sharma Kirana"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={businessType === "retail" ? "default" : "outline"}
                  onClick={() => {
                    setBusinessType("retail");
                    setCategory(RETAIL_CATEGORIES[0]);
                  }}
                >
                  Retail shop
                </Button>
                <Button
                  variant={businessType === "service" ? "default" : "outline"}
                  onClick={() => {
                    setBusinessType("service");
                    setCategory(SERVICE_CATEGORIES[0]);
                  }}
                >
                  Service
                </Button>
              </div>
              <label className="flex flex-col gap-1.5 text-sm">
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-11 rounded-lg border border-input bg-white px-2.5 text-sm"
                >
                  {categories.map((row) => (
                    <option key={row} value={row}>
                      {row}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                WhatsApp with country code
                <Input
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  className="h-11 bg-white"
                  placeholder="+91…"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                Address
                <Input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className="h-11 bg-white"
                  placeholder="Lane, Madhapur"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                Landmark
                <Input
                  value={landmark}
                  onChange={(event) => setLandmark(event.target.value)}
                  className="h-11 bg-white"
                  placeholder="Opposite the park tap"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={useCurrentLocation}
              >
                <MapPin className="size-4" />
                Use Current Location
              </Button>
              <p className="text-xs text-muted-foreground">{locationLabel}</p>
              <Button
                size="lg"
                className="h-11"
                disabled={pending}
                onClick={submitShop}
              >
                {pending ? "Listing…" : "Open my counter"}
              </Button>
            </>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <a
            href={helpHref}
            className="text-center text-sm text-stone-600 underline-offset-4 hover:underline"
          >
            Need help onboarding? Chat directly with our team on WhatsApp
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
