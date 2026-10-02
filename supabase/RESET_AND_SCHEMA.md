# Reset dan skema Supabase NIVO — SDD 00–05

SQL disiapkan di repository. **Tidak ada reset, migrasi, pembuatan akun, pengiriman push, atau perubahan Supabase production yang dijalankan oleh pekerjaan ini.**

## Pilih jalur yang sesuai

| Tujuan | File yang dijalankan di Supabase SQL Editor, berurutan |
| --- | --- |
| Permintaan terbaru: bersihkan NIVO **dan seluruh akun login** | `reset-nivo-with-accounts.sql` → `migrations/20261002_sdd_features.sql` → `production-preflight.sql` |
| Bersihkan data NIVO, pertahankan akun login | `reset-nivo.sql` → `migrations/20261002_sdd_features.sql` → `production-preflight.sql` |
| Upgrade tanpa menghapus catatan atau akun | **Hanya** `migrations/20261002_sdd_features.sql` → `production-preflight.sql` |

File `20261002_sdd_features.sql` sudah lengkap: profil, arsip catatan/craving lama, perjalanan + operasi/revisi, konsultasi, push, pendamping, konten latihan, proyeksi grafik, dan semua RPC yang dibutuhkan kode baru. Tidak perlu menjalankan lagi migrasi `20260930_journey_v2.sql` / `20260930_consultation.sql` setelah file baru ini; migrasi lama dapat mengembalikan privilege perjalanan ke kebijakan lama sehingga grafik tidak bisa dibaca. Jangan menjalankan seluruh folder migrasi lama secara acak di SQL Editor.

## Urutan reset yang dapat diperiksa

1. Pastikan project Supabase benar, buat backup database/Auth, dan simpan backup Storage secara terpisah. Coba pemulihan backup di project staging. Reset akun menghapus **semua** pengguna `auth.users` dalam project, termasuk akun yang mungkin dipakai aplikasi lain.
2. Hentikan penulisan aplikasi serta job push/konsultasi selama maintenance. Bila cron push sudah aktif, nonaktifkan lewat Dashboard Cron atau perintah `cron.unschedule` yang ada di akhir `push-cron.sql`. File reset tidak mengubah extension/job/Vault project secara otomatis.
3. Jalankan seluruh isi `reset-nivo-with-accounts.sql` dalam satu eksekusi. Jangan hanya memilih beberapa baris dan jangan menambahkan `CASCADE`. Setiap kegagalan me-rollback transaksi; jika SQL Editor masih menunjukkan transaksi gagal, jalankan `ROLLBACK;` sebelum mencoba lagi.
4. Jalankan seluruh isi `migrations/20261002_sdd_features.sql`. Ini transaksi terpisah: **commit reset sebelumnya tidak dapat dibatalkan hanya karena migrasi berikutnya gagal**. Itulah alasan backup dan dry run staging dibutuhkan sebelum reset.
5. Jalankan `production-preflight.sql`. Ini hanya membaca metadata: objek/RLS/privilege/RPC/kolom dan nama trigger signup. Periksa juga Database Advisors.
6. Logout dan bersihkan data situs NIVO dari browser/perangkat lama, termasuk antrean catatan offline. Daftar akun baru melalui aplikasi, verifikasi email, lalu coba login, simpan rencana, catat angka 0, edit catatan, craving SOS, grafik, ekspor, dan profil di staging sebelum membuka production.

Reset tidak menyentuh `DROP SCHEMA public`, `auth`, atau `storage`, tidak menghapus file Storage, dan tidak menjatuhkan objek di luar daftar NIVO. FK `ON DELETE CASCADE` yang sudah ada pada `auth.users` tetap mengikuti aturan PostgreSQL dan dapat menghapus baris terkait; periksa penggunaan project bersama sebelum menghapus semua akun. FK restriktif atau dependency pada objek lain membuat seluruh transaksi gagal, bukan ikut dijatuhkan.

Supabase menyatakan akun yang memiliki objek Storage perlu dibereskan kepemilikannya sebelum dihapus. Skrip akun mengecek `storage.objects.owner`/`owner_id` dan **berhenti** bila masih ada file milik akun yang akan dihapus. Ia tidak menghapus atau memindahkan file. Pindahkan kepemilikan dengan alur Storage yang didukung setelah backup bila memang diperlukan. JWT yang sudah diterbitkan dapat bertahan hingga masa berlakunya habis; reset bukan logout browser otomatis. Endpoint NIVO tetap memverifikasi pengguna melalui Auth. [Dokumentasi Supabase Auth](https://supabase.com/docs/guides/auth/managing-user-data#deleting-users).

Pada reset yang mempertahankan akun, `nivo_journeys` menyimpan dokumen kosong dan revisi yang dinaikkan. Semua isi kesehatan dihapus, tetapi `user_id`/revisi tetap ada agar antrean offline lama mendapat konflik dan tidak otomatis memulihkan data yang telah dihapus. Pada reset akun, FK perjalanan ke `auth.users` menghapus baris perjalanan milik akun tersebut.

## Jika reset gagal karena `user_journey_stats`

Error `2BP01` yang menyebut `user_journey_stats` terjadi pada skema lama: view tersebut membaca `smoke_free_journey`, `user_stats`, dan `daily_consumption`. Kedua skrip reset sekarang menghapus view NIVO itu secara eksplisit sebelum tabel sumbernya, tanpa `CASCADE`.

Gunakan isi file reset terbaru dan jalankan seluruh transaksi kembali. Jika sesi SQL masih berada pada transaksi gagal, jalankan `ROLLBACK;` terlebih dahulu. Lalu jalankan migrasi baru dan preflight sesuai urutan di atas. View lama ini tidak dibuat kembali oleh skema baru; fitur perjalanan memakai dokumen perjalanan dan RPC analitik baru.

Jika reset sebelumnya dijalankan utuh dengan `BEGIN`/`COMMIT`, error membatalkan transaksi tersebut: tidak ada reset parsial yang di-commit. Jika hanya potongan SQL tanpa transaksi yang dijalankan, status data harus diperiksa terlebih dahulu. Dependency di luar daftar NIVO tetap menghentikan reset dan tidak dihapus otomatis.

## Sumber data dan kontrak aplikasi

`nivo_journeys.document` tetap sumber penulisan tunggal. `nivo_journey_operations` menjaga replay idempoten dan penolakan reuse ID; `revision` menjaga konflik antar perangkat. Pengaturan baru berada di **top level** dokumen schema 1: `ownReason`, `motivations`, `minutesToFirstCigarette`, `reduceFirst`, `rewardGoal`, `insightsHidden`, `cravingEvents`, `lessonCompletions`.

`daily_logs`, `craving_events`, dan `journey_settings` adalah **view baca saja**, bukan tabel yang di-upsert sendiri. Mereka memakai `security_invoker=true` dan `security_barrier=true`; authenticated mendapat SELECT pada perjalanan miliknya lewat RLS dan tidak mendapat INSERT/UPDATE/DELETE pada dokumen perjalanan. Jangan memakai contoh `upsert daily_logs` dari dokumen usulan; kode NIVO memakai API perjalanan dan RPC revisi yang sudah ada. Semantik view invoker mengikuti RLS pengguna pemanggil. [Dokumentasi PostgreSQL](https://www.postgresql.org/docs/current/sql-createview.html).

| Objek | Tujuan dan pembatasan |
| --- | --- |
| `user_profile` | Profil dasar. RLS hanya pemilik; alasan/timezone/motivasi baru dibaca dari perjalanan. Tidak ada fitur WhatsApp baru. |
| `daily_consumption`, `craving_logs` | Arsip lama terpisah; tidak otomatis dimasukkan ke estimasi perjalanan baru atau ditebak baseline/tanggal berhentinya. |
| `nivo_journeys`, `nivo_journey_operations` | Dokumen authoritative dan idempotensi. Penulisan hanya backend service role, setelah autentikasi dan validasi aplikasi. |
| `daily_logs` | `user_id`, `log_date`, `cigarettes` nullable, `reported`, snapshot `baseline_cigs_per_day`/`price_per_cigarette`/`baseline_id`, waktu pembuatan/perubahan. |
| `craving_events` | SOS dengan outcome `passed/ongoing/smoked`; check-in lama outcome `NULL`, intensity skala 1–5 dipetakan ×2 ke skala 0–10; slip tanpa tautan SOS diproyeksikan smoked/intensity NULL. Slip yang menautkan SOS lewat `cravingEventId` tidak dihitung dua kali. |
| `journey_settings` | Pengaturan/top-level alasan dan baseline versi terbaru untuk tampilan; bukan baseline yang dipakai menghitung ulang riwayat. |
| `push_subscriptions`, `nivo_push_deliveries` | Service-only. Endpoint unik global tidak boleh dipindahkan ke pengguna lain; satu reservasi per user/reminder untuk semua perangkat, metadata tanpa isi kesehatan. |
| `nivo_buddy_invites`, `nivo_buddy_links` | Service-only. Token undangan hanya hash, kedaluwarsa 24 jam, satu buddy aktif, dua pihak opt-in. Ringkasan hanya metrik yang dipilih; tidak membagikan catatan, kontak, alasan, atau pemicu. Bisa dicabut. |
| `lessons` | Konten edukasi nonmedis; authenticated hanya membaca yang aktif. Penyelesaian tetap dalam dokumen perjalanan. |
| `nivo_consultants`, `nivo_rooms`, `nivo_consultation_audit` | Kompatibilitas konsultasi yang telah ada, tetap service-only; skema tidak mengaktifkan layanan/tenaga konseling dengan sendirinya. |

RPC analitik `daily_series(p_days,p_tz)`, `craving_by_hour(p_days,p_tz)`, `craving_by_trigger(p_days)`, `journey_summary(p_tz)` adalah SECURITY INVOKER dan mengambil pemilik dari `auth.uid()`, bukan ID bebas dari request. Window dibatasi 1–366 hari, timezone harus dikenali PostgreSQL, kejadian di masa depan tidak dihitung. Gunakan client Supabase anon/publishable + access token pengguna yang sudah diverifikasi di backend; service role tanpa JWT pengguna tidak memiliki `auth.uid()` untuk RPC ini.

`daily_series` selalu mengembalikan N hari, termasuk `cigarettes: NULL` untuk belum tercatat dan angka `0` untuk laporan nol. Estimasi hemat/di­hindari memakai **snapshot baseline pada masing-masing hari**; bila belum ada hari dengan baseline lengkap, `saved`/`avoided` adalah NULL. `estimate_days` menjelaskan cakupan hitungan. `smoke_free_days` adalah jumlah kumulatif hari yang dilaporkan nol, tidak memiliki slip/outcome smoked pada tanggal lokal yang sama; bukan tebakan dari tanggal berhenti saja. `current_smoke_free_days` berhenti di hari tanpa laporan atau slip. Check-in tanpa hasil tidak menjadi craving yang berhasil lewat.

`nivo_update_profile(p_user,p_profile,p_expected,p_own_reason,p_timezone)` menjaga profil dan perubahan alasan/timezone/motivasi secara atomik pada lock perjalanan. Konflik revisi dikembalikan **sebelum** profil ditulis. Reason `''` menghapus alasan; parameter `NULL` mempertahankannya. Motivasi pada profil adalah mirror kompatibilitas; perjalanan authoritative untuk fitur baru. RPC mutasi, worker push, dan buddy hanya boleh dipanggil service role dari endpoint yang memverifikasi identitas.

Menghapus perjalanan melalui `nivo_delete_journey` mempertahankan revisi monotonic, menghapus subscription push pengguna, membatalkan reservasi push tertunda, dan mencabut undangan/berbagi buddy yang melibatkan pengguna sebagai pemilik maupun pendamping.

## Upgrade tanpa reset

Jalankan migrasi baru langsung pada staging terlebih dahulu. Semua catatan dan akun dipertahankan, kolom yang dibutuhkan ditambahkan, kebijakan RLS pada tabel NIVO diselaraskan. Empat RPC analitik didefinisikan ulang dalam transaksi agar hasil tambahan cocok walau sebelumnya memakai contoh SDD dengan jumlah kolom hasil berbeda; dependency yang tidak kompatibel membuat transaksi gagal tanpa `CASCADE`. Bila project sudah memiliki tabel independen `daily_logs/craving_events/journey_settings` dari eksperimen SQL sebelumnya, migrasi **menolak berjalan**; ekspor dan rencanakan konversi data secara eksplisit. Skrip tidak menimpa atau menghapus tabel tersebut diam-diam. Duplikasi `user_profile.user_id` juga harus ditangani dengan keputusan data yang jelas sebelum unique index dibuat.

Trigger signup custom lama tidak dihapus atau diubah otomatis. Periksa metadata trigger di preflight dan lakukan signup staging; trigger yang bergantung pada kolom/skema lama dapat menghalangi signup. [Panduan Supabase untuk trigger profil](https://supabase.com/docs/guides/auth/managing-user-data#accessing-user-data-via-api).

Alasan/motivasi lama dipindahkan dari profil ke perjalanan **hanya bila key `motivations` belum ada**, jumlah pilihan paling banyak dua, dan semua teks valid setelah spasi tepi dibersihkan. Daftar kosong yang sudah ada di perjalanan tetap kosong; tiga pilihan atau teks invalid tetap di profil, tanpa pemilihan/truncation diam-diam. Field perjalanan lain, snapshot baseline, dan history tidak diubah. Revisi dinaikkan satu kali agar perangkat dengan antrean lama perlu memuat versi terbaru sebelum menyimpan ulang; menjalankan migrasi kembali tidak mengulang perubahan. Pilihan yang belum dapat dipindahkan perlu dikonfirmasi pengguna melalui wizard.

## Push dan operasi opsional

Migrasi inti tidak memasang cron, tidak membuat VAPID key, dan tidak mengirim notifikasi. Aktifkan secara terpisah melalui [PUSH_ACTIVATION.md](../PUSH_ACTIVATION.md) dan `push-cron.sql` setelah Edge Function `nivo-push`, custom secret, VAPID, serta domain aplikasi benar. Vault menyimpan URL dan cron secret; file SQL tidak berisi nilai rahasia. Jadwal tiap 5 menit hanya mengambil pengingat pada window 5 menit yang dipilih pengguna, dengan consent, pause, cap 1–3 per hari, idempotensi, dan pengecekan ulang sebelum kirim. Metadata pengiriman dibersihkan setelah 30 hari.

Cron memakai `pg_cron` + `pg_net`; pola penyimpanan kredensial di Vault mengikuti [panduan Supabase scheduling](https://supabase.com/docs/guides/functions/schedule-functions) dan [Vault](https://supabase.com/docs/guides/database/vault). Ketersediaan extension, SMTP/Auth, layanan push nyata, dan deployment Edge Function perlu diperiksa pada project staging/production; bukan hasil uji offline.

## Bukti verifikasi dan batasnya

`tests/schema.test.cjs` menjalankan PostgreSQL WASM PGlite di memori dengan akun/role/Auth minimal sintetis. **19 tes lulus** pada verifikasi pekerjaan ini, mencakup RLS A/B/anon, privasi credential push, view, nol vs kosong, timezone, baseline historis, SOS/slip tanpa double count, replay/revision, profil atomik, buddy consent/revoke, cap/timewindow push, reset, preflight, skrip rollback staging, upgrade definisi RPC lama, backfill motivasi yang terbatas/idempoten, dan rollback dependency/Storage guard. Tidak ada request jaringan atau data production dalam tes.

Untuk menjalankannya tanpa menambah dependency runtime aplikasi:

```powershell
$taskSqlTools = Join-Path $env:TEMP 'nivo-sdd-postgres-tools'
npm.cmd install --prefix $taskSqlTools --no-save --ignore-scripts @electric-sql/pglite@0.3.14
$env:PGLITE_MODULE = Join-Path $taskSqlTools 'node_modules/@electric-sql/pglite'
node --test supabase/tests/schema.test.cjs
```

Tes ini memverifikasi SQL nyata dan RLS PostgreSQL, tetapi bukan instalasi Supabase Auth/Storage/cron lengkap. Untuk project nyata, gunakan `tests/rls-staging.sql` dengan dua akun Auth staging yang disposable: ganti dua UUID placeholder, jalankan seluruh file, dan pertahankan `ROLLBACK`. Semua fixture kesehatan pada tes staging di-rollback. Signup email nyata, trigger custom, Storage ownership, PostgREST gateway, cron HTTP, dan push delivery masih perlu smoke test staging sebelum reset/deployment production.
