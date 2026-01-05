# Panduan Deploy Produksi

Dokumen ini menjelaskan alur deploy produksi untuk aplikasi ini tanpa menggunakan file workflow YAML. Gunakan langkah-langkah berikut di GitHub Actions atau jalankan manual sesuai kebutuhan.

## Prasyarat
- Server tujuan memiliki akses SSH (user, host, port, key/password).
- Docker dan Docker Compose terpasang di server.
- Unrar terpasang di server (apt-get/yum/apk).
- Direktori workspace di server: `/home/apps/<nama-aplikasi>`.
- Repository Variable/Secret disiapkan:
  - SSH_HOST_PRD, SSH_PORT_PRD, SSH_USER_PRD, SSH_KEY_PRD atau SSH_PASSWORD_PRD
  - CONFIG_ENV_PRD berisi isi lengkap file `.env` produksi
  - APP_NAME_PRD (opsional; default nama repository)
  - DEPLOY_DIR_PRD (opsional; default `/home/apps/<APP_NAME_PRD>`)
  - PORT_PRD (opsional; default 5000 untuk health check)

## Build
1. Checkout repository lengkap (history dan submodules).
2. Setup Node.js 22.
3. Jalankan:
   - `npm ci`
   - `npm run build`
4. Buat artifact RAR dari folder `dist`:
   - Install `rar` di runner: `sudo apt-get update && sudo apt-get install -y rar`
   - `rar a pesantren-be-dist.rar dist`

## Persiapan Berkas Deploy
1. Tulis `.env` dari variable `CONFIG_ENV_PRD` ke file `.env`.
2. Siapkan `docker-compose.yml` dari repository (menggunakan service `app` saja).
3. Siapkan artifact `pesantren-be-dist.rar`.

## Transfer ke Server
Gunakan SCP untuk mengirim berkas ke server:
- `.env`
- `docker-compose.yml`
- `pesantren-be-dist.rar`

Target direktori: `${DEPLOY_DIR_PRD}` atau default `/home/apps/<APP_NAME_PRD>`.

## Eksekusi di Server
Jalankan perintah berikut via SSH:
```
set -e
DEPLOY_DIR=${DEPLOY_DIR_PRD:-/home/apps/${APP_NAME_PRD}}
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"
timestamp=$(date +%Y%m%d%H%M%S)
mkdir -p backups
if [ -f docker-compose.yml ]; then cp -f docker-compose.yml "backups/docker-compose.yml.$timestamp"; fi
if [ -d dist ]; then tar -czf "backups/dist.$timestamp.tar.gz" dist; fi

if ! command -v unrar >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update && sudo apt-get install -y unrar
  elif command -v apk >/dev/null 2>&1; then
    sudo apk add --no-cache unrar
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y unrar
  fi
fi

rm -rf dist
unrar x -o+ pesantren-be-dist.rar

if docker compose version >/dev/null 2>&1; then
  DCMD="docker compose"
else
  DCMD="docker-compose"
fi

$DCMD down
$DCMD up -d
```

## Health Check dan Rollback
Lakukan pengecekan kesehatan aplikasi:
```
set +e
ok=0
attempts=0
port=${PORT_PRD:-5000}
until [ $attempts -ge 10 ]; do
  if curl -fsS "http://localhost:${port}/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  attempts=$((attempts+1))
  sleep 5
done
set -e
```

Jika gagal:
```
$DCMD down
rm -rf dist
if [ -f "backups/dist.$timestamp.tar.gz" ]; then tar -xzf "backups/dist.$timestamp.tar.gz"; fi
if [ -f "backups/docker-compose.yml.$timestamp" ]; then cp -f "backups/docker-compose.yml.$timestamp" docker-compose.yml; fi
$DCMD up -d
exit 1
```

## Catatan
- Pastikan `.env` sesuai environment produksi (lihat `.env.example` untuk referensi key).
- Jika menggunakan database eksternal, set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` pada `.env` produksi.
- Endpoint health tersedia di `/health` pada port aplikasi.

