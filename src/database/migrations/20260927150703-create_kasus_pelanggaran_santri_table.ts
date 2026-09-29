'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('kasus_pelanggaran_santri', {
    id_kasus: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    nomor_kasus: {
      type: DataTypes.STRING(30),
      unique: true,
      allowNull: false,
    },
    id_santri: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'santri', 
        key: 'id_santri'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    id_pelanggaran_remisi: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'master_pelanggaran_remisi',
        key: 'id_pelanggaran_remisi'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    id_lokasi: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'lokasi', 
        key: 'id_lokasi'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    tanggal_kejadian: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    skor_master_snapshot: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    skor_diberikan: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    alasan_penyesuaian_skor: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    kronologi: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    punishment_detail: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    foto_bukti: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    level_sp: {
      type: DataTypes.ENUM('SP1', 'SP2', 'SP3'),
      allowNull: true,
    },
    nomor_surat_sp: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    foto_dokumen_sp: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status_progress: {
      type: DataTypes.ENUM('Proses', 'Selesai', 'Batal'),
      allowNull: false,
      defaultValue: 'Proses',
    },
    id_petugas_pelapor: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'pegawai',
        key: 'id_pegawai'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    id_petugas_penanggung_jawab: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'pegawai',
        key: 'id_pegawai'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('kasus_pelanggaran_santri');
};