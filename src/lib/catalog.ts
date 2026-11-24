import type { IconName } from "./icons";

export type Slug =
  | "pulsa"
  | "paket-data"
  | "e-wallet"
  | "pln"
  | "pdam"
  | "tv-internet"
  | "game"
  | "bpjs"
  | "multifinance";

export type Category = "isi" | "tagihan" | "hiburan";

export type ProductItem = {
  n: string;
  p: number;
  cost?: number;
  sub?: string;
  id?: string;
};

export type Service = {
  name: string;
  cat: Category;
  catL: string;
  icon: IconName;
  desc: string;
  label: string;
  ph: string;
  targetType: "phone" | "id";
  detect?: boolean;
  bill?: boolean;
  admin?: number;
  prov: string[];
  items?: Record<string, ProductItem[]>;
  dbServiceId?: string;
  billItem?: ProductItem | null;
};

export const formatRp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
const fmt = (n: number) => n.toLocaleString("id-ID");

const OPERATORS: Record<string, string[]> = {
  Telkomsel: ["0811", "0812", "0813", "0821", "0822", "0823", "0851", "0852", "0853"],
  Indosat: ["0814", "0815", "0816", "0855", "0856", "0857", "0858"],
  XL: ["0817", "0818", "0819", "0859", "0877", "0878"],
  Axis: ["0831", "0832", "0833", "0838"],
  Tri: ["0895", "0896", "0897", "0898", "0899"],
  Smartfren: ["0881", "0882", "0883", "0884", "0885", "0886", "0887", "0888", "0889"],
};

export const OPERATOR_NAMES = Object.keys(OPERATORS);

export const normalizePhone = (value: string) => {
  let v = (value || "").replace(/\D/g, "");
  if (v.startsWith("62")) v = "0" + v.slice(2);
  else if (v.startsWith("8")) v = "0" + v;
  return v;
};

export const detectOperator = (value: string) => {
  const prefix = normalizePhone(value).slice(0, 4);
  if (prefix.length < 4) return null;
  for (const name of OPERATOR_NAMES) {
    if (OPERATORS[name].includes(prefix)) return name;
  }
  return null;
};

const round100 = (value: number) => Math.round(value / 100) * 100;
const ceil100 = (value: number) => Math.ceil(value / 100) * 100;
const labelRb = (k: number) => (k >= 1000 ? `${k / 1000}jt` : `${k}rb`);

/*
 * Harga referensi (riset 24 Nov 2026):
 * - Modal pulsa : harga umum supplier Juragan Pulsa (juraganpulsa.co.id/harga), per operator.
 * - Harga jual  : disejajarkan dengan harga eceran marketplace (Tokopedia: 15rb Rp16.300,
 *                 25rb Rp26.300, 30rb Rp31.000) dan supplier eceran (Fastpay 100rb ~Rp100.500).
 * Nominal yang tidak ada di daftar supplier (75rb ke atas) diestimasi dari rasio 100rb operator itu.
 * Semua harga bisa diubah dari dashboard admin > Produk.
 */
const PULSA_NOMINAL = [5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200, 300, 500, 1000];
const PULSA_SELL: Record<number, number> = {
  5: 7000,
  10: 11500,
  15: 16300,
  20: 21000,
  25: 26300,
  30: 31000,
  50: 51000,
  75: 76000,
  100: 100500,
  150: 151000,
  200: 201000,
  300: 301500,
  500: 502000,
  1000: 1003000,
};
const PULSA_KNOWN = [5, 10, 15, 20, 25, 30, 50, 100];
const PULSA_COST: Record<string, number[]> = {
  Telkomsel: [5210, 10277, 14895, 19910, 24760, 29575, 49345, 96715],
  Indosat: [6665, 11642, 15808, 20686, 25328, 30441, 48944, 95310],
  XL: [5902, 11002, 15158, 20160, 25150, 30170, 50185, 99784],
  Axis: [5902, 11002, 15158, 20160, 25150, 30170, 50185, 99784],
  Tri: [5161, 10220, 14699, 19667, 24553, 29457, 48881, 95275],
  Smartfren: [5083, 10183, 15183, 20183, 25186, 30183, 50158, 100158],
};

const pulsaCost = (operator: string, k: number) => {
  const costs = PULSA_COST[operator] ?? PULSA_COST.Telkomsel;
  const known = PULSA_KNOWN.indexOf(k);
  if (known >= 0) return costs[known];
  return Math.round(k * 1000 * (costs[PULSA_KNOWN.length - 1] / 100000));
};

const pulsa = (operator: string): ProductItem[] =>
  PULSA_NOMINAL.map((k) => {
    const cost = pulsaCost(operator, k);
    return {
      n: `Pulsa ${labelRb(k)}`,
      // tidak pernah di bawah modal + Rp300 (mis. Indosat 5rb-15rb sedikit lebih mahal)
      p: Math.max(PULSA_SELL[k], ceil100(cost + 300)),
      cost,
    };
  });

/*
 * Paket data: nama & modal dari daftar sistem Fastpay (ppobfastpay.com, dicek 3 Sep 2026).
 * Contoh produk populer, bukan semua varian; sebagian paket berbasis zona/nomor.
 * Harga jual = modal + margin bertingkat.
 */
const dataMargin = (cost: number) =>
  cost < 15000 ? 1000 : cost < 30000 ? 1500 : cost < 60000 ? 2000 : cost < 100000 ? 2500 : 3000;

const DATA_PACKS: Record<string, [string, number][]> = {
  Telkomsel: [
    ["2 GB · 3 hari", 12325],
    ["3 GB Nasional · 5 hari", 14395],
    ["by.U 13 GB · 5 hari", 18400],
    ["by.U 12 GB · 14 hari", 27300],
    ["7 GB · 7 hari", 27675],
    ["5 GB Nasional · 30 hari", 46000],
    ["All Net 6 GB · 30 hari", 62150],
    ["All Net 8 GB · 30 hari", 68950],
  ],
  Indosat: [
    ["Freedom Internet 6 GB · 2 hari", 11750],
    ["Freedom Internet 7 GB · 14 hari", 24300],
    ["Freedom Internet 14 GB · 28 hari", 50374],
    ["Freedom Spesial 30 GB · 30 hari", 54300],
    ["Freedom Spesial 60 GB · 30 hari", 94300],
    ["Istimewa 100 GB · 30 hari", 100000],
    ["Freedom Internet 50 GB · 28 hari", 121000],
    ["Istimewa 160 GB · 30 hari", 124200],
    ["Istimewa 240 GB · 30 hari", 147000],
  ],
  XL: [
    ["Data Flex Mini 6 GB · 3 hari", 14675],
    ["Data Flex Mini 6 GB · 7 hari", 19280],
    ["Data Flex Mini 10 GB · 7 hari", 24125],
    ["Data Flex 5 GB · 14 hari", 32500],
    ["Data Flex 7 GB · 28 hari", 33345],
    ["Data Flex 10 GB · 28 hari", 37500],
    ["Data Flex 13 GB · 28 hari", 46575],
    ["Data Flex 23 GB · 28 hari", 55400],
    ["Data Flex 34 GB · 28 hari", 72900],
  ],
  Axis: [
    ["AIGO 1 GB + Kuota di Kotamu · 1 hari", 6300],
    ["AIGO Mini 3 GB + Lokal · 3 hari", 10100],
    ["AIGO 8,5 GB + Kuota di Kotamu · 3 hari", 13450],
    ["AIGO 12,5 GB + Kuota di Kotamu · 3 hari", 15800],
    ["Paket Harian 5,5 GB + Lokal · 5 hari", 16250],
    ["AIGO 16 GB + Kuota di Kotamu · 5 hari", 22100],
    ["Paket Harian 10 GB + Lokal · 5 hari", 22150],
    ["AIGO Mini 5 GB + Lokal · 14 hari", 23950],
  ],
  Tri: [
    ["Data Happy 6 GB · 1 hari", 7525],
    ["Gift Data 1 GB · 14 hari", 6300],
    ["Gift Data 2 GB · 14 hari", 11850],
    ["Happy Harian 3 GB + 1 GB Lokal · 3 hari", 12490],
    ["Gift Data 3 GB · 14 hari", 17400],
    ["Gift Data 3,5 GB · 30 hari", 20175],
    ["Gift Data 4 GB · 14 hari", 22950],
    ["Gift Data 5 GB · 14 hari", 28500],
  ],
  Smartfren: [
    ["Smart Data 8 GB + Unlimited Nonstop · 1 hari", 8400],
    ["Smart Data 1 GB · 7 hari", 9500],
    ["Smart Data 6 GB + Unlimited Nonstop · 3 hari", 11900],
    ["Unlimited Nonstop 2 GB · 10 hari", 12950],
    ["Smart Data 10 GB + Unlimited Nonstop · 3 hari", 14900],
    ["Smart Data 6 GB · 7 hari", 17500],
    ["Smart Data 3 GB + Unlimited Nonstop · 14 hari", 21000],
    ["Smart Data 5 GB · 14 hari", 22000],
    ["Smart Data 7 GB + Unlimited · 30 hari", 32900],
  ],
};

const paket = (operator: string): ProductItem[] =>
  (DATA_PACKS[operator] ?? []).map(([n, cost]) => ({
    n,
    p: ceil100(cost + dataMargin(cost)),
    cost,
  }));

const nominal = (
  list: number[],
  admin: number | ((v: number) => number),
  label = "Saldo",
  costAdmin = 0,
): ProductItem[] =>
  list.map((v) => {
    const a = typeof admin === "function" ? admin(v) : admin;
    return { n: `${label} ${fmt(v)}`, p: v + a, cost: v + costAdmin, sub: `Admin ${formatRp(a)}` };
  });

/* E-wallet: admin jual bertingkat Rp1.500-3.000, modal = nominal + fee supplier (DANA ~200, lainnya ~800). */
const ewalletAdmin = (v: number) => (v <= 50000 ? 1500 : v <= 100000 ? 2000 : v <= 200000 ? 2500 : 3000);
const EWALLET_NOMINAL = [10000, 15000, 20000, 25000, 30000, 50000, 75000, 100000, 150000, 200000, 300000, 500000];

const fill = (list: string[], fn: (value: string) => ProductItem[]) =>
  Object.fromEntries(list.map((x) => [x, fn(x)])) as Record<string, ProductItem[]>;

const itemList = (rows: [string, number][]): ProductItem[] =>
  rows.map(([n, p]) => ({ n, p, cost: round100(p * 0.96) }));

const wallets = ["DANA", "OVO", "GoPay", "ShopeePay", "LinkAja"];

export const SERVICES: Record<Slug, Service> = {
  pulsa: {
    name: "Pulsa",
    cat: "isi",
    catL: "Isi ulang",
    icon: "phone",
    desc: "Isi pulsa semua operator, masuk dalam hitungan detik.",
    label: "Nomor HP",
    ph: "0812 3456 7890",
    targetType: "phone",
    detect: true,
    prov: OPERATOR_NAMES,
    items: fill(OPERATOR_NAMES, pulsa),
  },
  "paket-data": {
    name: "Paket Data",
    cat: "isi",
    catL: "Isi ulang",
    icon: "wifi",
    desc: "Kuota internet harian sampai bulanan, langsung aktif.",
    label: "Nomor HP",
    ph: "0812 3456 7890",
    targetType: "phone",
    detect: true,
    prov: OPERATOR_NAMES,
    items: fill(OPERATOR_NAMES, paket),
  },
  "e-wallet": {
    name: "E-Wallet",
    cat: "isi",
    catL: "Isi ulang",
    icon: "wallet",
    desc: "Top up saldo DANA, OVO, GoPay, ShopeePay & LinkAja.",
    label: "Nomor HP terdaftar",
    ph: "0812 3456 7890",
    targetType: "phone",
    prov: wallets,
    items: fill(wallets, (w) => nominal(EWALLET_NOMINAL, ewalletAdmin, "Saldo", w === "DANA" ? 200 : 800)),
  },
  pln: {
    name: "Token PLN",
    cat: "tagihan",
    catL: "Tagihan",
    icon: "bolt",
    desc: "Beli token listrik prabayar, kode token langsung muncul.",
    label: "Nomor meter / ID pelanggan",
    ph: "5123 4567 8901",
    targetType: "id",
    prov: ["PLN Prabayar"],
    items: {
      // modal ~ nominal + Rp1.800 (Okekios/Portalpulsa), jual nominal + admin Rp2.500
      "PLN Prabayar": nominal([20000, 50000, 100000, 200000, 300000, 500000, 1000000], 2500, "Token", 1800),
    },
  },
  pdam: {
    name: "PDAM",
    cat: "tagihan",
    catL: "Tagihan",
    icon: "drop",
    desc: "Bayar tagihan air PDAM se-Indonesia tanpa antre.",
    label: "ID pelanggan PDAM",
    ph: "0123456789",
    targetType: "id",
    bill: true,
    admin: 2500,
    prov: ["PDAM Jakarta", "PDAM Surabaya", "PDAM Bandung", "PDAM Medan"],
  },
  "tv-internet": {
    name: "TV & Internet",
    cat: "tagihan",
    catL: "Tagihan",
    icon: "tv",
    desc: "IndiHome, Biznet, First Media, MyRepublic, semua bisa.",
    label: "Nomor pelanggan",
    ph: "1234 5678 90",
    targetType: "id",
    bill: true,
    admin: 2500,
    prov: ["IndiHome", "Biznet", "First Media", "MyRepublic"],
  },
  game: {
    name: "Voucher Game",
    cat: "hiburan",
    catL: "Hiburan",
    icon: "game",
    desc: "Diamond, UC, dan voucher game favoritmu.",
    label: "User ID (dan Zone ID)",
    ph: "12345678 (1234)",
    targetType: "id",
    prov: ["Mobile Legends", "Free Fire", "PUBG Mobile"],
    items: {
      // Harga mengikuti katalog Codashop/UniPin Indonesia; nominal lain diturunkan dari rasio per diamond/UC.
      "Mobile Legends": itemList([
        ["12 Diamonds", 3500],
        ["28 Diamonds", 8000],
        ["44 Diamonds", 12500],
        ["86 Diamonds", 24500],
        ["172 Diamonds", 48500],
        ["257 Diamonds", 72000],
        ["344 Diamonds", 97000],
        ["429 Diamonds", 121000],
        ["514 Diamonds", 145000],
        ["706 Diamonds", 190000],
        ["878 Diamonds", 236000],
        ["Weekly Diamond Pass", 28000],
      ]),
      "Free Fire": itemList([
        ["50 Diamonds", 7500],
        ["70 Diamonds", 10000],
        ["100 Diamonds", 14500],
        ["140 Diamonds", 20000],
        ["210 Diamonds", 30000],
        ["355 Diamonds", 50000],
        ["530 Diamonds", 75000],
        ["720 Diamonds", 100000],
        ["1080 Diamonds", 150000],
        ["1450 Diamonds", 200000],
        ["2180 Diamonds", 300000],
        ["Membership Mingguan", 29500],
        ["Membership Bulanan", 148000],
      ]),
      "PUBG Mobile": itemList([
        ["60 UC", 15000],
        ["120 UC", 30000],
        ["180 UC", 45000],
        ["325 UC", 74900],
        ["385 UC", 89900],
        ["660 UC", 149800],
        ["720 UC", 164000],
        ["1800 UC", 374500],
        ["3850 UC", 740000],
      ]),
    },
  },
  bpjs: {
    name: "BPJS Kesehatan",
    cat: "tagihan",
    catL: "Tagihan",
    icon: "shield",
    desc: "Iuran BPJS Kesehatan per kelas, bisa bayar beberapa bulan.",
    label: "Nomor VA / No. BPJS",
    ph: "8888 8012 3456 7890",
    targetType: "id",
    prov: ["Kelas 1", "Kelas 2", "Kelas 3"],
    items: fill(["Kelas 1", "Kelas 2", "Kelas 3"], (k) => {
      const base = { "Kelas 1": 150000, "Kelas 2": 100000, "Kelas 3": 35000 }[k] as number;
      return [1, 2, 3, 6, 12].map((m) => ({
        n: `${m} bulan`,
        p: base * m + 2500,
        cost: base * m + 1800,
        sub: `${formatRp(base)}/bln + admin`,
      }));
    }),
  },
  multifinance: {
    name: "Multifinance",
    cat: "tagihan",
    catL: "Tagihan",
    icon: "car",
    desc: "Cicilan motor & mobil: Adira, FIF, BAF, WOM.",
    label: "Nomor kontrak",
    ph: "010203040506",
    targetType: "id",
    bill: true,
    admin: 3000,
    prov: ["Adira Finance", "FIF Group", "BAF", "WOM Finance"],
  },
};

export const SERVICE_ORDER: Slug[] = [
  "pulsa",
  "paket-data",
  "e-wallet",
  "pln",
  "pdam",
  "tv-internet",
  "game",
  "bpjs",
  "multifinance",
];

export const SERVICE_CODES: Record<Slug, string> = {
  pulsa: "PLS",
  "paket-data": "DAT",
  "e-wallet": "EWL",
  pln: "PLN",
  pdam: "H2O",
  "tv-internet": "NET",
  game: "GME",
  bpjs: "BPJ",
  multifinance: "MFN",
};

export const CATEGORIES: { key: "all" | Category; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "isi", label: "Isi ulang" },
  { key: "tagihan", label: "Tagihan" },
  { key: "hiburan", label: "Hiburan" },
];

export const isSlug = (value: string | null | undefined): value is Slug =>
  !!value && SERVICE_ORDER.includes(value as Slug);

export const minPrice = (slug: Slug): number | null => {
  const service = SERVICES[slug];
  if (service.bill || !service.items) return null;
  let min = Number.POSITIVE_INFINITY;
  for (const key of Object.keys(service.items)) {
    for (const item of service.items[key]) min = Math.min(min, item.p);
  }
  return min;
};
