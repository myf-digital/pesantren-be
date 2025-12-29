'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('lembaga_pendidikan_formal', {
    id_lembaga: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      unique: true,
    },
    nama_lembaga: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    id_cabang: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'cabang',
        key: 'id_cabang',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    jenis_lembaga: {
      type: DataTypes.ENUM(
        'SD',
        'MI',
        'SMP',
        'MTs',
        'SMA',
        'MA',
        'SMK',
        'Diniyah',
        'Perguruan Tinggi'
      ),
      allowNull: true,
    },
    status_akreditasi: {
      type: DataTypes.ENUM('A', 'B', 'C', 'Belum Terakreditasi'),
      allowNull: true,
    },
    nomor_npsn: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
  });

  // Tambahkan kolom created_at & updated_at via raw SQL
  await queryInterface.sequelize.query(`
    ALTER TABLE lembaga_pendidikan_formal
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('lembaga_pendidikan_formal');
};
