'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('kamar', {
    id_kamar: {
      type: DataTypes.STRING,
      primaryKey: true,
      unique: true,
    },
    id_asrama: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'asrama',
        key: 'id_asrama',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    nama_kamar: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lantai: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    kapasitas: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_wali_asuh: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'pegawai',
        key: 'id_pegawai',
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
    ALTER TABLE kamar
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('kamar');
};
