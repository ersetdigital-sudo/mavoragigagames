"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Icon } from "@/components/Icon";
import { SERVICES, formatRp } from "@/lib/catalog";
import {
  WA_LINK,
  formatDate,
  formatTime,
  loadInvoices,
  type RecentInvoice,
} from "@/lib/store";

type PublicStatus = "success" | "processing" | "pending" | "expired";

type ApiOrder = {
  inv: string;
  status: PublicStatus;
  service: string;
  product: string;
  lines: [string, string][];
  method: string;
  total: number;
  sn: string;
  label: string;
  created: number;
  updated: number;
  paidAt?: number;
  qris: string | null;
};

const statusText: Record<PublicStatus, string> = {
  pending: "MENUNGGU PEMBAYARAN",
  processing: "SEDANG DIPROSES",
  success: "SELESAI",
  expired: "DIBATALKAN",
};

export function LacakClient() {
  const search = useSearchParams();
  const idParam = (search.get("id") ?? "").trim().toUpperCase();
  const [query, setQuery] = useState(idParam);
  const [active, setActive] = useState(idParam);
  const [result, setResult] = useState<ApiOrder | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<RecentInvoice[]>([]);

  useEffect(() => {
    setInvoices(loadInvoices());
  }, []);

  const lookup = useCallback(async (code: string) => {
    if (!code) {
      setResult(undefined);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(code)}`, {
        cache: "no-store",
      });
      setResult(response.ok ? ((await response.json()) as ApiOrder) : null);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (idParam) void lookup(idParam);
  }, [idParam, lookup]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = query.trim().toUpperCase();
    setQuery(next);
    setActive(next);
    void lookup(next);
    if (next) {
      window.history.replaceState(null, "", `/lacak?id=${encodeURIComponent(next)}`);
    } else {
      window.history.replaceState(null, "", "/lacak");
    }
  };

  const select = (entry: RecentInvoice) => {
    setQuery(entry.ref);
    setActive(entry.ref);
    void lookup(entry.ref);
    window.history.replaceState(null, "", `/lacak?id=${entry.ref}`);
    document
      .getElementById("hasil")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="box no-foot pb-12 pt-10 lg:pb-0">
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "Lacak" },
        ]}
      />
      <div className="tag mt-4">
        <b>[TRACKER]</b> &nbsp;Status transaksi real-time
      </div>
      <h1 className="mt-4 text-[40px] leading-[1.02] sm:text-6xl">
        Lacak setiap
        <br />
        transaksi, <span className="hl">detik per detik.</span>
      </h1>

      <form onSubmit={submit} className="pn tick4 mt-8 flex max-w-2xl gap-2 p-2">
        <span className="mono grid place-items-center pl-3 text-lg font-bold">#</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mono min-w-0 flex-1 bg-transparent text-base uppercase outline-none sm:text-lg"
          placeholder="MVG-XXXXXX"
          autoComplete="off"
          aria-label="Kode transaksi"
        />
        <button type="submit" className="b b-ink" disabled={loading}>
          {loading ? "…" : "Lacak"}
        </button>
      </form>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div id="hasil">
          {!active ? (
            <div className="pn p-8 text-center">
              <div className="mono mut text-sm">
                › menunggu input kode transaksi…
              </div>
              {!invoices.length && (
                <Link href="/layanan" className="b b-ink mt-5">
                  Buat transaksi pertama
                </Link>
              )}
            </div>
          ) : loading ? (
            <div className="pn p-8">
              <div className="mono mut text-sm">› mencari transaksi…</div>
            </div>
          ) : result ? (
            <OrderResult order={result} />
          ) : (
            <div className="pn p-8">
              <div className="mono font-bold">404 · {active}</div>
              <p className="mut mt-2 text-sm">
                Kode tidak ditemukan di server. Pastikan kodenya benar dan sudah
                sesuai dengan pesanan yang dibuat.
              </p>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl">Log perangkat ini</h2>
            <span className="tag">max 5</span>
          </div>
          <div className="pn mt-4 overflow-hidden">
            {invoices.length ? (
              invoices.slice(0, 5).map((entry, index) => (
                <button
                  key={entry.ref}
                  type="button"
                  onClick={() => select(entry)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#ffb703]"
                  style={
                    index
                      ? { borderTop: "1px solid var(--line)" }
                      : undefined
                  }
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md"
                    style={{ background: "var(--ink)", color: "var(--lem)" }}
                  >
                    <Icon
                      name={SERVICES[entry.slug]?.icon ?? "receipt"}
                      className="h-4 w-4"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{entry.label}</span>
                    <span className="mono mut block text-xs">{entry.ref}</span>
                  </span>
                  <span className="mono text-sm font-bold">
                    {formatRp(entry.amount)}
                  </span>
                </button>
              ))
            ) : (
              <div className="mono mut p-5 text-sm">
                › log kosong.{" "}
                <Link href="/layanan" className="font-bold" style={{ color: "var(--ink)" }}>
                  mulai transaksi →
                </Link>
              </div>
            )}
          </div>
          <div
            className="mono mt-4 rounded-lg p-4 text-xs leading-relaxed"
            style={{ background: "var(--lem)", color: "var(--ink)", border: "1px solid var(--ink)" }}
          >
            // STATUS SERVER · status diambil langsung dari server. Log lokal
            cuma menyimpan kode invoice di browser ini.
          </div>
          <a
            href={WA_LINK}
            target="_blank"
            rel="noreferrer"
            className="b b-out mt-3 w-full"
          >
            <Icon name="chat" className="h-4 w-4" /> Tanya status via WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}

function OrderResult({ order }: { order: ApiOrder }) {
  const paidDone = order.status === "processing" || order.status === "success";
  const target =
    order.lines.find(([label]) => /tujuan/i.test(label))?.[1] ?? "-";

  const events = [
    {
      title: "Pesanan dibuat",
      detail: `checkout ${order.method}`,
      time: formatTime(order.created),
      pending: false,
    },
    {
      title:
        order.status === "expired"
          ? "Pesanan dibatalkan"
          : paidDone
            ? "Pembayaran dikonfirmasi"
            : "Menunggu pembayaran",
      detail: `${formatRp(order.total)} · dicek manual`,
      time: paidDone ? formatTime(order.paidAt ?? order.updated) : "—",
      pending: !paidDone,
    },
    {
      title:
        order.status === "success"
          ? "Pesanan selesai"
          : order.status === "processing"
            ? "Sedang diproses"
            : order.status === "expired"
              ? "Tidak diproses"
              : "Diproses setelah pembayaran",
      detail: `${order.service} · ${order.product}`,
      time: order.status === "success" ? formatTime(order.updated) : "—",
      pending: order.status !== "success",
    },
  ];

  const lines: [string, string][] = [
    ["modul", order.service],
    ["produk", order.product],
    ["tujuan", target],
    ["harga", formatRp(order.total)],
    ["metode", order.method],
    ["status", statusText[order.status].toLowerCase()],
  ];

  return (
    <article className="pn tick4 ani overflow-hidden">
      <div
        className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6"
        style={{ background: "var(--ink)", color: "#F7F7F2" }}
      >
        <div>
          <div className="mono text-xs" style={{ color: "#8d9db0" }}>
            {order.service} · {formatDate(order.created)}
          </div>
          <div className="mono mt-1 text-2xl font-bold sm:text-3xl" style={{ color: "#ffb703" }}>
            {order.inv}
          </div>
        </div>
        <span
          className="mono rounded px-2.5 py-1.5 text-xs font-bold"
          style={{ background: "#ffb703", color: "#0d1b2a" }}
        >
          ● {statusText[order.status]}
        </span>
      </div>

      <div className="grid md:grid-cols-2">
        <div className="p-5 sm:p-6">
          {events.map((event, index) => (
            <div
              key={event.title}
              className={`ev ${event.pending ? "pending" : ""} ani`}
              style={{ animationDelay: `${index * 0.12}s` }}
            >
              <span className="dt">
                <Icon
                  name={event.pending ? "clock" : "check"}
                  className="h-3 w-3"
                />
              </span>
              <div className="flex justify-between gap-2">
                <b className="text-[15px]">{event.title}</b>
                <span className="mono mut text-xs">{event.time}</span>
              </div>
              <div className="mut text-sm">{event.detail}</div>
            </div>
          ))}
        </div>

        <div
          className="mono p-5 text-[13px] md:border-l sm:p-6"
          style={{ borderColor: "var(--line)" }}
        >
          {lines.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-4 py-2"
              style={{ borderBottom: "1px dashed var(--line2)" }}
            >
              <span className="mut">{label}</span>
              <span className="text-right font-semibold break-all">{value}</span>
            </div>
          ))}

          {order.sn ? (
            <div
              className="mt-4 rounded-lg p-3"
              style={{ background: "var(--lem)", color: "var(--ink)" }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                {order.label}
              </div>
              <div className="mt-1 break-all text-sm font-bold">{order.sn}</div>
            </div>
          ) : null}

          <div className="flex items-end justify-between pt-4">
            <span className="mut">total</span>
            <span className="text-2xl font-bold">{formatRp(order.total)}</span>
          </div>
          <div className="mut mt-4 text-xs">
            pesanan diteruskan ke provider. Status berikutnya dikirim lewat
            WhatsApp.
          </div>
        </div>
      </div>
    </article>
  );
}
