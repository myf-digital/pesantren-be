# Aturan operasional keuangan

Backend menangani Rekap Harian, Target per akun, Anggaran Final, dan Beasiswa/Keringanan (per penerima atau agregat). Saldo awal disimpan langsung pada rekap harian, bukan tabel atau jenis impor baru. `jenis_data` batch baru hanya menerima `RekapHarian`, `Target`, `Anggaran`, dan `Beasiswa`; nilai lama `SaldoAwal` tetap dapat dibaca dari database untuk kompatibilitas histori.

## Instalasi dan verifikasi

Jalankan `npm run test:keuangan` untuk build dan pengujian aturan. Tes memakai model/database mock dan memeriksa SQL migration; tidak mengubah database nyata.

Migration `20261027000007-keu-operational-validation.ts` menambahkan CHECK nominal, cakupan beasiswa/status sumber anggaran, serta unique index data aktif. Migration `20261029000001-keu-history-and-master-guards.ts` menambahkan hash isi batch, deduplikasi referensi anggaran, dan trigger perlindungan kode master/pemindahan kelompok akun. Jalankan migration pada database tujuan sebelum menjalankan backend versi ini. Migration menolak duplikasi lama; tidak menghapus atau memilih otomatis histori keuangan.

## Input manual dan pilihan master

POST/PUT akun menerima `kode_kelompok` sebagai referensi kelompok. POST/PUT keempat jenis data keuangan menerima kode bisnis berikut sebelum validasi:

| Field input     | Lookup master                  | ID internal         |
| --------------- | ------------------------------ | ------------------- |
| `kode_akun`     | `keu_akun.kode_akun`           | `id_akun`           |
| `kode_beasiswa` | `jenis_beasiswa.kode_beasiswa` | `id_jenis_beasiswa` |
| `tahun_ajaran`  | `tahun_ajaran.tahun_ajaran`    | `id_tahunajaran`    |
| `nis`           | `santri.nis`                   | `id_santri`         |

Kode tidak dikenal, lookup ambigu, master tidak aktif, atau kode yang bertentangan dengan ID ditolak. UUID lama masih diterima untuk kompatibilitas API. Nama tidak digunakan sebagai identitas akun/kelompok/beasiswa. Field tahun ajaran mengacu pada label unik master akademik yang sudah tersedia.

Contoh POST `/keu-rekap-harian`:

```json
{
  "tanggal": "2026-10-29",
  "kode_akun": "KAS",
  "tahun_ajaran": "2026/2027",
  "saldo_awal": "100.00",
  "masuk": "20.00",
  "keluar": "5.00",
  "saldo_akhir": "115.00"
}
```

`id_batch` boleh tidak dikirim; sistem membuat batch berlabel `InputManual` dalam transaksi yang sama dengan data. Jika mengirim ID batch yang sudah ada, jenis harus sesuai dan batch tidak boleh Dibatalkan.

`GET /keu-{rekap-harian|target|anggaran|beasiswa}/form-options` mengembalikan master tahun ajaran dan `id_tahunajaran_default` hanya jika tepat satu master berstatus Aktif. Default ini merupakan saran untuk form baru; impor tidak menebak tahun ajaran. Akun periodik mewajibkan petugas melengkapi tahun ajaran. Master akun/kelompok dapat dicari lewat endpoint `all-data` dengan `q` dan `is_active=true`; respons memuat kode dan nama.

## Master

Kode/nama wajib, kode unik dan stabil, urutan integer, status boolean `is_active`. UUID v4 dibuat otomatis. Akun hanya menerima kelompok aktif. Kelompok/akun yang masih direferensikan tidak dapat dihapus permanen karena FK RESTRICT. Nama boleh diperbaiki. Kode yang telah dibuat tidak diubah; buat master baru jika maknanya berubah. Akun yang pernah dipakai tidak boleh dipindah kelompok, termasuk melalui import master. Trigger database melindungi jalur tulis lain dan penulisan bersamaan.

Import master mencari kode yang sudah ada dan memperbarui instance tersebut sehingga UUID tetap sama. Kode baru membuat UUID baru. Master akun tidak dibuat jika kelompok referensi tidak ditemukan atau tidak aktif. Import transaksi tidak membuat master dari kode tidak dikenal. Daftar contoh kode kelompok dalam spesifikasi tidak ditanam otomatis sebagai data master.

## Import, batch, dan koreksi

1. POST `/<modul>/export` dengan `{"template":"1"}` menghasilkan template resmi tanpa kolom UUID. Isi kode akun, kode jenis beasiswa, tahun ajaran dan NIS sesuai kolom yang tersedia.
2. POST `/<modul>/import` multipart: `file_import`, `mode=preview` (default). Hasil berisi total, valid, invalid, alasan per baris, payload, dan peringatan rekonsiliasi. Preview tidak menulis ke database.
3. Perbaiki baris gagal. Upload ulang dengan `mode=commit`, atau kirim payload baris valid melalui POST `/<modul>/insert` dengan `{"data":[...]}`.
4. Commit menyimpan baris valid dan batch secara atomik; baris gagal tidak disimpan. Batch mencatat nama file, jenis, rentang tanggal data valid, jumlah total/valid/error, pengguna, dan waktu. Insert JSON tidak memiliki file sumber sehingga nama/hash file kosong; hash isi data tetap disimpan.
5. Batch yang memiliki baris valid langsung `Dipublikasikan` dengan waktu publikasi; jika seluruh baris gagal status `ValidasiGagal`. Publikasi berarti tersedia bagi pelaporan. Tidak ada langkah pengajuan, persetujuan, release, atau publikasi manual setelah import.

File impor selalu mendapat batch baru. SHA-256 file mencegah pemrosesan file yang sama; hash payload ternormalisasi melindungi jalur commit/insert dari data identik. Unique index melindungi race penulisan. Batch Dibatalkan dikecualikan dari indeks hash; pembatalan metadata tidak otomatis menghapus/menonaktifkan data current. Pemeriksaan identitas current tetap berlaku saat impor ulang. Import master bersifat idempoten berdasarkan kode bisnis.

Untuk koreksi tanpa UUID, sertakan `aksi=koreksi` pada preview/commit atau insert. Sistem mencari baris current sesuai identitas bisnis dan membuat versi baru; jika tidak ditemukan, baris dinyatakan gagal. Default `aksi=tambah` menolak identitas current yang sudah ada. Export data biasa tetap memuat UUID/ID batch untuk audit; import dengan ID record lama juga diperlakukan sebagai koreksi. PUT membuat versi baru, dan DELETE hanya menonaktifkan current. Versi histori tetap dapat dibaca melalui detail atau filter `is_current=false`; list/export secara default hanya current (`is_current=all` untuk seluruh versi).

Koreksi mengunci versi lama, menandainya `is_current=false`, lalu membuat UUID baru dalam transaksi yang sama. Koreksi versi yang sudah menjadi histori ditolak. File parsial hanya memengaruhi baris yang dikoreksi; baris yang tidak ada dalam file tidak dianggap nol/tidak dihapus. Penggantian snapshot seluruh cakupan tidak dilakukan otomatis: gunakan koreksi baris dengan periode dan identitas yang jelas. Tidak ada rekonstruksi histori harian yang tidak tersedia dari sumber.

## Rekap harian dan saldo

Masuk/keluar tidak negatif. Saldo awal/akhir sumber dipertahankan, termasuk saldo bertanda negatif. Rekonsiliasi memakai aritmetika sen dengan BigInt untuk menjaga presisi NUMERIC(18,2); selisih menjadi warnings dan dicatat dalam keterangan, tanpa mengganti angka sumber. Identitas current adalah tanggal + akun + tahun ajaran, dengan penanganan NULL konsisten. Setiap baris terhubung ke batch. `created_at`/`updated_at` mencatat waktu versi; waktu arsip dicatat pada updated_at versi lama.

## Target dan anggaran final

Target hanya mendukung akun (id_akun NOT NULL); kelompok diperoleh dari akun. Jenis: Penerimaan/Pengeluaran/Anggaran/Lainnya. Periode valid dan nilai tidak negatif. Identitas current: akun + jenis target + periode mulai + periode selesai.

Anggaran final sudah disetujui di luar SADA. Nilai disetujui tidak negatif; realisasi boleh NULL. `status_sumber` merupakan informasi sumber dan tidak menjalankan workflow. Akun opsional; `per_akun=true` mewajibkan akun. Identitas deduplikasi jika kode referensi tersedia: kode referensi sumber + periode mulai + periode selesai + akun (NULL ditangani konsisten). Kode referensi harus mengidentifikasi sumber secara stabil. Koreksi tanpa UUID memerlukan kode referensi sumber. Anggaran tanpa referensi masih dilindungi hash isi batch; kode referensi direkomendasikan untuk pelacakan lintas file.

## Beasiswa dan keringanan

`cakupan_data=PerPenerima` mewajibkan santri; `Agregat` mewajibkan santri NULL. Tahun ajaran/jenis beasiswa wajib dari master yang sudah ada; relasi jenis menggunakan `jenis_beasiswa.id_beasiswa`. Nilai ditetapkan/realisasi tidak negatif, realisasi/diajukan boleh NULL jika tidak diketahui. Nilai diajukan hanya referensi dokumen sumber luar. Identitas current: cakupan + santri + jenis beasiswa + jenis bantuan + program + tahun ajaran + tanggal data. Program kosong dan NULL diperlakukan sama.

## Laporan dan akses

Semua endpoint `keu-*` memakai bearer token dan hak menu berdasarkan `module_name` yang sesuai route (`keu-akun`, `keu-beasiswa`, dan seterusnya). Hak view wajib, ditambah create/edit/delete/import/export sesuai operasi; `/insert` memakai hak import. Admin mengikuti mekanisme admin aplikasi. Hak `keu-beasiswa` mencakup rincian penerima, sehingga hanya diberikan kepada petugas berwenang. Tidak ada kebijakan per-santri tambahan yang ditebak dari nama peran.

`GET /keu-{rekap-harian|target|anggaran|beasiswa}/ringkasan` menerima filter `tanggal_awal`, `tanggal_akhir`, dan akun/tahun ajaran yang relevan. Hanya data current digunakan.

- Rekap: total masuk/keluar, posisi saldo akhir terakhir per akun/tahun ajaran beserta tanggalnya, dan periode sumber yang tersedia. Saldo antar tanggal tidak dijumlahkan. `histori_lengkap=null` menyatakan kelengkapan belum diketahui.
- Target: realisasi Penerimaan = total masuk, Pengeluaran = total keluar dalam periode target. Anggaran/Lainnya mengembalikan NULL sampai indikator bisnis disepakati. Tidak memakai saldo akhir sebagai realisasi universal. Tidak ada sumber rekap menghasilkan NULL, bukan realisasi nol yang diasumsikan.
- Anggaran dan beasiswa: nilai final dan realisasi ditampilkan terpisah, dengan jumlah baris yang realisasinya belum diketahui. Nilai final tidak ditambahkan ke realisasi sebagai total pengeluaran.

Repo ini menyediakan API backend; tampilan form/dashboard frontend perlu memakai kontrak endpoint di atas.
