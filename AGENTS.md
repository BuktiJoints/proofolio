<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BuktiPraktik Backend Engineering Contract

Dokumen ini adalah panduan kerja untuk developer dan coding agent yang mengubah backend
BuktiPraktik. Gunakan Bahasa Indonesia untuk penjelasan produk dan pertahankan identifier,
nama type, enum, field, serta endpoint dalam Bahasa Inggris.

## 1. Sumber Kebenaran dan Batas Sistem

Urutan penggunaan sumber kebenaran:

1. PRD dan Requirements Breakdown Structure (WBS) menentukan kebutuhan dan scope produk.
2. Dokumen ini menentukan kontrak API dan keputusan arsitektur backend.
3. OpenAPI harus mencerminkan kontrak dalam dokumen ini.
4. Kode adalah implementasi kontrak, bukan pengganti kontrak. Perbedaan yang sudah diketahui
   dicatat pada bagian `Known Implementation Gaps`.

Jika sumber-sumber tersebut bertentangan, jangan diam-diam memilih salah satunya. Pertahankan
perilaku yang kompatibel, dokumentasikan konflik, dan mintalah keputusan produk bila perubahan
akan memengaruhi data, keamanan, atau pengalaman pengguna.

Scope backend MVP:

- Registrasi, login, session, dan profil siswa.
- Pengelolaan rubrik berversi, calon draft dari PDF berbantuan Gemini, dan visibilitas rubrik aktif bagi siswa.
- Upload video praktik ke private object storage.
- Analisis video asynchronous dengan Gemini berdasarkan rubrik.
- Verifikasi manusia, pemberian skor, feedback, dan finalisasi oleh asesor.
- Status, riwayat penilaian, portofolio, dan shareable skill evidence.
- Health check, migration, seed, worker, dan deployment container.

Di luar scope:

- Pelatihan model AI dari awal.
- Keputusan kelulusan otomatis oleh AI.
- Sertifikat kompetensi resmi.
- Penilaian praktik live, administrasi sekolah lengkap, atau pendaftaran kerja/magang.
- Implementasi UI. Frontend dan backend berada dalam repository yang sama, tetapi kontrak ini
  hanya mengatur backend.

## 2. Prinsip Domain dan Security

### Roles dan tenant boundary

- `STUDENT` hanya boleh melihat dan mengubah profilnya sendiri, serta mengakses submission,
  video, portfolio, dan share miliknya sendiri.
- `ASSESSOR` boleh mengakses rubric dan submission dalam `organizationId` yang sama.
- Semua query resource terautentikasi wajib menyertakan organization boundary. Pemeriksaan role
  saja tidak cukup.
- Resource milik tenant atau pengguna lain dikembalikan sebagai `404`, bukan mengungkap
  keberadaannya melalui `403`.
- API key, password, session token, public-share token mentah, dan storage credential tidak boleh
  dicetak ke log atau response yang tidak membutuhkannya.

### Human-in-the-loop

- Gemini hanya menghasilkan calon bukti per kriteria.
- AI tidak menetapkan skor akhir, status lulus, atau keputusan kompetensi.
- Hanya asesor yang dapat memberikan keputusan per kriteria, skor, feedback, dan finalisasi.
- Siswa tidak boleh melihat draft review asesor. Hasil review baru menjadi visible setelah
  submission berstatus `COMPLETED`.

### Data visibility

- `ASSESSOR` dapat menerima raw AI run, evidence, dan draft review untuk proses verifikasi.
- `STUDENT` dapat melihat status proses. Pada submission yang belum `COMPLETED`, response siswa
  tidak boleh berisi draft review asesor.
- Provider error dan raw provider response tidak boleh diteruskan kepada siswa. Gunakan public
  error code yang stabil.
- Public evidence hanya tersedia untuk submission `COMPLETED`, token aktif, dan token yang belum
  kedaluwarsa.

## 3. Common API Contract

Base path aplikasi adalah `/`. Endpoint produk menggunakan `/api/v1`, sedangkan Better Auth
menggunakan `/api/auth`.

### Response envelope

Success tunggal:

```json
{
  "data": {}
}
```

Success dengan pagination:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

Error:

```json
{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Pesan aman untuk pengguna",
    "fields": {},
    "requestId": "uuid"
  }
}
```

`fields` bersifat opsional. Semua error harus memiliki `requestId`. Validation error adalah
`400`; unauthenticated adalah `401`; role yang salah adalah `403`; resource yang tidak terlihat
adalah `404`; state conflict adalah `409`; media type salah adalah `415`; payload terlalu besar
adalah `413`; dependency sementara gagal adalah `503`. Error database atau provider mentah tidak
boleh menjadi response client.

### Input rules

- Semua path UUID harus divalidasi sebelum query database.
- `page` adalah integer minimal `1`; `limit` adalah integer `1..100`. Nilai invalid menghasilkan
  `400 VALIDATION_ERROR`, bukan fallback, `null`, atau `500`.
- Filter enum harus divalidasi terhadap enum yang didokumentasikan.
- Request JSON menggunakan `Content-Type: application/json`.
- Upload video menggunakan `multipart/form-data`.
- Timestamp API menggunakan ISO 8601 UTC. Timestamp evidence menggunakan integer millisecond
  relatif terhadap awal video.

### Core enums

```text
UserRole          = STUDENT | ASSESSOR
RubricStatus      = DRAFT | PUBLISHED | ARCHIVED
SubmissionStatus = QUEUED | ANALYZING | ANALYSIS_FAILED |
                   AWAITING_REVIEW | IN_REVIEW | COMPLETED
JobStatus         = PENDING | RUNNING | SUCCEEDED | RETRY_SCHEDULED | FAILED
EvidenceStatus    = OBSERVED | NOT_OBSERVED | UNCERTAIN
EvidenceQuality   = CLEAR | PARTIAL | OCCLUDED
ReviewDecision    = CONFIRMED | REJECTED | ADJUSTED
```

### Submission state machine

Transisi legal:

```text
QUEUED          -> ANALYZING
ANALYZING       -> AWAITING_REVIEW | ANALYSIS_FAILED
ANALYSIS_FAILED -> QUEUED
AWAITING_REVIEW -> IN_REVIEW
IN_REVIEW       -> COMPLETED
COMPLETED       -> (terminal)
```

Setiap transisi wajib melalui domain transition service, berada dalam transaction yang sama
dengan side effect terkait, dan menulis `submission_events`. Route, worker, atau script tidak
boleh melakukan direct status update yang melewati Rule Engine.

## 4. API Contract

### 4.1 Authentication

Authentication menggunakan cookie session Better Auth. Endpoint auth mengikuti kontrak Better
Auth, dengan endpoint minimum berikut.

#### `POST /api/auth/sign-up/email`

- Public.
- Body: `{ "name": string, "email": string, "password": string }`.
- Akun baru selalu dibuat sebagai `STUDENT` dalam default organization; client tidak boleh dapat
  mengirim `role` atau `organizationId`.
- Success: `200` sesuai response Better Auth dan session cookie.
- Duplicate/invalid credentials mengikuti stable Better Auth client error dan tidak boleh menjadi
  `500`.

#### `POST /api/auth/sign-in/email`

- Public.
- Body: `{ "email": string, "password": string }`.
- Success: `200` dan session cookie.
- Kredensial salah tidak boleh mengungkap apakah email terdaftar.

#### `GET /api/auth/get-session`

- Mengembalikan session Better Auth aktif atau `null` sesuai kontrak Better Auth.

Endpoint sign-out, change-email, dan lifecycle session lain tetap disediakan oleh catch-all Better
Auth. Jangan menduplikasi password hashing atau session management di route produk.

### 4.2 Profile

#### `GET /api/v1/me`

- Role: authenticated `STUDENT` atau `ASSESSOR`.
- Success `200`: `{ data: { user, profile } }`.
- `profile` dapat `null`; student profile berisi `nisn`, `phone`, `schoolName`,
  `programKeahlian`, dan `notificationStatusEnabled`. `user.image` menyimpan URL foto profil.

#### `PATCH /api/v1/me/profile`

- Role: `STUDENT`.
- Body:

```json
{
  "name": "Nama Lengkap",
  "nisn": "1234567890",
  "phone": "+6281234567890",
  "schoolName": "Nama Sekolah",
  "programKeahlian": "Program Keahlian",
  "image": "https://example.com/foto.jpg",
  "notificationStatusEnabled": true
}
```

- `name`, `schoolName`, dan `programKeahlian` tetap wajib agar payload client lama kompatibel.
  Field lain additive. NISN bila dikirim wajib 10 digit dan unik; nomor telepon dinormalisasi ke
  format `+62`; image adalah URL atau null.
- Success `200`: profile yang telah tersimpan.
- Update nama user dan student profile harus atomic.
- Upload mensyaratkan NISN, nomor telepon, sekolah, dan program keahlian lengkap. Error
  `PROFILE_INCOMPLETE` menyertakan `fields.missing`.

### 4.3 Dashboard

#### `GET /api/v1/dashboard`

- Role: authenticated.
- `STUDENT`: hanya agregat dan submission miliknya.
- `ASSESSOR`: seluruh submission dalam organization yang sama.
- Success `200`: `{ data: { counts, recent } }`, dengan maksimal lima submission terbaru.

### 4.4 Rubrics

Rubric adalah aggregate root. `rubric_versions` dan `rubric_criteria` bersifat immutable setelah
version diterbitkan. Submission selalu menunjuk version tertentu agar penilaian lama tetap dapat
direproduksi.

Criterion input:

```json
{
  "code": "APD",
  "title": "Menggunakan APD",
  "description": "Deskripsi yang dapat diamati dari video",
  "order": 1,
  "required": true,
  "maxScore": 30
}
```

Dalam satu version, `code` dan `order` harus unik. `maxScore` adalah integer `1..100`.

#### `GET /api/v1/rubrics`

- Role: authenticated.
- `STUDENT`: hanya rubric `PUBLISHED` dalam organization-nya.
- `ASSESSOR`: semua rubric dalam organization-nya.
- Success `200`: list rubric; `activeVersionId` menunjukkan version yang dapat dipakai upload dan
  `partner` berisi id/nama organization pemilik sebagai mitra UKK.

#### `POST /api/v1/rubrics`

- Role: `ASSESSOR`.
- Body: `{ title, description?, criteria[] }`.
- Success `201`: rubric `DRAFT` beserta version pertama.
- Pembuatan rubric, version, dan criteria wajib berada dalam satu transaction.

#### `POST /api/v1/rubrics/extract`

- Role: `ASSESSOR`, authenticated melalui cookie Better Auth.
- Content type: `multipart/form-data`; tepat satu field file `file`, berisi PDF maksimal 10 MiB.
- Format diperiksa dari isi file, bukan filename atau MIME client.
- PDF dikirim inline ke Gemini, tanpa penyimpanan object/file remote maupun row database.
- Timeout ekstraksi 60 detik dengan abort provider; tidak ada retry otomatis yang menggandakan biaya.
- Success `200`: `{ data: { draft: { title, description, criteria[] }, simulated, requiresHumanReview: true } }`.
- Calon draft wajib ditinjau/diedit asesor. Simpan melalui `POST /api/v1/rubrics` atau edit draft;
  publish tetap merupakan tindakan terpisah oleh asesor.
- `FAKE_AI=true` mengembalikan contoh bertanda `simulated: true`, bukan ekstraksi isi dokumen.
- Error: `400 MISSING_FIELDS / INVALID_RUBRIC_FILE`, `413 FILE_TOO_LARGE`,
  `415 INVALID_CONTENT_TYPE / UNSUPPORTED_RUBRIC_FILE`, `503 RUBRIC_EXTRACTION_TIMEOUT /
  RUBRIC_EXTRACTION_INVALID / RUBRIC_EXTRACTION_FAILED`. Provider error tidak diteruskan.
- Output harus memenuhi schema rubric input, termasuk code/order unik dan maxScore integer 1..100.

#### `GET /api/v1/rubrics/:id`

- Role: authenticated dan organization-scoped.
- Success `200`: rubric beserta versions dan criteria terurut.
- Student hanya dapat membuka rubric `PUBLISHED`; versions hanya berisi versi aktif, tanpa draf asesor.

#### `PUT /api/v1/rubrics/:id/draft`

- Role: `ASSESSOR`.
- Mengubah version terbaru yang belum diterbitkan, termasuk saat ada versi aktif lain.
- Versi yang pernah diterbitkan tetap immutable.
- Body sama dengan create rubric.
- Success `200`: draft terbaru setelah perubahan.
- Target version yang pernah terbit menghasilkan `409 PUBLISHED_RUBRIC_IMMUTABLE`.

#### `POST /api/v1/rubrics/:id/versions`

- Role: `ASSESSOR`.
- Body opsional. Tanpa body, clone version terbaru; dengan body, buat version dari input.
- Success `201`: version draft baru.
- Membuat draft tidak mengubah versi aktif; aggregate tetap PUBLISHED atau ARCHIVED bila sudah memiliki versi aktif.
- Tanpa versi aktif, aggregate tetap DRAFT (atau ARCHIVED bila sebelumnya diarsipkan).
- Concurrent version creation harus menghasilkan nomor version unik tanpa `500`.

#### `POST /api/v1/rubrics/:id/publish`

- Role: `ASSESSOR`.
- Body opsional `{ "versionId": UUID }`; tanpa body memilih versi terbaru.
- Menerbitkan draf terpilih atau mengaktifkan kembali versi terbit dan menetapkannya sebagai `activeVersionId`.
- Metadata aggregate mengikuti snapshot versi aktif; publishedAt awal tidak diubah saat aktivasi ulang.
- Aktivasi dari ARCHIVED diperbolehkan; seluruh operasi memakai row lock aggregate.
- Success `200`: rubric `PUBLISHED`.
- Tidak boleh publish rubric tanpa version/criteria valid.

#### `POST /api/v1/rubrics/:id/archive`

- Role: `ASSESSOR`.
- Success `200`: rubric `ARCHIVED`; rubric tidak lagi tersedia untuk submission baru.
- Version yang sudah dipakai submission tetap dapat dibaca untuk history.

### 4.5 Submissions dan Video

#### `POST /api/v1/submissions`

- Role: `STUDENT` dengan profile lengkap.
- Content type: `multipart/form-data`.
- Fields:
  - `rubricVersionId`: UUID active version dari rubric `PUBLISHED` dalam organization siswa.
  - `video`: satu file MP4, WebM, atau MOV.
- Default limit: 100 MiB dan 120 detik, dikonfigurasi melalui environment.
- MIME harus dideteksi dari isi file dan video harus lolos `ffprobe`.
- Success `202`: submission berstatus `QUEUED` dan satu analysis job aktif.
- Penyimpanan object, pembuatan submission/job, dan compensation delete harus mencegah orphan
  object maupun submission tanpa job.

Error utama:

- `409 PROFILE_INCOMPLETE`
- `400 RUBRIC_NOT_ACTIVE`
- `400 MISSING_FIELDS`
- `400 INVALID_VIDEO`
- `413 FILE_TOO_LARGE`
- `413 VIDEO_TOO_LONG`: pesan memuat durasi yang dibaca `ffprobe`; `fields` berisi
  `durationMs` dan `maxDurationMs`. Batas 120 detik bersifat inklusif (120000 ms legal).
- `415 INVALID_CONTENT_TYPE`
- `415 UNSUPPORTED_VIDEO`

#### `GET /api/v1/submissions`

- Role: authenticated.
- Query: `page`, `limit`, dan optional `status: SubmissionStatus`.
- Student hanya menerima submission miliknya; asesor menerima organization-nya.
- Success `200`: paginated submission terbaru.

#### `GET /api/v1/submissions/:id`

- Role: authenticated dengan ownership/organization check.
- Success `200`: submission, rubric snapshot, ordered criteria, AI evidence, dan review sesuai
  visibility policy.
- Response siswa tidak boleh memuat draft review atau provider error.

#### `GET /api/v1/submissions/:id/video`

- Role: authenticated dengan ownership/organization check.
- Mendukung header `Range` dan mengembalikan `206` beserta `Content-Range` bila valid.
- Full response adalah `200`; invalid range adalah `416`.
- Video tidak boleh dialihkan ke public bucket URL.

#### `POST /api/v1/submissions/:id/retry-analysis`

- Role: owner `STUDENT` atau `ASSESSOR` dalam organization, sesuai policy biaya yang berlaku.
- Hanya legal dari `ANALYSIS_FAILED`.
- Success `200`: status kembali `QUEUED` dan tepat satu active analysis job dibuat.
- Concurrent retry harus idempotent; request kedua tidak boleh membuat duplicate job.

### 4.6 AI Evidence Contract

Worker meminta satu hasil untuk setiap criterion:

```json
{
  "criteria": [
    {
      "criterionId": "uuid",
      "status": "OBSERVED",
      "startMs": 1000,
      "endMs": 2400,
      "evidence": "Deskripsi faktual yang terlihat",
      "evidenceQuality": "CLEAR"
    }
  ]
}
```

Rules:

- Tepat satu normalized result disimpan untuk setiap criterion rubric.
- `startMs` dan `endMs` harus keduanya `null` atau keduanya integer valid.
- Jika terisi: `0 <= startMs <= endMs <= durationMs`.
- Criterion yang hilang atau timestamp invalid dinormalisasi menjadi `UNCERTAIN`, timestamp
  `null`, dan quality `OCCLUDED`.
- Duplicate atau unknown `criterionId` tidak boleh disimpan.
- Gemini upload polling dan generation wajib mempunyai timeout.
- Retry menggunakan bounded attempts dan backoff. Job `RUNNING` yang ditinggalkan worker harus
  dapat direclaim setelah lease kedaluwarsa.
- File sementara lokal dan remote Gemini harus dihapus melalui cleanup yang aman.

### 4.7 Assessment Review dan Scoring Rule Engine

Review item:

```json
{
  "criterionId": "uuid",
  "decision": "CONFIRMED",
  "score": 25,
  "note": "Catatan asesor"
}
```

Review body:

```json
{
  "feedback": "Feedback untuk siswa",
  "items": []
}
```

Rules:

- `criterionId` harus unik dan berasal dari rubric version submission.
- `score` adalah integer `0..criterion.maxScore`.
- Semua criterion `required` wajib memiliki item saat finalisasi.
- Feedback non-empty wajib saat finalisasi.
- Draft boleh belum lengkap.
- Normalized score dihitung dari total skor dibagi total `maxScore` criterion yang termasuk dalam
  kebijakan penilaian, dikali 100 dan dibulatkan dua desimal. Perilaku criterion opsional harus
  konsisten: denominator berasal dari seluruh criterion rubric, bukan hanya item yang kebetulan
  dikirim client.
- Finalisasi bersifat atomic dan idempotent; hanya satu `REVIEW_FINALIZED` event boleh dibuat.

#### `POST /api/v1/submissions/:id/review/start`

- Role: `ASSESSOR` dalam organization yang sama.
- Hanya legal dari `AWAITING_REVIEW`.
- Success `201`: review diklaim dan submission menjadi `IN_REVIEW`.
- Pemanggilan ulang oleh asesor yang sama dapat mengembalikan review yang sama dengan `200`.
- Asesor lain menerima `409 REVIEW_ALREADY_CLAIMED`.
- Concurrent claim harus diselesaikan dengan row lock/unique constraint dan tidak boleh menjadi
  generic `500`.

#### `PUT /api/v1/submissions/:id/review`

- Role: asesor yang mengklaim review.
- Menyimpan draft feedback dan items secara atomic.
- Success `200`; finalized review menghasilkan `409 REVIEW_FINALIZED`.

#### `POST /api/v1/submissions/:id/review/finalize`

- Role: asesor yang mengklaim review.
- Body harus memenuhi seluruh finalization rules.
- Success `200`: review finalized, submission `COMPLETED`, `normalizedScore` dan `completedAt`
  terisi.
- Error utama: `INCOMPLETE_REVIEW`, `FEEDBACK_REQUIRED`, `INVALID_CRITERION`, `INVALID_SCORE`,
  `REVIEW_NOT_STARTED`, dan `REVIEW_FINALIZED`.

### 4.8 Portfolio dan Sharing

#### `GET /api/v1/portfolio`

- Role: `STUDENT`.
- Mengembalikan hanya submission `COMPLETED`, rubric snapshot, score, dan metadata share milik
  siswa, terbaru lebih dahulu.

#### `POST /api/v1/submissions/:id/shares`

- Role: owner `STUDENT`.
- Submission harus `COMPLETED`.
- Optional body: `{ "expiresInHours": integer }`, rentang `1..720`.
- Success `201`: `{ id, token, url, expiresAt }`.
- Token mentah hanya dikembalikan saat creation; database hanya menyimpan SHA-256 token hash.

#### `DELETE /api/v1/shares/:id`

- Role: student pembuat share.
- Success `200`: `{ id, revoked: true }`.
- Operasi revoke bersifat idempotent.

#### `GET /api/public/evidence/:token`

- Public dengan unguessable token.
- Hanya valid untuk share aktif dan submission `COMPLETED`.
- Mengembalikan identitas portfolio minimum, rubric, final score, feedback, reviewed criteria,
  `videoUrl`, dan `expiresAt`.
- Token invalid, revoked, atau expired menghasilkan `404 SHARE_NOT_FOUND`.

#### `GET /api/public/evidence/:token/video`

- Public hanya melalui valid share token.
- Mendukung HTTP Range dengan contract yang sama seperti authenticated video.
- Jangan menaruh token pada log aplikasi.

### 4.9 Health dan API Specification

#### `GET /api/health/live`

- Tidak memeriksa dependency; menunjukkan proses web hidup.

#### `GET /api/health/ready`

- Memeriksa PostgreSQL dan object storage.
- `200 { "status": "ready" }` atau `503 { "status": "not_ready" }`.

#### `GET /api/openapi.json`

- Harus mendokumentasikan seluruh endpoint publik dan `/api/v1`, security scheme cookie,
  request/response schema, enum, pagination, serta reusable error schema.
- Perubahan contract belum selesai sampai OpenAPI dan dokumen ini ikut diperbarui.

## 5. Architectural Decisions

### AD-001 — Modular monolith dalam Next.js

Frontend dan backend memakai satu Next.js repository. HTTP adapters berada di `app/api`, sedangkan
domain logic, persistence, integration, dan worker berada di `server`. Route harus tipis: parse,
authorize, panggil domain service, lalu bentuk response.

Alasan: mempercepat implementasi hackathon, berbagi type/config, dan tetap memungkinkan worker
berjalan sebagai process terpisah dari image yang sama.

### AD-002 — PostgreSQL 17 sebagai system of record

PostgreSQL menyimpan auth, tenant, rubric versions, submissions, jobs, AI runs, review, share, dan
audit event. Drizzle adalah schema/query layer. Semua perubahan schema wajib menggunakan migration
yang committed; jangan memakai runtime schema synchronization di production.

### AD-003 — Better Auth untuk identity, domain DB untuk authorization

Better Auth mengelola credential dan session. Role dan `organizationId` dibaca ulang dari database
pada request terautentikasi agar authorization tidak bergantung pada client-controlled session
payload.

### AD-004 — Private S3-compatible object storage

Video disimpan privat di MinIO/S3. Client mengakses video melalui authorized streaming endpoint,
bukan public bucket. Object key menggunakan organization/user/random UUID dan tidak memakai nama
file dari pengguna.

### AD-005 — PostgreSQL-backed asynchronous job queue

Upload hanya membuat submission dan job, lalu segera mengembalikan `202`. Worker menggunakan row
locking dan `SKIP LOCKED`, bounded retry, lease/recovery, serta event recording. Desain ini cukup
untuk beban MVP tanpa menambah Redis/message broker.

### AD-006 — Gemini sebagai evidence extractor

Gemini menerima video dan snapshot rubric, kemudian mengembalikan structured evidence. Model name
berasal dari environment. Output dianggap untrusted input: selalu divalidasi dan dinormalisasi
sebelum disimpan. Model tidak menghasilkan final score.

### AD-007 — Immutable rubric versions

Published version tidak boleh dimutasi. Perubahan rubric dilakukan dengan membuat draft version
baru. Submission menyimpan reference ke version spesifik sehingga history tidak berubah ketika
rubric baru diterbitkan.

### AD-008 — Human-owned final assessment

AI evidence dan keputusan asesor disimpan terpisah. `analysis_evidence` tidak pernah ditimpa oleh
review; `review_items` menyimpan keputusan manusia. Final score hanya dihitung saat review lengkap
difinalisasi.

### AD-009 — Auditable state changes

Transisi domain penting menulis `submission_events` dalam transaction yang sama. Minimum event:
`SUBMITTED`, `ANALYSIS_STARTED`, `ANALYSIS_RETRY_SCHEDULED`, `ANALYSIS_FAILED`,
`ANALYSIS_COMPLETED`, `REVIEW_STARTED`, `REVIEW_SAVED`, dan `REVIEW_FINALIZED`.

### AD-010 — Hashed, expiring public links

Public share memakai random token minimal 256 bit. Hanya hash disimpan; lookup membandingkan hash.
Share dapat dicabut dan selalu mempunyai expiry.

### AD-011 — Satu image, beberapa process role

Dockerfile menghasilkan satu runtime image. Compose menjalankannya sebagai `web`, `worker`,
`migrate`, dan `seed` dengan command berbeda. PostgreSQL 17 dan MinIO adalah service terpisah.
Migration harus selesai sebelum seed; seed sebelum web/worker.

### AD-012 — Production configuration melalui environment

Secret tidak dibake ke image dan tidak committed. `.env.example` hanya berisi placeholder/default
development. Production wajib mengisi database password, auth URL/secret, storage credential,
Gemini key/model, dan seed assessor credential. Model default harus sama di schema env, local
Compose, production Compose, dan `.env.example`.

## 6. Development and Change Rules

Perintah verifikasi minimum:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
docker compose config --quiet
docker compose -f compose.prod.yml config --quiet
```

Untuk perubahan backend:

- Baca Next.js guide lokal di `node_modules/next/dist/docs/` sebelum mengubah API convention.
- Pertahankan separation antara route adapter, domain service, integration, dan persistence.
- Jangan mengakses resource hanya berdasarkan ID; selalu terapkan ownership/tenant scope.
- Jangan menulis `submissions.status` tanpa Rule Engine dan event transaction.
- Jangan mengubah published rubric version.
- Jangan mempercayai MIME, filename, UUID, enum, pagination, atau AI output dari client/provider.
- Setiap bug fix wajib mempunyai regression test.
- Endpoint baru wajib mempunyai unit/domain test dan integration test dengan PostgreSQL.
- Perubahan queue/review wajib mempunyai concurrency test.
- Perubahan schema wajib menyertakan migration dan pengujian dari database kosong.
- Perubahan public contract wajib memperbarui dokumen ini dan OpenAPI dalam commit yang sama.
- Jangan menampilkan isi `.env`, credential, API key, session cookie, atau raw share token di log
  test dan CI.

## 7. Deployment Contract

- Local development memakai `compose.yaml` dan membangun source lokal.
- Home-server production memakai `compose.prod.yml` dan image
  `ghcr.io/buktijoints/buktijoints:<tag>`.
- Branch `main` harus menerbitkan tag `production` dan immutable SHA tag melalui GitHub Actions.
- Production services harus memiliki restart policy, health check, bounded logs, persistent named
  volumes, dan private internal network.
- Hanya port aplikasi yang perlu diekspos publik. PostgreSQL tidak diekspos. MinIO Console default
  hanya bind ke loopback.
- TLS dan reverse proxy berada di edge/home-server layer, di luar Compose aplikasi.
- Backup PostgreSQL dan MinIO harus dibuat sebelum migration deployment.
- Rollback aplikasi menggunakan immutable image SHA; rollback schema hanya dilakukan melalui
  migration yang aman dan eksplisit.

## 8. Testing and Acceptance Baseline

Minimum automated coverage:

- Domain tests: score normalization, required criteria, transition matrix, AI normalization, dan
  token hashing.
- API integration: auth, role boundary, tenant boundary, profile, rubric lifecycle, upload
  validation, status/history, review lifecycle, portfolio, share/revoke/expiry, serta video Range.
- Worker integration: success, malformed AI response, provider timeout, bounded retry, permanent
  failure, crash recovery, dan duplicate worker concurrency.
- Concurrency: rubric version creation, review claim, analysis retry, dan review finalization.
- Migration/seed: database kosong, seed kedua yang idempotent, dan production startup ordering.
- NFR smoke/load: rata-rata 1 RPS dan peak 10 RPS untuk API non-AI; upload/analysis tetap
  asynchronous. Upload acknowledgement menjadi respons awal, bukan hasil AI dalam tiga detik.

Happy path MVP dianggap lulus bila:

1. Student register, melengkapi profile, melihat active rubric, dan upload video.
2. Worker menghasilkan validated evidence untuk setiap criterion.
3. Assessor melihat video/timestamp, menyimpan draft, lalu memfinalisasi seluruh criterion wajib.
4. Student hanya setelah finalisasi melihat score dan feedback.
5. Completed result muncul di portfolio dan dapat dibagikan dengan expiring/revocable token.

## 9. Known Implementation Gaps

Bagian ini mendeskripsikan ketidaksesuaian kode saat dokumen dibuat. Ini bukan contract yang harus
dipertahankan. Hapus item hanya setelah implementation, migration bila perlu, OpenAPI, dan regression
test selesai.

1. Unit tests serta API/browser integration dengan PostgreSQL dan concurrency tersedia. Coverage
   worker permanent failure, crash recovery, duplicate workers, production startup ordering dan
   target NFR masih perlu dilengkapi. Migration database kosong dijalankan oleh CI.
2. Preferensi notifikasi status baru dipersist, belum ada channel pengiriman email/push. Foto profil
   berupa URL eksternal; managed image upload berada di luar scope MVP.
3. Dashboard menampilkan tahap dan timestamp aktual tanpa ETA. Estimasi durasi belum diberikan karena
   belum ada telemetry historis yang cukup untuk menghasilkan prediksi yang dapat dipercaya.

## 10. WBS Web dan keputusan akses (15 Oktober 2026)

- Pendaftaran asesor adalah permohonan, bukan pemberian role langsung.
  `POST /api/v1/auth/register` menerima `intent: STUDENT | ASSESSOR`, nama, email,
  password, sekolah/instansi, dan program keahlian. Siswa wajib NISN 10 digit
  dan phone; asesor wajib employeeId. Success 201 dan cookie Better Auth.
- Siswa didaftarkan dengan profil lengkap. Permohonan asesor membuat user
  ber-role STUDENT tetapi `accessStatus=PENDING`, tanpa akses endpoint produk
  selain `/api/v1/me`. Client tidak dapat mengatur accessStatus atau role.
  Kegagalan penyimpanan profil/permohonan mengompensasi akun baru tersebut.
- `/api/v1/me` additive: user.accessStatus, assessorApplication dan assessorProfile.
  `currentUser()` membaca status terbaru dari DB; status non-ACTIVE menghasilkan
  403 ASSESSOR_APPROVAL_PENDING / ASSESSOR_APPLICATION_REJECTED.
- Administrator yang memiliki akses operasional database meninjau melalui
  `bun run assessor:review`. Tidak ada endpoint HTTP publik untuk promosi role.
  Persetujuan membutuhkan organizationId dan identitas reviewer, memakai row
  lock, idempotent untuk keputusan yang sama, dan menyimpan waktu/reviewer.
- `POST /api/v1/auth/login` menerima identifier dan password; identifier berupa
  email, nomor telepon siswa unik secara lookup, atau employeeId asesor yang
  sudah disetujui. Password dan cookie tetap dikelola Better Auth; pesan gagal
  tidak mengungkap apakah identifier terdaftar.
- Rubric input dan version snapshot additive: programKeahlian, partnerName,
  requirements (opsional). Metadata historis ikut immutable setelah publish.
  List rubric menyertakan criterionCount dan followed untuk siswa bersangkutan.
- Dashboard additive statistics: averageScore dari seluruh hasil selesai pada
  scope pengguna, completedThisMonth, activeRubrics. Tidak ada angka ETA buatan.
- `GET /api/v1/assessments/students` hanya ASSESSOR, organization-scoped,
  pagination 1..100, group pending/completed, q (nama/NISN), dan program.
  List submission menerima studentId UUID, group pending/completed,
  period=currentMonth dan minScore 0..100, tetap ownership/tenant-scoped.
- Submission baru belum masuk portofolio sampai siswa memanggil
  `POST /api/v1/submissions/:id/portfolio`; hanya hasil COMPLETED miliknya,
  idempotent. Migration mempertahankan hasil portofolio lama.
- `GET/POST/DELETE /api/v1/portfolio/share`: metadata aktif tanpa token; create
  token random 256-bit yang menggantikan tautan lama; revoke idempotent.
  Database hanya menyimpan SHA-256, expiry memakai SHARE_TTL_HOURS.
- `GET /api/public/portfolios/:token` hanya tautan aktif/belum expired;
  mengembalikan nama, sekolah, jurusan, foto dan hasil pilihan COMPLETED beserta
  feedback final. Tidak mengekspos NISN, email, phone, session atau draft.
- PDF memakai fasilitas cetak/simpan PDF browser dengan print stylesheet.
  Dukungan dokumen rubrik tetap PDF 10 MiB; DOC belum tersedia.
- Revisi nilai final menunggu keputusan produk; COMPLETED tetap terminal dan
  tidak dapat diubah. Tidak ada ambang kelulusan otomatis/badge lulus buatan.


## 11. Revisi alur versi rubrik (16 Oktober 2026)

Sesuai keputusan pengguna, asesor dapat memilih versi aktif dan menghapus draf lama.
Versi yang pernah diterbitkan tetap immutable; submission lama selalu menunjuk snapshot semula.

- `PUT /api/v1/rubrics/:id/versions/:versionId`: edit draf tertentu, body RubricInput, success 200.
- `DELETE /api/v1/rubrics/:id/versions/:versionId`: hapus hanya versi yang belum pernah terbit,
  success 200 `{ data: { id, deleted: true } }`. Tidak menghapus aggregate ataupun versi aktif.
- Kedua endpoint ASSESSOR organization-scoped, validasi UUID, 404 resource di luar tenant,
  409 PUBLISHED_RUBRIC_IMMUTABLE untuk versi terbit. Mutasi mengunci aggregate yang sama
  dengan publish/create, sehingga publish vs delete tidak bisa menghapus versi aktif.
- `PUT .../draft` tetap adapter kompatibel untuk draf terbaru.
- Membuat/mengedit/menghapus draf tidak menonaktifkan versi aktif. Archive menghentikan
  upload baru; publish dengan versionId mengaktifkan kembali snapshot terpilih.

- Profil additive notificationResultEnabled (default true), terpisah dari preferensi status.
  Pengiriman email tetap belum tersedia. GET portfolio menambahkan verifiedCriterionCount
  dari keputusan manusia CONFIRMED/ADJUSTED pada review final, untuk ringkasan profil.
