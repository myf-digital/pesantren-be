'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('master_pelanggaran_remisi', {
    id_pelanggaran_remisi: {
      type: DataTypes.STRING,
      primaryKey: true,
      unique: true,
      allowNull: false,
    },
    kode_pelanggaran: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    nama_pelanggaran: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    jenis: {
      type: DataTypes.ENUM('Pelanggaran', 'Remisi'),
      allowNull: false,
    },
    kategori: {
      type: DataTypes.ENUM('Ringan', 'Sedang', 'Berat', 'Sangat Berat'),
      allowNull: true,
    },
    skor: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: new Date(),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: new Date(),
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('master_pelanggaran_remisi');
};