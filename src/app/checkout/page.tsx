import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutClient } from "@/components/CheckoutClient";
import { isSlug } from "@/lib/catalog";
import { getStorefront } from "@/lib/catalog-hydrate";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string | string[]; n?: string | string[] }>;
}) {
  const params = await searchParams;
  const slugParam = Array.isArray(params.s) ? params.s[0] : params.s;
  const prefillParam = Array.isArray(params.n) ? params.n[0] : params.n;
  const slug = isSlug(slugParam) ? slugParam : "pulsa";
  const prefill = prefillParam ?? "";

  const storefront = await getStorefront();
  const qrisMethod =
    storefront.methods.find(
      (method) => method.name.toLowerCase() === "qris",
    ) ??
    storefront.methods[0] ??
    null;
  const service = storefront.services[slug];

  return (
    <Suspense
      fallback={
        <main className="box pt-8">
          <div className="pn mono mut p-8 text-sm">memuat checkout…</div>
        </main>
      }
    >
      <CheckoutClient
        key={`${slug}:${prefill}`}
        service={service}
        slug={slug}
        prefill={prefill}
        brandSlug={storefront.brand?.slug ?? ""}
        qrisMethodId={qrisMethod?.id ?? null}
      />
    </Suspense>
  );
}
