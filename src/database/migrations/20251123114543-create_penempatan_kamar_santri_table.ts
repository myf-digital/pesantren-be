'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('penempatan_kamar_santri', {
    id_penempatan: {
      type: DataTypes.STRING,
      primaryKey: true,
      unique: true,
    },
    id_santri: {
      type: DataTypes.STRING,
      allowNull: true,
      // references: {
      //   model: 'santri',
      //   key: 'id_santri',
      // },
      // onUpdate: 'CASCADE',
      // onDelete: 'SET NULL',
    },
    id_asrama: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'asrama',
        key: 'id_asrama',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    id_kamar: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'kamar',
        key: 'id_kamar',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    id_tahunajaran: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'tahun_ajaran',
        key: 'id_tahunajaran',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    status: {
      type: DataTypes.ENUM('Aktif', 'Non-Aktif'),
      allowNull: true,
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  });

  // Tambahkan kolom created_at & updated_at via raw SQL
  await queryInterface.sequelize.query(`
    ALTER TABLE penempatan_kamar_santri
    ADD COLUMN tanggal_masuk DATE,
    ADD COLUMN tanggal_keluar DATE,
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('penempatan_kamar_santri');
};
