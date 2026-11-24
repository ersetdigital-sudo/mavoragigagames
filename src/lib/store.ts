import type { Slug } from "./catalog";

export const ORDERS_KEY = "mavoragigagames_invoices";
export const ADMIN_WA = "085711172317";
export const WA_LINK = "https://wa.me/6285711172317";
export const PAID_MESSAGE = "Terima kasih, pembayaran Anda sedang diproses";

export type RecentInvoice = {
  ref: string;
  label: string;
  product: string;
  slug: Slug;
  amount: number;
  createdAt: number;
};

export const rememberInvoice = (entry: RecentInvoice): void => {
  if (typeof window === "undefined") return;
  const ref = entry.ref.trim().toUpperCase();
  if (!ref) return;
  try {
    const list = loadInvoices().filter((item) => item.ref !== ref);
    const next = [{ ...entry, ref }, ...list].slice(0, 5);
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
};

export const loadInvoices = (): RecentInvoice[] => {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ORDERS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      if (typeof row.ref !== "string") return [];
      return [
        {
          ref: row.ref,
          label: typeof row.label === "string" ? row.label : "-",
          product: typeof row.product === "string" ? row.product : "",
          slug: (typeof row.slug === "string" ? row.slug : "pulsa") as Slug,
          amount: Number(row.amount) || 0,
          createdAt: Number(row.createdAt) || Date.now(),
        },
      ];
    });
  } catch {
    return [];
  }
};

export const waLink = (message: string) =>
  `${WA_LINK}?text=${encodeURIComponent(message)}`;

export const formatTime = (value: number) =>
  new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const formatDate = (value: number) =>
  new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
