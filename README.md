# NIVO

Website pendamping perjalanan berhenti merokok dengan catatan harian, bantuan Craving SOS, rencana pribadi, grafik, ekspor data, pengingat, pendamping, dan konsultasi manusia bila layanan diaktifkan. UI memakai primary teal, secondary orange, latar putih, card glass, dan animasi ringan. Logo serta aset gambar asli dipertahankan.

## Menjalankan lokal

Gunakan **Node.js 22.x** dan npm. Stack: Next.js 15, React 19, TypeScript, Tailwind/shadcn, Supabase, Recharts, dan Framer Motion.

```sh
npm ci
```

Salin `.env.example` menjadi `.env.local` dan isi konfigurasi project. `NEXT_PUBLIC_SUPABASE_URL` harus menunjuk layanan Supabase project, sedangkan `NEXT_PUBLIC_SITE_URL` menunjuk URL aplikasi. `SUPABASE_SERVICE_ROLE_KEY` hanya untuk backend; jangan memakai prefix `NEXT_PUBLIC_` untuk secret.

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

Pada layar sampai **1024 px**, menu panjang dibagi menjadi section dengan pilihan bagian serta tombol Sebelumnya/Berikutnya di awal dan akhir konten. Beranda, Catatan, bantuan, rencana, pengingat, profil, pendamping, konsultasi, dan paket memakai komponen navigasi yang sama. Section aktif tercermin di URL dan mengikuti Back browser. Isian pada section yang sudah dibuka tetap tersimpan selama halaman aktif; field yang gagal validasi akan ditampilkan dan difokuskan. Daftar catatan dan sesi juga memiliki pagination tersendiri.

## Grafik dan bantuan

Beranda menampilkan ring capaian hari bebas rokok tercatat, tren konsumsi, akumulasi estimasi hemat, hasil Craving SOS, dan cakupan catatan pada periode 7/30 hari. Semua grafik berasal dari snapshot perjalanan server; hari kosong tetap kosong dan estimasi memakai baseline historis. Ring menghitung hari bebas rokok yang tercatat, bukan streak yang disimpulkan dari tanggal berhenti. Penambahan grafik ini tidak membutuhkan migrasi database.

Craving SOS menyediakan pencatatan, latihan napas, distraksi, dan panduan otomatis umum. Endpoint bantuan saat ini tidak mengirim konteks kesehatan ke penyedia model atau membuat panggilan model berbayar. Panduan otomatis dibedakan dari konsultasi manusia.

Pengingat push, konsultasi, dan audio tetap nonaktif sampai konfigurasi serta ketersediaan layanannya diverifikasi. Tidak ada integrasi WhatsApp. Aktivasi push dijelaskan di [PUSH_ACTIVATION.md](PUSH_ACTIVATION.md).

## Autentikasi

Login email dan Google menyimpan sesi pada browser yang sama dengan masa aplikasi **14 hari sejak login**, tanpa memperpanjang masa tersebut pada refresh token atau pergantian halaman. Supabase tetap memakai access token pendek dan refresh token, dan route tetap memverifikasi identitas melalui `getUser()`. Sesi aktif melewati signin/signup/welcome dan kembali ke route internal yang diminta, atau `/home`.

Akun baru diarahkan ke **`/onboarding`** setelah sesi login tersedia, termasuk pendaftaran email langsung, login pertama setelah verifikasi email, dan callback Google. Pengisian terdiri dari motivasi lalu target tanggal, tanggal mulai berhenti, atau pilihan mengurangi bertahap. Alasan dan rencana disimpan ke `nivo_journeys.document` memakai action `reasons`/`plan` dan RPC yang sudah ada; tidak memerlukan tabel atau migrasi baru. Langkah yang sudah tersimpan dapat dilanjutkan setelah reload atau login ulang. Setelah selesai, pengguna kembali ke tujuan internal sebelumnya atau Beranda. Akun lama yang sudah memiliki aktivitas/riwayat pengaturan tidak dipaksa mengulang, dan bantuan segera tetap dapat dibuka sebelum setup selesai. Route lama `/motivation` mengarah ke alur ini.

Logout manual menghapus sesi. Saat sesi kedaluwarsa, draft retry milik akun tetap tersimpan agar bisa ditinjau setelah login ulang. Gangguan verifikasi sementara tidak membuka halaman terlindungi atau menghapus draft.

Batas 14 hari ini berlaku pada aplikasi/browser. Untuk turut membatasi lifetime sesi di sisi server Supabase, atur **Time-box user sessions = 336 jam** bila paket project mendukungnya; jangan memperpanjang expiry JWT menjadi 14 hari. Pengaturan dashboard tersebut belum diubah dari repository. Lihat [Supabase User sessions](https://supabase.com/docs/guides/auth/sessions).

## Pemeriksaan kualitas

```sh
npm run check
npm run format:features
npm audit --audit-level=high
```

`check` mencakup pemeriksaan format modul yang sudah dirapikan, typecheck, lint, tes, dan production build. Tes arsitektur menjaga batas modul bersama dan graf import tanpa siklus. Konfigurasi TypeScript legacy belum sepenuhnya strict. Tes SQL dijelaskan dalam panduan database.

Regresi browser beranda dan sesi tersedia melalui:

```sh
npm run test:ui:home
npm run test:ui:auth
npm run test:ui:sections
```

Jalankan server lokal terlebih dahulu, sediakan Playwright dengan browser Edge (atau tunjuk modulnya melalui `PLAYWRIGHT_MODULE`), dan gunakan `UI_ORIGIN` bila port berbeda dari `http://127.0.0.1:3000`. Pengujian memakai sesi dan data sintetis serta mencegat permintaan auth/data sehingga tidak mengubah Supabase production. Screenshot dan hasil uji disimpan di folder lokal `SDD-Script/evidence` yang tidak ikut Git. Fixture lokal tidak menggantikan smoke test integrasi produksi.

## Deployment

Hubungkan GitHub ke Vercel, pilih Node 22, dan isi environment variables dari `.env.example` lewat Dashboard Vercel. Gunakan origin HTTPS aplikasi yang konsisten untuk `NEXT_PUBLIC_SITE_URL` serta URL redirect Auth di Supabase. Environment `NEXT_PUBLIC_*` disertakan saat build; perubahan nilainya memerlukan build dan deployment baru.

Konfigurasi Vercel menjalankan `npm run check` saat build. Pastikan preflight database dan alur login/penyimpanan berhasil sebelum membuka layanan. Push atau merge kode tidak menjalankan skrip reset database.

## File untuk GitHub

Source, aset, lockfile dependency, konfigurasi build/CI, tes, `.env.example`, SQL, dan panduan operasional tetap masuk Git. Environment asli, dependency lokal, hasil build/cache, konfigurasi akun lokal, laporan diagnosis/progres, serta bukti pengujian diabaikan. Dokumen SDD asli tetap lokal.

Gunakan perintah di `package.json` dan konfigurasi `.env.example` yang terbaru. Catatan commit menjelaskan perubahan, validasi, dan batas penerapan. Panduan tambahan: [DESIGN.md](DESIGN.md), [SECURITY.md](SECURITY.md), dan [supabase/RESET_AND_SCHEMA.md](supabase/RESET_AND_SCHEMA.md).
