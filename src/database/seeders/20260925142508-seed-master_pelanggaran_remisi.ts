'use strict';

import { QueryInterface } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface: QueryInterface) {
    return queryInterface.bulkInsert('master_pelanggaran_remisi', [
      // Example Data: Pelanggaran
      {
        id_pelanggaran_remisi: uuidv4(),
        kode_pelanggaran: 'PL001',
        nama_pelanggaran: 'Terlambat Mengikuti Sholat Berjamaah',
        jenis: 'Pelanggaran',
        kategori: 'Ringan',
        skor: 5,
        keterangan: 'Terlambat masuk saf setelah iqamah berkumandang',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      {
        id_pelanggaran_remisi: uuidv4(),
        kode_pelanggaran: 'PL002',
        nama_pelanggaran: 'Keluar Area Tanpa Izin',
        jenis: 'Pelanggaran',
        kategori: 'Berat',
        skor: 25,
        keterangan: 'Meninggalkan lingkungan tanpa surat perizinan sah',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      // Example Data: Remisi
      {
        id_pelanggaran_remisi: uuidv4(),
        kode_pelanggaran: 'RM001',
        nama_pelanggaran: 'Hafal 1 Juz Al-Qur\'an',
        jenis: 'Remisi',
        kategori: null,
        skor: -10,
        keterangan: 'Pengurangan poin atas pencapaian hafalan Al-Qur\'an',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      {
        id_pelanggaran_remisi: uuidv4(),
        kode_pelanggaran: 'RM002',
        nama_pelanggaran: 'Juara Perlombaan Akademik',
        jenis: 'Remisi',
        kategori: null,
        skor: -15,
        keterangan: 'Pengurangan poin atas prestasi tingkat daerah/nasional',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ]);
  },

  async down(queryInterface: QueryInterface) {
    return queryInterface.bulkDelete('master_pelanggaran_remisi', {}, {});
  },
};