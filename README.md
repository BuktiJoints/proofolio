# BuktiPraktik Backend

Backend monolitik Next.js untuk pengumpulan video praktik, analisis bukti berbantuan Gemini, verifikasi asesor, dan portofolio publik siswa. AI tidak pernah menetapkan nilai akhir; hasil model selalu menunggu keputusan asesor.

## Menjalankan secara lokal

1. Salin `.env.example` menjadi `.env` dan isi `BETTER_AUTH_SECRET`. Isi `GEMINI_API_KEY` untuk analisis nyata, atau gunakan `FAKE_AI=true` untuk demo tanpa API eksternal.
2. Jalankan `docker compose up --build`.
3. API tersedia di `http://localhost:3000`; MinIO Console di `http://localhost:9001`. Compose memakai build komunitas MinIO `soldevelo/minio` karena image Community Edition upstream sudah ditarik dari registry publik pada 2026.

Compose menjalankan migrasi dan seed secara otomatis. Akun asesor bawaan mengikuti `SEED_ASSESSOR_EMAIL` dan `SEED_ASSESSOR_PASSWORD`. Siswa mendaftar melalui `POST /api/auth/sign-up/email` lalu melengkapi `PATCH /api/v1/me/profile`.

## Alur demo

1. Siswa masuk, mengambil rubrik terbit dari `GET /api/v1/rubrics`, lalu mengunggah `multipart/form-data` (`rubricVersionId`, `video`) ke `POST /api/v1/submissions`.
2. Worker mengambil antrean PostgreSQL dengan `FOR UPDATE SKIP LOCKED`, mengirim video privat ke Gemini, lalu menyimpan bukti per kriteria.
3. Asesor membuka hasil, memulai review, menyimpan nilai per kriteria, dan memfinalisasi.
4. Siswa membuat tautan bukti dengan `POST /api/v1/submissions/:id/shares`; server hanya menyimpan hash token dan tautan dapat dicabut.

Video dibatasi 100 MB dan 120 detik, dengan format MP4, WebM, atau MOV. Berkas disimpan privat di MinIO dan dialirkan melalui endpoint berotorisasi yang mendukung HTTP Range.

Dokumentasi mesin tersedia di `GET /api/openapi.json`. Health check: `/api/health/live` dan `/api/health/ready`.

## Deployment home server

`compose.prod.yml` menarik image `ghcr.io/buktijoints/buktijoints:production`, sesuai tag production yang diterbitkan workflow GHCR dari branch `main`. Login ke GHCR terlebih dahulu jika package bersifat private, siapkan `.env` produksi, lalu jalankan:

```bash
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

Variabel tanpa nilai default yang wajib diisi adalah `POSTGRES_PASSWORD`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `GEMINI_API_KEY`, `SEED_ASSESSOR_EMAIL`, dan `SEED_ASSESSOR_PASSWORD`. Gunakan password PostgreSQL yang URL-safe karena nilainya juga dipakai untuk membentuk `DATABASE_URL` internal. `APP_IMAGE` dan `IMAGE_TAG` dapat digunakan untuk memilih image atau tag SHA tertentu saat rollback.

## Perintah pengembangan

```bash
bun run db:generate
bun run db:migrate
bun run db:seed
bun run dev
bun run worker
bun run lint
bun run typecheck
bun run test
bun run build
```
