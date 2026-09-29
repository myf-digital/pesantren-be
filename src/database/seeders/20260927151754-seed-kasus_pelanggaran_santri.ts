import { QueryInterface } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Ambil beberapa ID dari tabel referensi agar bervariasi
    const [santriData]: any[] = await queryInterface.sequelize.query(
      'SELECT id_santri FROM santri LIMIT 10;'
    );
    const [masterData]: any[] = await queryInterface.sequelize.query(
      'SELECT id_pelanggaran_remisi, skor FROM master_pelanggaran_remisi LIMIT 10;'
    );
    const [lokasiData]: any[] = await queryInterface.sequelize.query(
      'SELECT id_lokasi FROM lokasi LIMIT 5;'
    );
    const [pegawaiData]: any[] = await queryInterface.sequelize.query(
      'SELECT id_pegawai FROM pegawai LIMIT 5;'
    );

    // Validasi Ketersediaan Data
    if (!santriData.length || !masterData.length || !lokasiData.length || !pegawaiData.length) {
      console.warn(
        '⚠️ Data Master/Referensi tidak lengkap. Seeder 10 Kasus Pelanggaran dilewati.'
      );
      return;
    }

    // Helper untuk mengambil data acak dari array referensi
    const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    
    // Helper format tanggal untuk Nomor Kasus
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const payloads = [];

    // ==============================================================================
    // SKENARIO 1: Pelanggaran Ringan Biasa (Status: Proses)
    // ==============================================================================
    const m1 = getRandom(masterData);
    payloads.push({
      id_kasus: uuidv4(),
      nomor_kasus: `KS-${todayStr}-00001`,
      id_santri: getRandom(santriData).id_santri,
      id_pelanggaran_remisi: m1.id_pelanggaran_remisi,
      id_lokasi: getRandom(lokasiData).id_lokasi,
      tanggal_kejadian: new Date(),
      skor_master_snapshot: m1.skor || 5,
      skor_diberikan: m1.skor || 5,
      alasan_penyesuaian_skor: null,
      kronologi: 'Santri terlambat datang ke masjid untuk sholat subuh berjamaah.',
      punishment_detail: null, // Belum ada hukuman karena masih proses
      foto_bukti: null,
      level_sp: null,
      nomor_surat_sp: null,
      foto_dokumen_sp: null,
      status_progress: 'Proses',
      id_petugas_pelapor: getRandom(pegawaiData).id_pegawai,
      id_petugas_penanggung_jawab: getRandom(pegawaiData).id_pegawai,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // ==============================================================================
    // SKENARIO 2: Pelanggaran Sedang + Hukuman (Status: Selesai)
    // ==============================================================================
    const m2 = getRandom(masterData);
    payloads.push({
      id_kasus: uuidv4(),
      nomor_kasus: `KS-${todayStr}-00002`,
      id_santri: getRandom(santriData).id_santri,
      id_pelanggaran_remisi: m2.id_pelanggaran_remisi,
      id_lokasi: getRandom(lokasiData).id_lokasi,
      tanggal_kejadian: new Date(),
      skor_master_snapshot: m2.skor || 15,
      skor_diberikan: m2.skor || 15,
      alasan_penyesuaian_skor: null,
      kronologi: 'Ketahuan menggunakan handphone di luar jadwal yang ditentukan.',
      punishment_detail: 'Penyitaan HP selama 1 bulan dan menghafal surat Yasin.',
      foto_bukti: '/uploads/bukti/hp_sitaan.jpg',
      level_sp: null,
      nomor_surat_sp: null,
      foto_dokumen_sp: null,
      status_progress: 'Selesai',
      id_petugas_pelapor: getRandom(pegawaiData).id_pegawai,
      id_petugas_penanggung_jawab: getRandom(pegawaiData).id_pegawai,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // ==============================================================================
    // SKENARIO 3: Pelanggaran Berat + SP1 (Status: Selesai)
    // ==============================================================================
    const m3 = getRandom(masterData);
    payloads.push({
      id_kasus: uuidv4(),
      nomor_kasus: `KS-${todayStr}-00003`,
      id_santri: getRandom(santriData).id_santri,
      id_pelanggaran_remisi: m3.id_pelanggaran_remisi,
      id_lokasi: getRandom(lokasiData).id_lokasi,
      tanggal_kejadian: new Date(),
      skor_master_snapshot: 30,
      skor_diberikan: 30,
      alasan_penyesuaian_skor: null,
      kronologi: 'Berkelahi dengan santri lain di lingkungan asrama.',
      punishment_detail: 'Pemanggilan orang tua dan SP 1.',
      foto_bukti: null,
      level_sp: 'SP1',
      nomor_surat_sp: '001/SP1/BK/2026',
      foto_dokumen_sp: '/uploads/sp/sp1_001.pdf',
      status_progress: 'Selesai',
      id_petugas_pelapor: getRandom(pegawaiData).id_pegawai,
      id_petugas_penanggung_jawab: getRandom(pegawaiData).id_pegawai,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // ==============================================================================
    // SKENARIO 4: Penyesuaian Skor / Keringanan (Status: Selesai)
    // ==============================================================================
    const m4 = getRandom(masterData);
    payloads.push({
      id_kasus: uuidv4(),
      nomor_kasus: `KS-${todayStr}-00004`,
      id_santri: getRandom(santriData).id_santri,
      id_pelanggaran_remisi: m4.id_pelanggaran_remisi,
      id_lokasi: getRandom(lokasiData).id_lokasi,
      tanggal_kejadian: new Date(),
      skor_master_snapshot: 20,
      skor_diberikan: 10, // Skor diturunkan dari 20 jadi 10
      alasan_penyesuaian_skor: 'Santri sangat kooperatif, jujur mengakui kesalahan, dan berjanji tidak mengulangi.',
      kronologi: 'Meninggalkan asrama tanpa izin untuk membeli makan di depan gerbang.',
      punishment_detail: 'Membersihkan aula.',
      foto_bukti: null,
      level_sp: null,
      nomor_surat_sp: null,
      foto_dokumen_sp: null,
      status_progress: 'Selesai',
      id_petugas_pelapor: getRandom(pegawaiData).id_pegawai,
      id_petugas_penanggung_jawab: getRandom(pegawaiData).id_pegawai,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // ==============================================================================
    // SKENARIO 5: Batal / Salah Input (Status: Batal)
    // ==============================================================================
    const m5 = getRandom(masterData);
    payloads.push({
      id_kasus: uuidv4(),
      nomor_kasus: `KS-${todayStr}-00005`,
      id_santri: getRandom(santriData).id_santri,
      id_pelanggaran_remisi: m5.id_pelanggaran_remisi,
      id_lokasi: getRandom(lokasiData).id_lokasi,
      tanggal_kejadian: new Date(),
      skor_master_snapshot: 15,
      skor_diberikan: 0, // Dibatalkan
      alasan_penyesuaian_skor: 'Salah identifikasi santri. Pelaku sebenarnya bukan santri ini.',
      kronologi: 'Dilaporkan merusak fasilitas.',
      punishment_detail: null,
      foto_bukti: null,
      level_sp: null,
      nomor_surat_sp: null,
      foto_dokumen_sp: null,
      status_progress: 'Batal',
      id_petugas_pelapor: getRandom(pegawaiData).id_pegawai,
      id_petugas_penanggung_jawab: getRandom(pegawaiData).id_pegawai,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // ==============================================================================
    // SKENARIO 6: Pelanggaran Fatal + SP3 (Status: Selesai)
    // ==============================================================================
    const m6 = getRandom(masterData);
    payloads.push({
      id_kasus: uuidv4(),
      nomor_kasus: `KS-${todayStr}-00006`,
      id_santri: getRandom(santriData).id_santri,
      id_pelanggaran_remisi: m6.id_pelanggaran_remisi,
      id_lokasi: getRandom(lokasiData).id_lokasi,
      tanggal_kejadian: new Date(),
      skor_master_snapshot: 100,
      skor_diberikan: 100,
      alasan_penyesuaian_skor: null,
      kronologi: 'Melakukan pencurian barang elektronik berharga milik santri lain.',
      punishment_detail: 'Dikeluarkan / Dikembalikan ke orang tua (Drop Out).',
      foto_bukti: '/uploads/bukti/cctv_rekaman.jpg',
      level_sp: 'SP3',
      nomor_surat_sp: '001/SP3/BK/2026',
      foto_dokumen_sp: '/uploads/sp/sp3_001.pdf',
      status_progress: 'Selesai',
      id_petugas_pelapor: getRandom(pegawaiData).id_pegawai,
      id_petugas_penanggung_jawab: getRandom(pegawaiData).id_pegawai,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // ==============================================================================
    // SKENARIO 7: Remisi / Penghargaan (Skor Minus/Positif Menguntungkan) (Status: Selesai)
    // ==============================================================================
    const m7 = getRandom(masterData);
    payloads.push({
      id_kasus: uuidv4(),
      nomor_kasus: `KS-${todayStr}-00007`,
      id_santri: getRandom(santriData).id_santri,
      id_pelanggaran_remisi: m7.id_pelanggaran_remisi, // Asumsi master ID ini adalah remisi
      id_lokasi: getRandom(lokasiData).id_lokasi,
      tanggal_kejadian: new Date(),
      skor_master_snapshot: -15, // Minus artinya memotong pelanggaran (atau penambahan poin baik)
      skor_diberikan: -15,
      alasan_penyesuaian_skor: null,
      kronologi: 'Berhasil menjuarai MTQ Tingkat Nasional membawa nama baik pesantren.',
      punishment_detail: 'Diberikan piagam dan pengurangan skor pelanggaran sebelumnya.',
      foto_bukti: '/uploads/bukti/sertifikat_mtq.jpg',
      level_sp: null,
      nomor_surat_sp: null,
      foto_dokumen_sp: null,
      status_progress: 'Selesai',
      id_petugas_pelapor: getRandom(pegawaiData).id_pegawai,
      id_petugas_penanggung_jawab: getRandom(pegawaiData).id_pegawai,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // ==============================================================================
    // SKENARIO 8: Backdate / Input Susulan Kejadian Masa Lalu + SP2
    // ==============================================================================
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 45); // Mundur 45 hari

    const m8 = getRandom(masterData);
    payloads.push({
      id_kasus: uuidv4(),
      nomor_kasus: `KS-${todayStr}-00008`,
      id_santri: getRandom(santriData).id_santri,
      id_pelanggaran_remisi: m8.id_pelanggaran_remisi,
      id_lokasi: getRandom(lokasiData).id_lokasi,
      tanggal_kejadian: pastDate, // Kejadian lama
      skor_master_snapshot: 50,
      skor_diberikan: 50,
      alasan_penyesuaian_skor: null,
      kronologi: 'Ketahuan melompat pagar asrama saat malam hari (Laporan susulan keamanan).',
      punishment_detail: 'Pembinaan khusus dan Surat Peringatan 2.',
      foto_bukti: null,
      level_sp: 'SP2',
      nomor_surat_sp: '045/SP2/BK/2026',
      foto_dokumen_sp: null, // Fisik belum discan
      status_progress: 'Selesai',
      id_petugas_pelapor: getRandom(pegawaiData).id_pegawai,
      id_petugas_penanggung_jawab: getRandom(pegawaiData).id_pegawai,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // ==============================================================================
    // SKENARIO 9: Penambahan Skor Bawaan karena Mengulang Kesalahan
    // ==============================================================================
    const m9 = getRandom(masterData);
    payloads.push({
      id_kasus: uuidv4(),
      nomor_kasus: `KS-${todayStr}-00009`,
      id_santri: getRandom(santriData).id_santri,
      id_pelanggaran_remisi: m9.id_pelanggaran_remisi,
      id_lokasi: getRandom(lokasiData).id_lokasi,
      tanggal_kejadian: new Date(),
      skor_master_snapshot: 10,
      skor_diberikan: 20, // Skor dinaikkan dari 10 ke 20
      alasan_penyesuaian_skor: 'Pengulangan kesalahan ke-3 kali di minggu yang sama, skor digandakan.',
      kronologi: 'Tidak mengikuti piket kamar.',
      punishment_detail: 'Membersihkan seluruh lantai asrama sendirian.',
      foto_bukti: null,
      level_sp: null,
      nomor_surat_sp: null,
      foto_dokumen_sp: null,
      status_progress: 'Proses', // Sedang dalam masa hukuman
      id_petugas_pelapor: getRandom(pegawaiData).id_pegawai,
      id_petugas_penanggung_jawab: getRandom(pegawaiData).id_pegawai,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // ==============================================================================
    // SKENARIO 10: Kasus Masih Dalam Investigasi (Tanpa Penanggung Jawab)
    // ==============================================================================
    const m10 = getRandom(masterData);
    payloads.push({
      id_kasus: uuidv4(),
      nomor_kasus: `KS-${todayStr}-00010`,
      id_santri: getRandom(santriData).id_santri,
      id_pelanggaran_remisi: m10.id_pelanggaran_remisi,
      id_lokasi: getRandom(lokasiData).id_lokasi,
      tanggal_kejadian: new Date(),
      skor_master_snapshot: m10.skor || 25,
      skor_diberikan: m10.skor || 25,
      alasan_penyesuaian_skor: null,
      kronologi: 'Ditemukan indikasi merokok di area gudang, namun santri masih dimintai keterangan lanjut.',
      punishment_detail: null,
      foto_bukti: '/uploads/bukti/puntung_rokok.jpg',
      level_sp: null,
      nomor_surat_sp: null,
      foto_dokumen_sp: null,
      status_progress: 'Proses',
      id_petugas_pelapor: getRandom(pegawaiData).id_pegawai,
      id_petugas_penanggung_jawab: null, // Belum ditentukan pengurus / BK yang bertanggung jawab
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Eksekusi Bulk Insert
    await queryInterface.bulkInsert('kasus_pelanggaran_santri', payloads);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Hapus seluruh data di tabel ini saat rollback
    await queryInterface.bulkDelete('kasus_pelanggaran_santri', {}, {});
  },
};