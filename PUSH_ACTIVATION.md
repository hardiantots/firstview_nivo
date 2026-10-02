# Mengaktifkan pengingat Web Push NIVO

Kode tersedia tetapi **pengiriman tetap nonaktif** sampai konfigurasi ini selesai. Pengingat dalam aplikasi tetap berfungsi tanpa Web Push. WhatsApp tidak digunakan.

## 1. Siapkan database dan kunci

Terapkan `supabase/migrations/20261002_sdd_features.sql`. Tabel `push_subscriptions` dan fungsi `nivo_claim_push`, `nivo_push_delivery_active`, serta `nivo_finish_push` harus tersedia. Lakukan uji di lingkungan staging sebelum production.

Buat sepasang kunci VAPID dan rahasia Cron sekali untuk setiap lingkungan:

```powershell
node scripts/generate-push-env.cjs mailto:admin@domain-anda.com
```

Perintah menyimpan `.env.push.local` yang diabaikan Git, tanpa mencetak kunci. File tidak ditimpa jika sudah ada. Simpan kunci yang sama untuk pengiriman berikutnya; mengganti kunci memerlukan pendaftaran ulang perangkat.

## 2. Konfigurasi server

Pada Vercel/server Next.js, tambahkan `NIVO_VAPID_PUBLIC_KEY`, `NIVO_VAPID_PRIVATE_KEY`, `NIVO_VAPID_SUBJECT`, dan `NIVO_PUSH_READY`. Kunci privat tidak boleh memakai awalan `NEXT_PUBLIC_`. API hanya mengembalikan kunci publik kepada akun yang sudah masuk.

Pada Supabase Edge Functions, tambahkan nama yang sama dan `NIVO_PUSH_CRON_SECRET`. `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` tersedia pada runtime Supabase. Mulai dengan `NIVO_PUSH_READY=false`.

```powershell
supabase secrets set --env-file .env.push.local
supabase functions deploy nivo-push
```

`supabase/config.toml` menetapkan `verify_jwt=false` untuk fungsi ini karena pemanggilnya Cron. Fungsi tetap memerlukan header `x-nivo-cron-secret` yang cocok dengan rahasia minimal 32 karakter; permintaan tanpa rahasia ditolak sebelum mengakses database.

## 3. Aktifkan penjadwal

Di Supabase Vault, simpan dua rahasia melalui dashboard:

| Nama | Nilai |
|---|---|
| `nivo_push_url` | URL HTTPS fungsi project kamu, berakhir `/functions/v1/nivo-push` |
| `nivo_push_cron_secret` | Nilai yang sama dengan `NIVO_PUSH_CRON_SECRET` |

Jalankan `supabase/push-cron.sql` di SQL Editor. Penjadwal berjalan setiap lima menit. Waktu dalam UI memakai selang lima menit dan zona waktu profil pengguna. Jangan menaruh nilai rahasia dalam file SQL yang di-commit.

Setelah skema, fungsi dan Cron siap di staging, ubah `NIVO_PUSH_READY=true` pada **Next.js dan Edge Function**, lalu deploy ulang konfigurasi Next.js. Terapkan ke production setelah alur di bawah berhasil. Menyetel flag saja tidak membuktikan pengiriman sudah berfungsi.

## 4. Verifikasi alur

1. Masuk melalui HTTPS, buka Perjalanan → Pengingat, lalu aktifkan pengingat. Izin notifikasi hanya diminta melalui aksi ini, bukan saat halaman dimuat.
2. Izinkan notifikasi, pilih waktu lima menit berikutnya, simpan jadwal, lalu tutup halaman. Pastikan notifikasi netral “NIVO” diterima dan membuka aplikasi.
3. Coba izin ditolak: UI menjelaskan bahwa pengingat masih tersedia ketika NIVO terbuka.
4. Matikan pengingat: persetujuan dan preferensi dimatikan, langganan akun di server dihapus, dan perangkat ini berhenti berlangganan. Tidak ada pengiriman berikutnya.
5. Uji akun lain pada perangkat yang sama. Endpoint yang sudah dimiliki akun berbeda tidak boleh dipindahkan; akun lain tidak bisa membaca atau menghapus langganan tersebut.
6. Uji jeda, batas 1–3 per hari, pengingat hari ke-1/3/7/14/30, serta perubahan zona waktu. Penjadwal memakai preferensi terbaru sebelum setiap pengiriman.

Pada iPhone/iPad, Web Push memerlukan versi sistem yang mendukungnya dan pemasangan aplikasi ke layar utama. Browser/perangkat yang belum mendukung fitur tetap memakai pengingat dalam aplikasi. Pengiriman bergantung pada izin browser, koneksi, dan layanan push; tidak dijanjikan sampai pada detik tertentu.

Pemeriksaan kode lokal (tanpa mengirim push):

```powershell
node --test scripts/sdd-push.test.cjs
npx deno check --config supabase/functions/nivo-push/deno.json supabase/functions/nivo-push/index.ts
npx deno test --allow-env=ECE_KEYLOG --config supabase/functions/nivo-push/deno.json supabase/functions/nivo-push/encryption.test.ts
```

Flag `ECE_KEYLOG` hanya dibaca oleh dependensi enkripsi. Jangan mengatur nilainya menjadi `1` di lingkungan mana pun karena mode debug itu dapat mencetak material enkripsi. Lockfile Deno terpisah disimpan bersama fungsi; dependency Web Push tidak masuk bundle browser.

## Privasi, pengiriman dan cache

Notifikasi hanya memuat ajakan netral. Nama, alasan pribadi, jumlah rokok, catatan dan percakapan tidak dikirim ke layar kunci. Endpoint dan kunci perangkat tidak dicatat ke log. Endpoint dibatasi ke penyedia Web Push HTTPS yang dikenal; pengiriman tidak mengikuti redirect. Endpoint kadaluwarsa (`404`/`410`) dihapus berdasarkan pemiliknya.

Reservasi database mencegah pengiriman ganda untuk pengingat yang sama, termasuk saat Cron dipanggil paralel. Pengiriman memakai TTL lima menit. Kegagalan tidak otomatis dicoba ulang untuk menghindari notifikasi berulang; keberhasilan layanan push juga bukan bukti pengguna membaca pesan.

Service worker hanya men-cache logo, halaman offline umum, dan aset statis Next.js. Halaman akun, respons API, data kesehatan dan media konsultasi tidak di-cache. Membuka ulang saat offline menampilkan halaman umum; isian tertunda yang sudah tersimpan pada perangkat tetap tersedia setelah aplikasi kembali terhubung.

## Referensi implementasi

- [Supabase: menjadwalkan Edge Functions dengan Cron dan Vault](https://supabase.com/docs/guides/functions/schedule-functions)
- [Supabase: mengamankan Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [MDN: subscribe melalui aksi pengguna dan kunci VAPID](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe)
- [web-push: enkripsi payload dan VAPID](https://github.com/web-push-libs/web-push)
- [WebKit: Web Push pada aplikasi layar utama iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
