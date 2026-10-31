import type { Metadata } from "next";
import { LayananClient } from "@/components/LayananClient";
import { getStorefront } from "@/lib/catalog-hydrate";

export const metadata: Metadata = {
  title: "Katalog Layanan",
};

export default async function LayananPage() {
  const storefront = await getStorefront();

  return (
    <main className="box pt-10">
      <LayananClient minPrices={storefront.minPrices} />
    </main>
  );
}
