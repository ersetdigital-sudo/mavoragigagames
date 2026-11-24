# Supabase — Mavoragigagames

Satu project Supabase dipakai **bersama beberapa brand**. Datanya dipisah per brand:

- Semua tabel (`services`, `products`, `payment_methods`, `vouchers`, `orders`, `order_logs`) punya `brand_id`.
- Web ini membaca brand dari env `BRAND_SLUG` (`mavoragigagames`), jadi hanya melihat layanan, produk, dan order brand itu.
- Admin dibatasi per brand lewat tabel `admins` + fungsi `is_brand_admin(brand_id)` (RLS). Admin brand A tidak bisa membaca order, voucher, atau dashboard brand B. Role `super_admin` (tanpa `brand_id`) bisa melihat semua brand.
- Logo dan QRIS disimpan di bucket `brand-logos` / `brand-qris` dalam folder `<brand_id>/`.

## Migration

Jalankan berurutan di SQL editor / Supabase MCP:

1. `20261124000001_schema.sql` — tabel, RLS, fungsi checkout/admin/dashboard, bucket storage.
   **Hanya sekali per project.** Kalau project sudah punya skema (dipakai brand lain), lewati.
2. `20261124000002_seed_mavoragigagames.sql` — brand `mavoragigagames` (kode invoice `MVG`),
   9 layanan, metode QRIS, dan katalog produk.

## Menambah brand lain di project yang sama

Salin file seed, ganti nama, slug, domain, `kode_ref`, dan warna di bagian `insert into public.brands`,
lalu sesuaikan `BRAND_SLUG` di env brand itu.

## Akun admin

1. Buat user di Supabase Auth (email + password, auto-confirm).
2. Daftarkan sebagai admin brand:

```sql
insert into public.admins (user_id, brand_id, nama, role)
select u.id, b.id, 'Admin Mavoragigagames', 'owner'
from auth.users u, public.brands b
where u.email = 'admin@mavoragigagames.com' and b.slug = 'mavoragigagames';
```

Harga modal di seed berasal dari referensi supplier; sesuaikan di dashboard admin > Produk.
