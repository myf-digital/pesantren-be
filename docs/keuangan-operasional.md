# Validasi dan aturan operasional keuangan

Jalankan `npm run test:keuangan` untuk build dan pengujian aturan. Tes memakai database mock dan memeriksa SQL PostgreSQL; migration tidak dijalankan otomatis.

Migration `20261027000007-keu-operational-validation.ts` menambahkan CHECK nominal, kolom cakupan beasiswa/status sumber anggaran, serta unique index untuk data aktif. Data lama beasiswa diberi cakupan `PerPenerima` jika memiliki santri, atau `Agregat` jika santri NULL. Migration tidak menghapus atau memilih otomatis data duplikat lama.

## Master

Kode/nama wajib, kode unik, urutan integer, dan status memakai boolean `is_active`. UUID dibuat aplikasi. Akun hanya menerima pilihan kelompok kas aktif. Hapus kelompok kas/akun yang masih direferensikan ditolak melalui FK dan respons HTTP 400.

## Rekap harian

- `masuk`/`keluar` tidak negatif. Saldo sumber boleh bertanda negatif.
- Akun dengan `is_periodik_tahun_ajaran=true` mewajibkan tahun ajaran.
- Identitas data aktif: tanggal + akun + tahun ajaran (NULL dihitung sebagai satu nilai).
- Saldo dibandingkan dengan `saldo_awal + masuk - keluar` menggunakan aritmetika sen agar presisi tetap terjaga. Perbedaan menjadi `warnings` pada preview/respons simpan dan dicatat di `keterangan`; nilai sumber tidak diganti.
- PUT membuat baris dengan UUID baru, menandai versi lama `is_current=false`, dan mengembalikan `{value, warnings}`. Baris lama tetap dapat diakses melalui detail/list. Koreksi versi yang sudah menjadi histori ditolak.
- Import/insert dengan `id_rekap` melakukan koreksi versi yang sama; tanpa ID membuat data baru dan menolak identitas aktif yang sudah ada. DELETE menonaktifkan versi tanpa menghapus baris.
- Template Excel tetap memiliki kolom Saldo Awal, Masuk, Keluar, dan Saldo Akhir yang terpisah.

## Target

Jenis target dibatasi Penerimaan/Pengeluaran/Anggaran/Lainnya. Periode valid dan nilai tidak negatif. Identitas aktif: akun + jenis target + periode mulai + periode selesai. Tahun ajaran wajib untuk akun periodik.

## Anggaran

Nominal disetujui dan realisasi (jika diisi) tidak negatif. Akun tetap opsional sesuai desain tabel; form per akun dapat mengirim boolean `per_akun=true`, yang mewajibkan `id_akun` pada create maupun update. `per_akun` adalah parameter validasi form dan tidak disimpan. `status_sumber` adalah teks opsional (maksimum 100 karakter), juga tersedia dalam export/import. Tidak ada proses persetujuan anggaran dalam SADA.

## Beasiswa

`cakupan_data` menerima `PerPenerima` (default, wajib santri) atau `Agregat` (santri wajib NULL). Tahun ajaran dan jenis beasiswa wajib ditemukan. Relasi jenis memakai `jenis_beasiswa.id_beasiswa`. Nilai ditetapkan/realisasi tidak negatif; nilai diajukan boleh NULL sesuai sumber.

Identitas aktif: cakupan + santri + jenis beasiswa + jenis bantuan + program + tahun ajaran + tanggal data. Program kosong/NULL diperlakukan sama. Excel memiliki kolom `Cakupan Data`; untuk data agregat isi `Agregat` secara eksplisit.

## Import dan duplikasi

Pemeriksaan dijalankan pada CRUD, preview, commit, dan insert batch. Duplikasi identitas di dalam file/batch ditolak. Unique index data aktif melindungi penulisan bersamaan; versi histori tidak ikut indeks unik. Batch impor harus ditemukan, sesuai jenis datanya, dan tidak berstatus Dibatalkan. Persyaratan `id_batch` pada tabel yang sudah mewajibkannya tetap berlaku.
