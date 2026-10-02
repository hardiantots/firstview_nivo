# NIVO

Website pendamping perjalanan berhenti merokok: catatan harian, bantuan craving, rencana pribadi, grafik, ekspor data, pengingat, pendamping, dan konsultasi manusia bila layanan diaktifkan. UI memakai primary teal, secondary orange, latar putih, card glass, dan animasi ringan. Logo serta aset gambar asli dipertahankan.

## Menjalankan lokal

Gunakan **Node.js 22.x** dan npm. Stack: Next.js 15, React 19, TypeScript, Tailwind/shadcn, Supabase, Recharts, dan Framer Motion.

```sh
npm ci
```

Salin `.env.example` menjadi `.env.local` dan isi konfigurasi project. `SUPABASE_SERVICE_ROLE_KEY` hanya untuk backend; jangan memakai prefix `NEXT_PUBLIC_` untuk secret.

```sh
npm run dev
```

Buka `http://localhost:3000`. Konfigurasi database dijelaskan di [supabase/RESET_AND_SCHEMA.md](supabase/RESET_AND_SCHEMA.md). Gunakan urutan migrasi dari panduan tersebut; reset adalah pilihan destruktif yang terpisah. Jangan menjalankan semua migrasi lama secara acak.

## Struktur

- `src/app`: halaman dan API.
- `src/features`: komponen serta alur fitur.
- `src/shared`: autentikasi, helper HTTP, domain perjalanan/konsultasi, dan utilitas bersama.
- `src/components/ui`: komponen antarmuka.
- `src/shared/assets` dan `public`: logo, gambar, service worker, serta aset publik.
- `supabase`: migrasi, reset, preflight, tes SQL, dan Edge Function push.
- `scripts`: pemeriksaan kualitas, regresi, dan utilitas yang masih digunakan.

Perjalanan memakai API/RPC dengan revision dan operation ID untuk konflik antar perangkat serta retry idempoten. Draft perangkat dan API memakai kontrak validasi yang sama. Helper HTTP berada di `src/shared/api/client.ts`; konsultasi dipisah menjadi pemilihan layanan, sesi, dan moderasi.

## Pemeriksaan kualitas

```sh
npm run check
npm run format:features
```

`check` mencakup pemeriksaan format modul yang sudah dirapikan, typecheck, lint, tes, dan production build. Tes arsitektur menjaga batas modul bersama dan graf import tanpa siklus. Konfigurasi TypeScript legacy belum sepenuhnya strict.

Regresi browser memerlukan Playwright/Edge terpisah; tes SQL memakai PGlite sesuai panduan database. Fixture lokal tidak menggantikan smoke test integrasi produksi.

## Deployment

Hubungkan GitHub ke Vercel, pilih Node 22, isi environment variables dari `.env.example` lewat Dashboard Vercel, dan atur URL aplikasi serta redirect Auth di Supabase. Konfigurasi Vercel menjalankan `npm run check` saat build. Pastikan preflight database dan alur login/penyimpanan berhasil sebelum membuka layanan.

Push bersifat opsional: [PUSH_ACTIVATION.md](PUSH_ACTIVATION.md). Pengingat push, konsultasi, dan audio tetap nonaktif sampai konfigurasi serta ketersediaan layanannya diverifikasi. Tidak ada integrasi WhatsApp.

## File untuk GitHub

Source, aset, lockfile dependency, konfigurasi build/CI, tes, `.env.example`, SQL, dan panduan operasional tetap masuk Git. Environment asli, dependency lokal, hasil build/cache, konfigurasi akun lokal, laporan progres, serta bukti pengujian diabaikan. Dokumen SDD asli tetap lokal.

Skrip deployment lama dan cache TypeScript dikeluarkan dari Git; salinan lokal tetap tersedia. Gunakan perintah di `package.json` dan konfigurasi `.env.example` yang terbaru.

Panduan tambahan: [DESIGN.md](DESIGN.md), [SECURITY.md](SECURITY.md), dan [CI_MERGE_FIX.md](CI_MERGE_FIX.md). Catatan CI membahas temuan riwayat Git yang terpisah dari pembersihan file sekarang; menghapus file terbaru tidak menghapus commit lama.
