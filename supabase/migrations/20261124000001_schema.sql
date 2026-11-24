-- Avenikomode: skema inti (tabel, RLS, fungsi, storage).
-- Dibuat dari kebutuhan kode di src/modules/admin dan src/lib/db.

-- ============ tabel ============

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  slug text not null unique,
  domain text not null,
  tagline text,
  logo_url text,
  warna_utama text not null default '#315762' check (warna_utama ~ '^#[0-9A-Fa-f]{6}$'),
  kode_ref text not null check (kode_ref ~ '^[A-Z0-9]{2,6}$'),
  wa_cs text,
  qris_image_url text,
  batas_bayar_menit int not null default 15 check (batas_bayar_menit between 5 and 1440),
  maks_order_pending int not null default 5 check (maks_order_pending between 1 and 50),
  jam_cek_tagihan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid references public.brands (id) on delete cascade,
  nama text not null,
  role text not null default 'admin' check (role in ('owner', 'admin', 'super_admin')),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, brand_id)
);
create index admins_user_idx on public.admins (user_id);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  nama text not null,
  slug text not null,
  jenis text not null check (jenis in ('nominal', 'tagihan')),
  input_fields jsonb not null default '[]'::jsonb,
  biaya_admin numeric(14, 0) not null default 0 check (biaya_admin >= 0),
  biaya_supplier numeric(14, 0) not null default 0 check (biaya_supplier >= 0),
  urutan int not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  nama text not null,
  harga_modal numeric(14, 0) not null default 0 check (harga_modal >= 0),
  harga_jual numeric(14, 0) not null default 0 check (harga_jual >= 0),
  urutan int not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_service_idx on public.products (service_id);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  nama text not null,
  tipe text not null check (tipe in ('qr', 'ewallet', 'va')),
  biaya_admin numeric(14, 0) not null default 0 check (biaya_admin >= 0),
  urutan int not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  kode text not null,
  jenis text not null check (jenis in ('persen', 'tetap')),
  nilai numeric(14, 0) not null check (nilai > 0),
  maks_potongan numeric(14, 0) check (maks_potongan is null or maks_potongan >= 0),
  min_transaksi numeric(14, 0) not null default 0 check (min_transaksi >= 0),
  service_ids uuid[] not null default '{}',
  berlaku_sampai date,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, kode)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  ref text not null unique,
  service_id uuid not null references public.services (id),
  product_id uuid references public.products (id),
  nama_layanan text not null,
  nama_produk text,
  harga_modal numeric(14, 0),
  harga_jual numeric(14, 0),
  input_pembeli jsonb not null default '{}'::jsonb,
  nomor_tujuan text not null,
  wa_pembeli text,
  nominal_tagihan numeric(14, 0),
  denda numeric(14, 0) not null default 0,
  payment_method_id uuid references public.payment_methods (id),
  metode_bayar text,
  biaya_admin numeric(14, 0) not null default 0,
  voucher_kode text,
  potongan numeric(14, 0) not null default 0,
  total numeric(14, 0),
  status text not null check (status in ('menunggu_cek', 'menunggu_bayar', 'sudah_bayar', 'sukses', 'dibatalkan')),
  sn text,
  expires_at timestamptz,
  checked_at timestamptz,
  paid_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_brand_status_idx on public.orders (brand_id, status, created_at desc);
create index orders_brand_created_idx on public.orders (brand_id, created_at desc);
create index orders_nomor_idx on public.orders (brand_id, nomor_tujuan);

create table public.order_logs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  status_dari text,
  status_ke text not null,
  catatan text,
  admin_id uuid references public.admins (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_logs_order_idx on public.order_logs (order_id, created_at);

-- updated_at otomatis
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger brands_touch before update on public.brands for each row execute function public.touch_updated_at();
create trigger services_touch before update on public.services for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger payment_methods_touch before update on public.payment_methods for each row execute function public.touch_updated_at();
create trigger vouchers_touch before update on public.vouchers for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

-- ============ helper akses ============

create function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where user_id = auth.uid() and role = 'super_admin' and aktif
  );
$$;

create function public.is_brand_admin(p_brand_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where user_id = auth.uid()
      and aktif
      and (role = 'super_admin' or brand_id = p_brand_id)
  );
$$;

create function public.current_admin_id(p_brand_id uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.admins
  where user_id = auth.uid() and aktif
    and (brand_id = p_brand_id or role = 'super_admin')
  order by (brand_id = p_brand_id) desc
  limit 1;
$$;

-- ============ RLS ============

alter table public.brands enable row level security;
alter table public.admins enable row level security;
alter table public.services enable row level security;
alter table public.products enable row level security;
alter table public.payment_methods enable row level security;
alter table public.vouchers enable row level security;
alter table public.orders enable row level security;
alter table public.order_logs enable row level security;

create policy brands_read on public.brands for select to anon, authenticated using (true);
create policy brands_update on public.brands for update to authenticated
  using (public.is_brand_admin(id)) with check (public.is_brand_admin(id));

create policy admins_read on public.admins for select to authenticated
  using (user_id = auth.uid() or (brand_id is not null and public.is_brand_admin(brand_id)));

create policy services_read on public.services for select to anon, authenticated
  using (aktif or public.is_brand_admin(brand_id));
create policy services_write on public.services for all to authenticated
  using (public.is_brand_admin(brand_id)) with check (public.is_brand_admin(brand_id));

create policy products_read on public.products for select to anon, authenticated
  using (aktif or public.is_brand_admin(brand_id));
create policy products_write on public.products for all to authenticated
  using (public.is_brand_admin(brand_id)) with check (public.is_brand_admin(brand_id));

create policy payment_methods_read on public.payment_methods for select to anon, authenticated
  using (aktif or public.is_brand_admin(brand_id));
create policy payment_methods_write on public.payment_methods for all to authenticated
  using (public.is_brand_admin(brand_id)) with check (public.is_brand_admin(brand_id));

create policy vouchers_admin on public.vouchers for all to authenticated
  using (public.is_brand_admin(brand_id)) with check (public.is_brand_admin(brand_id));

create policy orders_read on public.orders for select to authenticated
  using (public.is_brand_admin(brand_id));
create policy order_logs_read on public.order_logs for select to authenticated
  using (public.is_brand_admin(brand_id));

-- orders/order_logs/admins hanya diubah lewat fungsi security definer atau SQL.
revoke all on public.orders, public.order_logs, public.vouchers, public.admins from anon;
revoke insert, update, delete on public.orders, public.order_logs, public.admins from authenticated;
revoke insert, update, delete on public.brands from anon;
revoke insert, update, delete on public.services, public.products, public.payment_methods from anon;
revoke insert, delete, truncate on public.brands from authenticated;

-- ============ voucher ============

create function public._hitung_voucher(
  p_brand_id uuid, p_kode text, p_service_id uuid, p_subtotal numeric, p_abaikan_min boolean default false
) returns table (valid boolean, potongan numeric, pesan text, kode text)
language plpgsql stable security definer set search_path = public as $$
declare
  v public.vouchers%rowtype;
  v_kode text := upper(btrim(coalesce(p_kode, '')));
  v_pot numeric;
begin
  if v_kode = '' then
    return query select false, 0::numeric, 'Kode voucher wajib diisi.'::text, null::text;
    return;
  end if;

  select * into v from public.vouchers vc where vc.brand_id = p_brand_id and vc.kode = v_kode;
  if not found or not v.aktif then
    return query select false, 0::numeric, 'Kode voucher tidak valid.'::text, null::text;
    return;
  end if;
  if v.berlaku_sampai is not null and v.berlaku_sampai < (now() at time zone 'Asia/Jakarta')::date then
    return query select false, 0::numeric, 'Voucher sudah kedaluwarsa.'::text, null::text;
    return;
  end if;
  if cardinality(v.service_ids) > 0 and (p_service_id is null or not (p_service_id = any (v.service_ids))) then
    return query select false, 0::numeric, 'Voucher tidak berlaku untuk layanan ini.'::text, null::text;
    return;
  end if;
  if not p_abaikan_min and coalesce(p_subtotal, 0) < v.min_transaksi then
    return query select false, 0::numeric,
      ('Minimal transaksi Rp' || to_char(v.min_transaksi, 'FM999G999G999G999') || ' untuk voucher ini.')::text, null::text;
    return;
  end if;

  if v.jenis = 'persen' then
    v_pot := floor(coalesce(p_subtotal, 0) * v.nilai / 100);
    if v.maks_potongan is not null then v_pot := least(v_pot, v.maks_potongan); end if;
  else
    v_pot := least(v.nilai, coalesce(p_subtotal, 0));
  end if;

  return query select true, greatest(v_pot, 0), 'Voucher berhasil dipakai.'::text, v.kode;
end;
$$;

create function public.cek_voucher(p_brand_slug text, p_kode text, p_service_id uuid default null, p_subtotal numeric default 0)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  b public.brands%rowtype;
  r record;
begin
  select * into b from public.brands where slug = p_brand_slug;
  if not found then raise exception 'Brand tidak ditemukan'; end if;
  select * into r from public._hitung_voucher(b.id, p_kode, p_service_id, p_subtotal);
  return jsonb_build_object('valid', r.valid, 'potongan', r.potongan, 'pesan', r.pesan);
end;
$$;

-- ============ buat order ============

create function public._buat_ref(p_prefix text) returns text
language plpgsql volatile set search_path = public as $$
declare
  alfabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := uuid_send(gen_random_uuid());
  hasil text := '';
  i int;
begin
  for i in 0..5 loop
    hasil := hasil || substr(alfabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return p_prefix || '-' || hasil;
end;
$$;

create function public._cek_batas_pending(b public.brands, p_nomor text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if (
    select count(*) from public.orders o
    where o.brand_id = b.id
      and o.nomor_tujuan = p_nomor
      and o.status in ('menunggu_bayar', 'menunggu_cek')
      and (o.expires_at is null or o.expires_at > now())
  ) >= b.maks_order_pending then
    raise exception 'Terlalu banyak transaksi belum bayar untuk nomor ini. Selesaikan atau tunggu kedaluwarsa dulu.';
  end if;
end;
$$;

create function public.create_order(
  p_brand_slug text, p_service_id uuid, p_product_id uuid, p_nomor_tujuan text,
  p_input jsonb, p_payment_method_id uuid, p_voucher_kode text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b public.brands%rowtype;
  s public.services%rowtype;
  p public.products%rowtype;
  m public.payment_methods%rowtype;
  v record;
  v_nomor text := btrim(coalesce(p_nomor_tujuan, ''));
  v_pot numeric := 0;
  v_kode text := null;
  v_total numeric;
  v_ref text;
  v_exp timestamptz;
  v_id uuid;
begin
  select * into b from public.brands where slug = p_brand_slug;
  if not found then raise exception 'Brand tidak ditemukan'; end if;

  select * into s from public.services where id = p_service_id and brand_id = b.id and aktif;
  if not found or s.jenis <> 'nominal' then raise exception 'Layanan tidak tersedia'; end if;

  select * into p from public.products where id = p_product_id and service_id = s.id and brand_id = b.id and aktif;
  if not found then raise exception 'Produk tidak tersedia'; end if;

  select * into m from public.payment_methods where id = p_payment_method_id and brand_id = b.id and aktif;
  if not found then raise exception 'Metode pembayaran tidak tersedia'; end if;

  if length(v_nomor) < 3 or length(v_nomor) > 40 then raise exception 'Nomor tujuan tidak valid'; end if;

  perform public._cek_batas_pending(b, v_nomor);

  if nullif(btrim(coalesce(p_voucher_kode, '')), '') is not null then
    select * into v from public._hitung_voucher(b.id, p_voucher_kode, s.id, p.harga_jual);
    if not v.valid then raise exception '%', v.pesan; end if;
    v_pot := v.potongan;
    v_kode := v.kode;
  end if;

  v_total := greatest(p.harga_jual + m.biaya_admin - v_pot, 0);
  v_exp := now() + make_interval(mins => b.batas_bayar_menit);

  loop
    v_ref := public._buat_ref(b.kode_ref);
    begin
      insert into public.orders (
        brand_id, ref, service_id, product_id, nama_layanan, nama_produk, harga_modal, harga_jual,
        input_pembeli, nomor_tujuan, payment_method_id, metode_bayar, biaya_admin,
        voucher_kode, potongan, total, status, expires_at
      ) values (
        b.id, v_ref, s.id, p.id, s.nama, p.nama, p.harga_modal, p.harga_jual,
        coalesce(p_input, '{}'::jsonb), v_nomor, m.id, m.nama, m.biaya_admin,
        v_kode, v_pot, v_total, 'menunggu_bayar', v_exp
      ) returning id into v_id;
      exit;
    exception when unique_violation then
      null; -- ref bentrok, ulangi dengan kode baru
    end;
  end loop;

  insert into public.order_logs (brand_id, order_id, status_dari, status_ke, catatan)
  values (b.id, v_id, null, 'menunggu_bayar', 'Order dibuat pembeli');

  return jsonb_build_object('ref', v_ref, 'total', v_total, 'expires_at', v_exp);
end;
$$;

create function public.create_bill_check(
  p_brand_slug text, p_service_id uuid, p_nomor_tujuan text, p_input jsonb,
  p_wa_pembeli text, p_payment_method_id uuid, p_voucher_kode text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b public.brands%rowtype;
  s public.services%rowtype;
  m public.payment_methods%rowtype;
  v record;
  v_nomor text := btrim(coalesce(p_nomor_tujuan, ''));
  v_wa text := regexp_replace(coalesce(p_wa_pembeli, ''), '\D', '', 'g');
  v_kode text := null;
  v_ref text;
  v_id uuid;
begin
  select * into b from public.brands where slug = p_brand_slug;
  if not found then raise exception 'Brand tidak ditemukan'; end if;

  select * into s from public.services where id = p_service_id and brand_id = b.id and aktif;
  if not found or s.jenis <> 'tagihan' then raise exception 'Layanan tidak tersedia'; end if;

  select * into m from public.payment_methods where id = p_payment_method_id and brand_id = b.id and aktif;
  if not found then raise exception 'Metode pembayaran tidak tersedia'; end if;

  if length(v_nomor) < 3 or length(v_nomor) > 40 then raise exception 'Nomor tujuan tidak valid'; end if;
  if length(v_wa) < 8 or length(v_wa) > 15 then raise exception 'Nomor WhatsApp tidak valid'; end if;

  perform public._cek_batas_pending(b, v_nomor);

  if nullif(btrim(coalesce(p_voucher_kode, '')), '') is not null then
    select * into v from public._hitung_voucher(b.id, p_voucher_kode, s.id, 0, true);
    if not v.valid then raise exception '%', v.pesan; end if;
    v_kode := v.kode;
  end if;

  loop
    v_ref := public._buat_ref(b.kode_ref);
    begin
      insert into public.orders (
        brand_id, ref, service_id, nama_layanan, input_pembeli, nomor_tujuan, wa_pembeli,
        payment_method_id, metode_bayar, biaya_admin, voucher_kode, status
      ) values (
        b.id, v_ref, s.id, s.nama, coalesce(p_input, '{}'::jsonb), v_nomor, v_wa,
        m.id, m.nama, s.biaya_admin + m.biaya_admin, v_kode, 'menunggu_cek'
      ) returning id into v_id;
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  insert into public.order_logs (brand_id, order_id, status_dari, status_ke, catatan)
  values (b.id, v_id, null, 'menunggu_cek', 'Permintaan cek tagihan dari pembeli');

  return jsonb_build_object('ref', v_ref, 'jam_cek_tagihan', b.jam_cek_tagihan);
end;
$$;

-- ============ baca order (publik, lewat ref) ============

create function public.get_payment(p_ref text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb;
begin
  select jsonb_build_object(
    'ref', o.ref, 'status', o.status, 'total', o.total,
    'nama_layanan', o.nama_layanan, 'nama_produk', o.nama_produk,
    'nomor_tujuan', o.nomor_tujuan, 'metode_bayar', o.metode_bayar,
    'tipe_metode', pm.tipe, 'biaya_admin', o.biaya_admin,
    'potongan', o.potongan, 'voucher_kode', o.voucher_kode,
    'qris_image_url', b.qris_image_url, 'logo_url', b.logo_url,
    'nama_brand', b.nama, 'wa_cs', b.wa_cs,
    'expires_at', o.expires_at, 'jam_cek_tagihan', b.jam_cek_tagihan,
    'nominal_tagihan', o.nominal_tagihan, 'denda', o.denda,
    'created_at', o.created_at
  ) into r
  from public.orders o
  join public.brands b on b.id = o.brand_id
  left join public.payment_methods pm on pm.id = o.payment_method_id
  where o.ref = upper(btrim(coalesce(p_ref, '')));

  if r is null then raise exception 'Order tidak ditemukan'; end if;
  return r;
end;
$$;

create function public.cek_order(p_brand_slug text, p_ref text default null, p_nomor_tujuan text default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  b public.brands%rowtype;
  v_ref text := upper(btrim(coalesce(p_ref, '')));
  v_nomor text := btrim(coalesce(p_nomor_tujuan, ''));
  r jsonb;
begin
  select * into b from public.brands where slug = p_brand_slug;
  if not found then raise exception 'Brand tidak ditemukan'; end if;
  if v_ref = '' and v_nomor = '' then raise exception 'Kode referensi atau nomor tujuan wajib diisi'; end if;

  select coalesce(jsonb_agg(x order by (x->>'created_at') desc), '[]'::jsonb) into r
  from (
    select jsonb_build_object(
      'ref', o.ref, 'layanan', o.nama_layanan, 'produk', o.nama_produk,
      'nomor_tujuan', o.nomor_tujuan, 'total', o.total, 'status', o.status,
      -- SN hanya dibuka kalau pencarian pakai kode referensi; lewat nomor tujuan disembunyikan.
      'sn', case when v_ref <> '' then o.sn else null end,
      'created_at', o.created_at, 'expires_at', o.expires_at,
      'paid_at', o.paid_at, 'completed_at', o.completed_at
    ) as x
    from public.orders o
    where o.brand_id = b.id
      and ((v_ref <> '' and o.ref = v_ref) or (v_ref = '' and o.nomor_tujuan = v_nomor))
    order by o.created_at desc
    limit 20
  ) t;

  if v_ref <> '' and jsonb_array_length(r) = 0 then raise exception 'Order tidak ditemukan'; end if;
  return r;
end;
$$;

-- ============ aksi admin ============

create function public.set_bill_amount(p_order_id uuid, p_nominal_tagihan numeric, p_denda numeric default 0)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  b public.brands%rowtype;
  s public.services%rowtype;
  v record;
  v_jual numeric;
  v_pot numeric := 0;
  v_kode text := null;
  v_total numeric;
  v_exp timestamptz;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if not public.is_brand_admin(o.brand_id) then raise exception 'Akses ditolak'; end if;
  if o.status <> 'menunggu_cek' then raise exception 'Status transaksi tidak bisa diubah nominalnya'; end if;
  if coalesce(p_nominal_tagihan, 0) <= 0 then raise exception 'Nominal tagihan harus lebih dari 0'; end if;
  if coalesce(p_denda, 0) < 0 then raise exception 'Denda tidak boleh negatif'; end if;

  select * into b from public.brands where id = o.brand_id;
  select * into s from public.services where id = o.service_id;

  v_jual := p_nominal_tagihan + coalesce(p_denda, 0);

  if o.voucher_kode is not null then
    select * into v from public._hitung_voucher(o.brand_id, o.voucher_kode, o.service_id, v_jual);
    if v.valid then v_pot := v.potongan; v_kode := v.kode; end if;
  end if;

  v_total := greatest(v_jual + o.biaya_admin - v_pot, 0);
  v_exp := now() + make_interval(mins => b.batas_bayar_menit);

  update public.orders set
    nominal_tagihan = p_nominal_tagihan,
    denda = coalesce(p_denda, 0),
    harga_jual = v_jual,
    harga_modal = v_jual + s.biaya_supplier,
    voucher_kode = v_kode,
    potongan = v_pot,
    total = v_total,
    status = 'menunggu_bayar',
    checked_at = now(),
    expires_at = v_exp
  where id = o.id;

  insert into public.order_logs (brand_id, order_id, status_dari, status_ke, catatan, admin_id)
  values (o.brand_id, o.id, 'menunggu_cek', 'menunggu_bayar', 'Nominal tagihan diisi admin', public.current_admin_id(o.brand_id));

  return jsonb_build_object('ref', o.ref, 'total', v_total, 'expires_at', v_exp);
end;
$$;

create function public.update_order_status(p_order_id uuid, p_status text, p_sn text default null, p_catatan text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if not public.is_brand_admin(o.brand_id) then raise exception 'Akses ditolak'; end if;

  if p_status = 'sudah_bayar' then
    if o.status <> 'menunggu_bayar' then raise exception 'Status tujuan tidak diizinkan dari status saat ini'; end if;
    update public.orders set status = 'sudah_bayar', paid_at = now() where id = o.id;

  elsif p_status = 'sukses' then
    if o.status <> 'sudah_bayar' then raise exception 'Status tujuan tidak diizinkan dari status saat ini'; end if;
    if nullif(btrim(coalesce(p_sn, '')), '') is null then raise exception 'SN / token wajib diisi'; end if;
    update public.orders set status = 'sukses', sn = btrim(p_sn), completed_at = now() where id = o.id;

  elsif p_status = 'dibatalkan' then
    if o.status in ('sukses', 'dibatalkan') then raise exception 'Status tujuan tidak diizinkan dari status saat ini'; end if;
    if nullif(btrim(coalesce(p_catatan, '')), '') is null then raise exception 'Alasan pembatalan wajib diisi'; end if;
    update public.orders set status = 'dibatalkan', cancelled_at = now(), cancel_reason = btrim(p_catatan) where id = o.id;

  else
    raise exception 'Status tujuan tidak diizinkan';
  end if;

  insert into public.order_logs (brand_id, order_id, status_dari, status_ke, catatan, admin_id)
  values (o.brand_id, o.id, o.status, p_status,
          case when p_status = 'dibatalkan' then btrim(p_catatan) when p_status = 'sukses' then 'SN disimpan' end,
          public.current_admin_id(o.brand_id));
end;
$$;

create function public.dashboard_summary(p_brand_id uuid, p_bulan date)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_awal timestamptz := date_trunc('month', p_bulan::timestamp) at time zone 'Asia/Jakarta';
  v_akhir timestamptz := (date_trunc('month', p_bulan::timestamp) + interval '1 month') at time zone 'Asia/Jakarta';
  v_omzet numeric; v_modal numeric; v_pot numeric; v_jml int; v_all int; v_batal int;
begin
  if not public.is_brand_admin(p_brand_id) then raise exception 'Akses ditolak'; end if;

  select coalesce(sum(total), 0), coalesce(sum(harga_modal), 0), coalesce(sum(potongan), 0), count(*)
    into v_omzet, v_modal, v_pot, v_jml
  from public.orders
  where brand_id = p_brand_id and status = 'sukses' and completed_at >= v_awal and completed_at < v_akhir;

  select count(*), count(*) filter (where status = 'dibatalkan') into v_all, v_batal
  from public.orders
  where brand_id = p_brand_id and created_at >= v_awal and created_at < v_akhir;

  return jsonb_build_object(
    'brand_id', p_brand_id,
    'bulan', to_char(p_bulan, 'YYYY-MM'),
    'omzet', v_omzet,
    'total_modal', v_modal,
    'total_potongan_voucher', v_pot,
    'net_profit', v_omzet - v_modal,
    'jumlah_transaksi', v_jml,
    'rata_rata', case when v_jml > 0 then round(v_omzet / v_jml) else 0 end,
    'persentase_batal', case when v_all > 0 then round(v_batal * 100.0 / v_all, 1) else 0 end,
    'layanan_terlaris', coalesce((
      select jsonb_agg(jsonb_build_object('nama', nama_layanan, 'jumlah', jml, 'omzet', om) order by jml desc, om desc)
      from (
        select nama_layanan, count(*) as jml, coalesce(sum(total), 0) as om
        from public.orders
        where brand_id = p_brand_id and status = 'sukses' and completed_at >= v_awal and completed_at < v_akhir
        group by nama_layanan order by count(*) desc, sum(total) desc limit 5
      ) t
    ), '[]'::jsonb),
    'menunggu_cek', (select count(*) from public.orders where brand_id = p_brand_id and status = 'menunggu_cek'),
    'sudah_bayar', (select count(*) from public.orders where brand_id = p_brand_id and status = 'sudah_bayar')
  );
end;
$$;

-- ============ hak eksekusi fungsi ============

revoke execute on all functions in schema public from public, anon, authenticated;

-- is_brand_admin dipanggil dari policy RLS, jadi anon juga perlu hak eksekusi (hasilnya false).
grant execute on function public.is_brand_admin(uuid) to anon;

grant execute on function
  public.cek_voucher(text, text, uuid, numeric),
  public.create_order(text, uuid, uuid, text, jsonb, uuid, text),
  public.create_bill_check(text, uuid, text, jsonb, text, uuid, text),
  public.get_payment(text),
  public.cek_order(text, text, text)
to anon, authenticated;

grant execute on function
  public.is_super_admin(),
  public.is_brand_admin(uuid),
  public.set_bill_amount(uuid, numeric, numeric),
  public.update_order_status(uuid, text, text, text),
  public.dashboard_summary(uuid, date)
to authenticated;

-- ============ storage (logo & QRIS) ============

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('brand-logos', 'brand-logos', true, 2097152, array['image/png', 'image/jpeg']),
  ('brand-qris', 'brand-qris', true, 2097152, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy brand_assets_insert on storage.objects for insert to authenticated
  with check (
    bucket_id in ('brand-logos', 'brand-qris')
    and public.is_brand_admin(((storage.foldername(name))[1])::uuid)
  );
create policy brand_assets_update on storage.objects for update to authenticated
  using (
    bucket_id in ('brand-logos', 'brand-qris')
    and public.is_brand_admin(((storage.foldername(name))[1])::uuid)
  );
create policy brand_assets_delete on storage.objects for delete to authenticated
  using (
    bucket_id in ('brand-logos', 'brand-qris')
    and public.is_brand_admin(((storage.foldername(name))[1])::uuid)
  );
