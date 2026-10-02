# Deployment staging perjalanan dan konsultasi

Migrasi tambahan: migrations/20260930_journey_v2.sql dan migrations/20260930_consultation.sql. Keduanya belum dijalankan oleh agen. Tidak menghapus atau mengubah tabel legacy. Terapkan berurutan pada proyek staging; pisahkan dari proyek produksi dan gunakan data sintetis.

## Konfigurasi

- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY dan SUPABASE_SERVICE_ROLE_KEY: konfigurasi proyek staging. Service role hanya server; jangan memakai prefix NEXT_PUBLIC untuk kunci ini.
- NIVO_FEATURE_TRIGGERS, NIVO_FEATURE_COPING, NIVO_FEATURE_SLIPS, NIVO_FEATURE_FOLLOWUPS: nilai false menonaktifkan fitur masing-masing pada API/UI; default aktif.
- NIVO_CONSULTATION_ENABLED=true hanya setelah kontrak/pelaksana layanan siap. Default tertutup.
- NIVO_ENVIRONMENT=test atau production. Default test. Roster environment harus cocok; lebih aman gunakan proyek Supabase terpisah untuk test/production.
- NIVO_CONSULTATION_POLICY: string JSON dengan version, cost, boundaries (string nonkosong), retentionDays (1–365), waitMinutes (integer >=0), hours (array {start,end}, ISO UTC, end setelah start). Gunakan nilai nyata yang disepakati, bukan fixture.
- NIVO_RETENTION_JOB_READY=true hanya setelah scheduler service-role menjalankan nivo_purge_consultation setidaknya setiap jam dan diuji. RPC menghapus room kedaluwarsa, membersihkan sinyal lama, audit >30 hari. API langsung menolak room yang lewat TTL walaupun job terlambat.
- NIVO_AUDIO_ENABLED=true hanya setelah QA TURN/audio. Default mati.
- NIVO_TURN_URL: URL TURN/TURNS dipisahkan koma. Gunakan TURN nyata milik layanan, termasuk transport yang diperlukan.
- NIVO_TURN_SECRET: shared auth-secret coturn; API menghasilkan username expiry dan HMAC SHA1. Tidak dikirim ke browser. Browser hanya mendapat credential sementara (600 detik). Uji kebijakan alokasi/durasi pada server TURN sebelum sesi panjang.

## Roster dan akses

Provision akun pengguna/konsultan/admin terpisah melalui admin Supabase. Isi nivo_consultants hanya lewat proses administratif tepercaya: user_id, display_name, credentials, verified_at, environment, role. Jangan menetapkan verified_at tanpa verifikasi manusia. available_until adalah lease kehadiran yang harus diperbarui operator layanan; tidak ada klaim otomatis bahwa konsultan online selamanya.

UI /contact-professional menampilkan antrean konsultan berdasarkan akunnya. Admin terverifikasi mendapat panel laporan. Konsultan dapat menerima, menulis chat, mengusulkan ringkasan; pengguna menyetujui. Semua data contoh pada skrip browser hanya fixture dalam proses tes, tidak dimasukkan ke tabel.

## Pemeriksaan SQL wajib

- anon/authenticated tidak dapat SELECT/INSERT/UPDATE/DELETE tabel baru atau menjalankan RPC commit/purge. Periksa juga izin inherited role deployment.
- Service role API berhasil menulis, mendapatkan revision monotonik dan menolak expectedRevision kedaluwarsa.
- Dua request operasi journey sama tidak menambah revision/reward dua kali; ID sama payload berbeda ditolak.
- Room lintas pengguna, konsultan belum terverifikasi, dan environment berbeda ditolak API. Admin akses harus menulis audit sebelum membaca.
- Jalankan purge setelah fixture expires_at di masa lalu. Verifikasi isi chat, sinyal, dan audit kedaluwarsa terhapus; jangan hanya percaya flag READY.
- Uji CAS melawan purge berjalan bersamaan dan request multi-perangkat. Test Node menggunakan RPC model dan tidak menggantikan ini.

## Rollback dan legacy

Sebelum cutover produksi, simpan backup sesuai kebijakan layanan, review pemetaan data legacy, dan lakukan rekonsiliasi jumlah catatan serta estimasi. Tidak ada migrasi otomatis yang menebak timezone/baseline/actual quit date.

Rollback aplikasi menggunakan versi deployment sebelumnya; nonaktifkan flag konsultasi/audio terlebih dahulu. Pertahankan tabel versi baru dan export data yang sudah dibuat; jangan DROP tabel sebagai rollback rutin. Snapshot source-before tahap 00–02 dan bukti pengujian tidak dihapus.

Ekspor/hapus perjalanan hanya mencakup versi baru. Ekspor akun menyeluruh, penghapusan profil/legacy, kebijakan backup, dan migrasi reward perlu alur terpisah yang disetujui pemilik produk.
