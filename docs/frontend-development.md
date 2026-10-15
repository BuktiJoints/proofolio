# Development frontend BuktiPraktik

Frontend memakai Next.js App Router, shadcn Base UI (token SkillFolio), Sora/Poppins lokal, Lucide,
dan TanStack Query. Seluruh implementasi fitur berada dalam `modules/`; `app/` menghubungkan
URL dan layout ke modul. Komponen shadcn bersama berada di `components/ui/`.

## Menjalankan lokal

Pertahankan konfigurasi koneksi di `.env`. Untuk development frontend dan automated test, gunakan
`FAKE_AI=true`. Perubahan mode AI membutuhkan restart web dan worker.

Terminal 1:

```bash
docker compose up -d --wait db minio
bun run db:migrate
bun run dev
```

Terminal 2:

```bash
bun run worker
```

Terminal 3 untuk pemeriksaan:

```bash
curl -fsS http://localhost:3000/api/health/ready
```

Jalankan migration setelah menarik perubahan kode yang membawa migration baru.
Menjalankan ulang `db:migrate` aman karena migration yang sudah diterapkan dilewati.
Pada mesin baru, jalankan `bun install`, `bun run db:migrate` dan `bun run db:seed` sebelum aplikasi.
Upload video membutuhkan `ffprobe` (tersedia setelah `brew install ffmpeg` di macOS).

Compose web memakai production build. Untuk pembaruan frontend otomatis, jalankan hanya database
serta MinIO di Docker, dan Next.js di host seperti di atas. Jangan jalankan dua web pada port 3000.

Port host dapat diubah lewat `POSTGRES_PORT`, `MINIO_API_PORT`, `MINIO_CONSOLE_PORT`.
Sesuaikan `DATABASE_URL` dan `S3_ENDPOINT` di `.env` dengan port host. Alamat internal Compose tetap
`db:5432` dan `minio:9000`. Jangan mencetak atau commit isi `.env`.

## Halaman dan modul

| Halaman | Modul | Akses |
|---|---|---|
| `/` | `auth` | Redirect ke login atau dashboard role |
| `/login`, `/register` | `auth` | Login bersama; registrasi hanya siswa |
| `/student/profile` | `profile` | Profil siswa |
| `/student/dashboard`, `/assessor/dashboard` | `dashboard` | Dashboard masing-masing role |
| `/student/rubrics`, `/student/rubrics/:id` | `rubrics` | Rubrik terbit yang tersedia untuk upload |
| `/assessor/rubrics`, `/assessor/rubrics/new`, `/assessor/rubrics/:id` | `rubrics` | Draft, ekstraksi PDF, versi, publish, archive |
| `/student/submissions/new` | `submissions` | Upload setelah profil lengkap |
| `/student/submissions`, `/assessor/submissions` | `submissions` | Riwayat, pagination, filter status |
| `/student/submissions/:id`, `/assessor/submissions/:id` | `submissions`, `assessment` | Video, status, evidence, review sesuai role |
| `/student/portfolio` | `portfolio` | Hasil selesai dan metadata share |
| `/evidence/:token` | `evidence` | Bukti publik dari share aktif |

Cookie Better Auth mengautentikasi request same-origin. `/api/v1/me` memberikan role dan profil
aktual. Frontend mengatur navigasi role, sedangkan API tetap memeriksa ownership dan organization.
Cache request dibersihkan setelah login/logout; tidak ada password atau token session dalam
localStorage. Halaman bukti publik memakai noindex dan no-referrer.

## Pengujian manual

1. Buka `/register`, buat akun siswa, isi nama sekolah dan program keahlian di profil.
2. Buka browser/profil browser terpisah untuk asesor. Login memakai akun seed sesuai `.env`.
   Dua tab dalam profil browser yang sama berbagi session; gunakan incognito atau profil berbeda.
3. Asesor membuka Rubrik → Buat rubrik. Isi manual, atau pilih satu PDF maksimal 10 MiB → Ekstrak.
   Dengan `FAKE_AI=true`, hasil adalah contoh simulasi, bukan pembacaan isi file. Pilih Gunakan hasil,
   tinjau/edit tiap kriteria dan bobot, Simpan draft, lalu Terbitkan rubrik tersimpan.
   Perubahan draft yang belum disimpan menonaktifkan tombol publish.
4. Siswa membuka rubrik aktif, mempelajari kriteria, dan mengajukan video MP4/WebM/MOV.
   Batas mengikuti environment (default 100 MiB dan 120 detik). UI tidak mengklaim hasil AI selesai
   ketika upload diterima; status dipantau otomatis. Worker harus berjalan.
5. Asesor membuka pengajuan setelah Menunggu asesor, memutar video, dan mengklik timestamp bukti.
   Mulai review, isi beberapa nilai, Simpan draft. Reload untuk memastikan draft tersimpan.
6. Siswa membuka detail sebelum finalisasi: draft feedback dan skor review tidak boleh terlihat
   maupun diterima dalam response API.
7. Asesor melengkapi semua nilai wajib dan feedback, lalu Finalisasi → Ya, finalisasi.
   Nilai harus integer 0..maxScore. Semua kriteria rubric masuk denominator; kriteria opsional
   yang tidak dinilai menyumbang nilai 0. Penilaian selesai tidak dapat diedit.
8. Siswa melihat hasil final dan portofolio. Buat tautan berbagi dengan masa berlaku 1..720 jam,
   salin dan buka di browser tanpa login. Identitas minimum, feedback, nilai per kriteria dan video
   harus tersedia. Cabut tautan, lalu reload halaman publik: Tautan tidak tersedia.
9. Logout dan akses halaman terlindungi: kembali ke login. Login asesor dan akses halaman siswa:
   kembali ke dashboard asesor. Ulangi navigasi pada lebar layar mobile.

Token share hanya diberikan saat creation. URL baru ditampilkan sementara pada halaman portofolio;
setelah reload, hanya metadata dan tombol revoke yang tersedia. Token tidak disimpan permanen di
browser. Buat share baru bila URL lama tidak lagi tersimpan.

## Pengujian otomatis

Pastikan database, MinIO, web, worker berjalan, `FAKE_AI=true`, dan FFmpeg tersedia.

```bash
bunx playwright install chromium
bun run test
bun run test:api
bun run test:e2e
```

Playwright membaca `.env` dan `.env.local` dengan loader Next.js. Default target adalah
`http://localhost:3000`; override menggunakan `TEST_BASE_URL` bila diperlukan, dengan origin auth
yang sesuai. Test hanya mengizinkan hostname web dan database lokal.

`test:api` menguji request HTTP dengan PostgreSQL nyata: role/tenant boundaries, ekstraksi PDF tanpa
persistence otomatis, version immutability, input validation, scoring optional criteria, dan
concurrent version creation, claim, retry serta finalisasi. `test:e2e` juga menjalankan browser
Chromium melalui registrasi, PDF, upload video, worker, draft/final review, portofolio, share/revoke,
Range video, logout dan navigasi mobile.

Fixture memakai organization dan akun unik. Data fixture dan object video dihapus setelah test;
data pengguna lainnya tidak dihapus. Jangan menjalankan test terhadap deployment produksi.
Unit tests memeriksa validasi, batas upload, timeout/abort, output provider tidak valid dan error
provider yang aman. Hasil mode simulasi tidak membuktikan kualitas ekstraksi/analisis Gemini nyata.

Verifikasi sebelum push:

```bash
bun run lint
bun run typecheck
bun run test
bun run test:e2e
bun run build
docker compose config --quiet
docker compose -f compose.prod.yml config --quiet
```

Production Compose membutuhkan environment production yang lengkap. Untuk pemeriksaan struktur
saja, placeholder dapat dipakai pada invocation terpisah; jangan menjalankan stack production
menggunakan placeholder.

## Menguji video keterampilan mengajar

Setelah `bun run db:seed`, refresh daftar rubrik siswa dan pilih **Keterampilan Mengajar
(Microteaching)**. Rubrik ini sudah terbit, memiliki enam kriteria wajib dengan total 100 poin,
dan dapat dipelajari pada halaman detail sebelum upload. Buat pengajuan baru; submission lama
tetap memakai snapshot rubrik yang dipilih saat pengajuan tersebut dibuat.

Untuk video mengajar dua menit, periksa bahwa opening, tujuan, penjelasan, interaksi, komunikasi,
dan closing benar-benar terekam. Bukti bagian yang tidak terekam boleh `NOT_OBSERVED` atau
`UNCERTAIN`; hasil demikian tidak berarti sistem gagal. AI tidak boleh mengarang aktivitas yang
tidak ada. Asesor tetap memeriksa timestamp, menentukan skor dan memberi feedback.

## Menguji Gemini nyata

Isi `GEMINI_API_KEY`, pilih `GEMINI_MODEL` yang tersedia untuk akun dan mendukung PDF serta video,
set `FAKE_AI=false`, lalu restart web dan worker. Ekstraksi PDF harus menghasilkan kriteria dari
PDF yang Anda unggah; semua hasil tetap perlu ditinjau. Pengujian automated lokal tetap memakai
mode simulasi agar tidak menggunakan kuota provider.

Gap backend yang belum termasuk pekerjaan frontend ini, seperti worker crash recovery dan timeout
analisis video, tercantum dalam AGENTS.md. Baca daftar tersebut sebelum deployment publik.

## Error 500 pada `/api/v1/me` setelah update kode

Jika schema aplikasi membaca `nisn`, `phone`, atau `notification_status_enabled`
tetapi database masih versi lama, endpoint profil dapat mengembalikan 500.
Pastikan database lokal aktif, lalu jalankan `bun run db:migrate`. Jangan
mereset volume/database: migration menambahkan field dan mempertahankan data.

Verifikasi regresi (akun pengujian sementara dibersihkan otomatis):

```bash
bunx playwright test tests/e2e/profile-schema.spec.ts
```
