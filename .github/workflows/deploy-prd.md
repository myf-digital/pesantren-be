# Dokumentasi Pipeline Deployment (GitHub Actions)

Dokumen ini menjelaskan alur kerja file `.github/workflows/deploy.yml` yang digunakan untuk otomatisasi deployment aplikasi ke server.

## Trigger

Pipeline ini berjalan otomatis saat:

- Push ke branch `docker-dev`.
- Dijalankan manual via tab Actions (workflow_dispatch).

## Environment Variables & Secrets

Pipeline membutuhkan GitHub Secrets berikut:

- `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_KEY`: Akses SSH ke server.
- `CONFIG_ENV`: Isi lengkap file `.env` produksi (termasuk DB config, JWT secret, dll).
- `PORT`: Port aplikasi yang akan di-expose (misal: 5000).

## Tahapan Pipeline (Jobs)

### 1. Build

- **Checkout Code**: Mengambil source code terbaru.
- **Setup Node**: Menggunakan Node.js versi 22.
- **Build Docker Image**:
  - Membuat image `pesantren-be:${GITHUB_SHA}` menggunakan `Dockerfile` (multi-stage build).
  - Menyimpan image ke file arsip `app-image.tar.gz`.
- **Upload Artifact**: Menyimpan `app-image.tar.gz` sebagai artifact build (backup).

### 2. Copy Files (SCP)

Mengirim file berikut ke server direktori `/home/apps/<repo-name>`:

- `app-image.tar.gz`: Image Docker aplikasi.
- `docker-compose.yml`: Konfigurasi orkestrasi container.

### 3. Deploy (SSH)

Menjalankan script deployment di server via SSH:

#### A. Persiapan

1.  Masuk ke direktori aplikasi `/home/apps/<repo-name>`.
2.  Membuat file `.env` dari secret `CONFIG_ENV` dan menambahkan `IMAGE_TAG` (SHA commit).
3.  Load image Docker dari `app-image.tar.gz`.
4.  Menghapus file arsip `app-image.tar.gz` untuk menghemat ruang.

#### B. Backup (Rollback Prep)

1.  Backup file `docker-compose.yml` saat ini.
2.  Mencatat Image Tag dari container yang sedang berjalan (`PREV_IMAGE`) untuk keperluan rollback jika deploy gagal.

#### C. Start Application + Database Migration

Migrasi database sekarang dijalankan di dalam container utama saat start melalui script:

```json
"start-with-migrate": "npm run migrate && npm start"
```

dan dikaitkan di `Dockerfile` sebagai:

```dockerfile
CMD ["sh", "-c", "npm run start-with-migrate"]
```

Saat perintah berikut dijalankan, urutan yang terjadi adalah:

- Jalankan migrasi (`npm run migrate` → `npm run db:migrate`).
- Jika migrasi sukses, aplikasi dijalankan (`npm start` → `node dist/server.js`).

Menjalankan container baru dengan strategi rolling update (tanpa down time total):

```bash
docker compose up -d --no-build
```

_Note: Tidak menjalankan `docker compose down` agar network external tidak terhapus._

#### E. Health Check & Verification

Melakukan pengecekan endpoint `/health` (via `http://127.0.0.1:PORT/health`):

- Menunggu 10 detik awal (startup time).
- Melakukan retry hingga 30 kali dengan jeda 5 detik.
- Jika sukses: Lanjut ke cleanup.
- Jika gagal: Masuk ke prosedur Rollback.

#### F. Cleanup (Jika Sukses)

- Menghapus image lama, hanya menyisakan **3 versi terakhir** untuk rollback manual jika diperlukan.
- Menjalankan `docker image prune` untuk membersihkan dangling images.

#### G. Rollback (Jika Gagal)

Jika health check gagal:

1.  Menampilkan 50 baris log terakhir container.
2.  Mengembalikan `IMAGE_TAG` di `.env` ke versi sebelumnya (`PREV_TAG`).
3.  Menjalankan redeploy versi lama: `docker compose up -d`.

## Catatan Penting

1.  **Network**: Pastikan network Docker `pesantren-network` sudah dibuat di server (`docker network create pesantren-network`) karena `docker-compose.yml` menggunakannya sebagai network external.
2.  **Database**: Konfigurasi database (PostgreSQL) diambil dari `.env` yang di-inject saat deploy.
