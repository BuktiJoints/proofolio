# Implementasi WBS dan desain Proofolio

Sumber: WBS Siswa (Web), WBS Asesor (Web), dan Figma SkillFolio halaman desain utama.
Frontend berada dalam `modules/`; adapter URL di `app/`, komponen shadcn di `components/ui/`.
Warna dan typography memakai token global yang sudah tersedia.

## Alur siswa

1. Landing → daftar siswa dengan profil lengkap → dashboard.
2. Pilih Modul UKK, cari/filter program dan lihat kriteria serta kebutuhan praktik.
3. Upload video → halaman konfirmasi → pantau status aktual dari worker.
4. Hasil final baru tampil setelah diterbitkan asesor. Draft nilai/feedback tidak terlihat siswa.
5. Klik **Tambahkan ke Digital Portofolio** untuk memilih hasil yang akan ditampilkan.
6. Pada portofolio, aktifkan akses Publik untuk membuat tautan portofolio dengan masa berlaku.
   Kembalikan ke Pribadi untuk mencabutnya. Link hanya ditampilkan saat dibuat;
   setelah reload, buat link baru bila salinan sebelumnya hilang.
7. Bagian **Bagikan bukti video** menyediakan link per hasil, termasuk video dan rincian kriteria.
8. **Unduh Portofolio (PDF)** membuka dialog cetak browser: pilih Save as PDF.

Submission lama tetap masuk portofolio untuk kompatibilitas. Upload baru harus dipilih secara
manual setelah selesai. Portofolio publik hanya menampilkan identitas minimum dan hasil terpilih;
NISN, email dan telepon tidak dibagikan. Semua tautan menyimpan hash token dalam database.

## Pendaftaran dan persetujuan asesor

Sesuai keputusan produk, pendaftaran asesor adalah pengajuan, bukan akses langsung.
Buka `/assessor/register`, isi identitas/institusi/jurusan/NIP, lalu tunggu di halaman status.
Akun pending tidak dapat membaca atau menilai data siswa. Setelah disetujui, login dapat memakai
email atau NIP. Asesor hanya dapat mengakses siswa dalam organisasi yang ditetapkan admin.

Persetujuan saat ini dilakukan operator server melalui CLI; belum ada dashboard admin web.
Operator harus memastikan identitas asesor dan menentukan organisasi yang benar sebelum approval.

```bash
# Daftar pengajuan yang masih menunggu.
bun run assessor:review --list

# Setujui pengajuan; ganti nilai contoh dengan ID sebenarnya.
bun run assessor:review --id <application-uuid> --organization <organization-uuid> --reviewer "Nama Admin"

# Tolak pengajuan.
bun run assessor:review --id <application-uuid> --reviewer "Nama Admin" --reject
```

UUID organisasi dapat diperiksa operator pada tabel `organizations` di database lokal.
CLI mencatat waktu dan nama reviewer, membuat profil asesor dan mengubah akses secara atomic.
Jangan memberikan akses terminal/database kepada pendaftar. Akun seed asesor tetap dapat
langsung dipakai untuk development sesuai konfigurasi seed yang sudah ada.

## Alur asesor

Dashboard → Modul UKK → buat/edit draft manual atau ekstrak PDF → tinjau hasil → simpan → publish.
Metadata jurusan, mitra dan kebutuhan praktik disimpan bersama versi rubrik. Versi terbit yang
sudah digunakan submission tidak diubah.

Daftar Siswa → cari nama/NISN atau filter jurusan/status → buka siswa → pilih pengajuan UKK.
Video dan bukti AI ada di kiri; keputusan kriteria, skor dan feedback di kanan.
Mulai review untuk mengklaim pengajuan, verifikasi timestamp, simpan draft, lalu
**Simpan & Terbitkan Penilaian** setelah seluruh kriteria wajib dan feedback lengkap.
Riwayat Penilaian menampilkan hasil selesai dengan filter periode/nilai.

## Keputusan dan batas saat ini

- Hasil AI adalah calon bukti, bukan keputusan kelulusan. Tidak ada label lulus otomatis tanpa
  aturan kelulusan yang disepakati.
- Finalisasi tetap terminal sesuai kontrak backend. WBS menyebut edit nilai setelah final;
  perubahan ini menunggu keputusan produk karena memengaruhi hasil yang sudah dibagikan.
- Rubrik diunggah sebagai PDF maksimal 10 MiB; DOC/DOCX belum didukung.
- Video memakai batas environment aktual (default 100 MiB, 120 detik), bukan angka statis desain.
- Status proses memakai tahap/timestamp aktual; ETA tidak dibuat tanpa data historis.
- Preferensi notifikasi tersimpan; pengiriman email/push belum tersedia.
- Foto profil berupa URL. Managed image upload belum tersedia.
- Ekspor PDF memakai browser. Tidak ada sertifikat kompetensi resmi.

## Verifikasi lokal

Setelah update kode, jalankan `bun run db:migrate`, kemudian restart web dan worker.
Migration 0002/0003 menambahkan approval asesor, metadata rubrik dan portofolio pilihan.
Migration aman dijalankan kembali dan tidak memerlukan reset volume.

```bash
docker compose up -d --wait db minio
bun run db:migrate
bun run dev
# Terminal terpisah:
bun run worker
```

Uji manual menggunakan dua profil browser agar session siswa dan asesor tidak tertukar.
Pilih rubrik yang cocok dengan isi video; bukti aktivitas yang tidak terekam boleh tidak teramati.
Untuk Gemini nyata, isi key lokal, set `FAKE_AI=false`, lalu restart kedua proses.
Untuk tes otomatis tanpa kuota Gemini:

```bash
bun run test:local
# Atau hanya alur browser lengkap:
bun run test:local tests/e2e/workflow.spec.ts
```

Runner menggunakan database dan bucket sementara, mengecek migration dari kosong dan seed dua kali,
serta membersihkan resource pengujiannya. Pemeriksaan ini tidak menilai kualitas analisis Gemini nyata.
