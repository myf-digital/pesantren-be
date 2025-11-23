'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('inventaris_umum', {
    id_aset: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    kode_aset: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    nama_aset: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    kategori: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    jumlah: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    kondisi: {
      type: DataTypes.ENUM('Baik', 'Kurang Baik', 'Rusak', 'Hilang'),
      allowNull: true,
    },
    lokasi: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    sumber_aset: {
      type: DataTypes.ENUM('Rumah Tangga', 'Kewaliasuhan', 'Takmir Masjid', 'Lainnya'),
      allowNull: true,
    },
    tanggal_input: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true,
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
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('inventaris_umum');
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_inventaris_umum_kondisi";'
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_inventaris_umum_sumber_aset";'
  );
};
