# Diagnosis kegagalan merge PR #2

Pemeriksaan pada 2 Oktober 2026 untuk branch `newversion/v2.1`, commit
`8328e95fb7a3b09396e6dd7e59ec1b4573da7627`.

## Penyebab dan perbaikan

| Check | Bukti | Tindakan |
| --- | --- | --- |
| Quality / checks | `npm ci` sukses; `npm run check` exit 9. Node 22 mereproduksi `bad option: --test-isolation=none`. | Script test memakai `node --test` dengan isolasi proses standar. `engines.node` dipatok `22.x` agar CI dan Vercel memakai major yang sama. |
| Quality / dependency-review | Anotasi GitHub: Dependency graph belum aktif. | Job tetap memblokir kerentanan high/critical, memakai `npm ci --ignore-scripts` dan `npm audit --audit-level=high` untuk seluruh lockfile, termasuk dependency development. Pemeriksaan ini mengevaluasi tree terkini, bukan diff dependency melalui API GitHub. |
| Quality / secrets | Gitleaks 8.24.2 lokal mereproduksi 13 temuan dari riwayat Git. | Scanner riwayat tetap aktif. Manifest `.next` dikeluarkan dari Git index; file lokal tetap ada. Riwayat lama belum dibersihkan. |
| Vercel | Commit status menunjuk deployment gagal; log build belum tersedia. | Perbaikan flag test berlaku juga pada `buildCommand: npm run check`. Penyebab Vercel belum dipastikan karena CLI lokal tidak memiliki sesi login. |

Rincian CI: [workflow run](https://github.com/hardiantots/firstview_nivo/actions/runs/36960174965).
Deployment: [Vercel](https://vercel.com/hardianto-tss-projects/web_app_nivo/AoZhFuRx3HFhMTr7NhA63aWCBdfW).

## Temuan secret yang masih menghalangi merge

Nilai credential tidak dicetak atau dimasukkan ke laporan ini.

- Dua temuan adalah `OPENROUTER_API_KEY` dalam riwayat `.env.production`
  dan `.env.development` pada commit `33fc2b7`. Nilainya berformat key provider,
  bukan placeholder. Key tersebut harus dicabut di OpenRouter jika belum
  dilakukan. Aplikasi sekarang tidak membutuhkan OpenRouter.
- Dua temuan JWT adalah Supabase **anon** key yang memang dipakai di browser;
  temuan tersebut bukan service-role key. Ini tidak mengubah kewajiban menjaga
  RLS dan aturan akses database.
- Sembilan temuan berasal dari key build Next.js dalam riwayat manifest `.next`.
  Hasil build tidak boleh di-commit kembali.

Menghapus file dari commit terbaru atau menambahkan `.gitignore` tidak menghapus
file dari commit lama. Karena scanner membaca seluruh riwayat, check `secrets`
masih akan gagal pada riwayat yang sekarang. Belum ada allowlist yang menyembunyikan
temuan ini, rewrite history, force-push, rotasi credential, atau deployment baru.

Setelah key dicabut, pembersihan riwayat harus dikerjakan dalam clone terpisah dan
diverifikasi ulang dengan Gitleaks. Path yang perlu dibuang dari riwayat adalah
`.env.production`, `.env.development`, dan `.next/`. Jangan menjalankan force-push
pada repository aktif tanpa koordinasi dan review: commit SHA berubah dan clone
lama dapat memasukkan kembali riwayat yang sudah dibersihkan. Panduan resmi:
[GitHub: removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

## Verifikasi lokal

- `npm run check` dengan Node **22.23.3** dan empat environment fixture yang sama
  dengan workflow: type-check, lint, **24/24 test**, dan build Next.js berhasil.
- `npm audit --audit-level=high`: **0 vulnerabilities**.
- `npm ci --dry-run --ignore-scripts --offline`: lockfile diterima. Instalasi CI
  pada run yang gagal sebelumnya juga berhasil; error terjadi setelah instalasi.
- `git ls-files .next`: kosong setelah penghapusan dari index. Penghapusan tersebut
  sudah staged; source/config yang diperbaiki belum di-commit atau di-push.

Untuk Vercel, periksa **Build Logs**, mulai dari error pertama. Pastikan scope
Preview dan Production memiliki `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, dan
`NEXT_PUBLIC_SITE_URL`. Service-role hanya untuk server dan tidak boleh diberi
prefix `NEXT_PUBLIC_`. Jangan mengirim nilai credential saat membagikan log.

Perbaikan lokal belum berarti check GitHub/Vercel sudah hijau. Check eksternal
baru dapat diverifikasi setelah perubahan branch dikirim dan blocker riwayat
secret diselesaikan.
