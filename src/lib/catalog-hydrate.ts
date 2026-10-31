import {
  SERVICES,
  SERVICE_ORDER,
  formatRp,
  type ProductItem,
  type Service,
  type Slug,
} from "@/lib/catalog";
import {
  getCatalog,
  type CatalogMethod,
  type CatalogService,
} from "@/lib/db/server";
import type { WebBrand } from "@/lib/db/types";

export type HydratedService = Service;

export type Storefront = {
  services: Record<Slug, Service>;
  minPrices: Record<Slug, number | null>;
  methods: CatalogMethod[];
  brand: WebBrand | null;
};

function hydrateService(service: Service, dbService: CatalogService): Service {
  if (service.bill) {
    const fixed = dbService.products[0];
    return {
      ...service,
      dbServiceId: dbService.dbId,
      billItem: fixed
        ? { n: fixed.nama, p: fixed.hargaJual, id: fixed.id }
        : null,
    };
  }

  const items: Record<string, ProductItem[]> = {};
  for (const [provider, list] of Object.entries(service.items ?? {})) {
    items[provider] = list.map((item) => {
      const dbProduct =
        dbService.products.find(
          (product) => product.nama === `${provider} · ${item.n}`,
        ) ?? dbService.products.find((product) => product.nama === item.n);
      return dbProduct
        ? { ...item, p: dbProduct.hargaJual, id: dbProduct.id }
        : item;
    });
  }

  return { ...service, dbServiceId: dbService.dbId, items };
}

function minPriceOf(service: Service): number | null {
  if (service.bill || !service.items) return null;
  let min = Number.POSITIVE_INFINITY;
  for (const list of Object.values(service.items)) {
    for (const item of list) min = Math.min(min, item.p);
  }
  return Number.isFinite(min) ? min : null;
}

export function minPriceLabel(
  minPrices: Record<string, number | null>,
  slug: Slug,
): string {
  const min = minPrices[slug];
  return min ? `mulai ${formatRp(min)}` : "lihat nominal";
}

export async function getStorefront(): Promise<Storefront> {
  const result = await getCatalog();
  const services = { ...SERVICES };
  const minPrices = Object.fromEntries(
    SERVICE_ORDER.map((slug) => [slug, minPriceOf(SERVICES[slug])]),
  ) as Record<Slug, number | null>;

  if (result.data) {
    const bySlug = new Map(
      result.data.services.map((service) => [service.slug, service]),
    );
    for (const slug of SERVICE_ORDER) {
      const dbService = bySlug.get(slug);
      if (dbService) {
        services[slug] = hydrateService(SERVICES[slug], dbService);
        minPrices[slug] = minPriceOf(services[slug]);
      }
    }
  }

  return {
    services,
    minPrices,
    methods: result.data?.methods ?? [],
    brand: result.data?.brand ?? null,
  };
}

export async function getHydratedService(slug: string) {
  const storefront = await getStorefront();
  return {
    service: storefront.services[slug as Slug] ?? null,
    services: storefront.services,
    minPrices: storefront.minPrices,
    methods: storefront.methods,
    brand: storefront.brand,
  };
}
