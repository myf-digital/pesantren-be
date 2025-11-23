'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('inventaris_aset_harian', {
    id_laporan: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    id_aset: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'inventaris_umum',
        key: 'id_aset',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
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
    id_kamar: {
      type: DataTypes.STRING,
      allowNull: false,
      // references: {
      //   model: 'kamar',
      //   key: 'id_kamar',
      // },
      // onUpdate: 'CASCADE',
      // onDelete: 'SET NULL',
    },
    id_biro_aset: {
      type: DataTypes.STRING,
      allowNull: false,
      // references: {
      //   model: 'pegawai',
      //   key: 'id_pegawai',
      // },
      // onUpdate: 'CASCADE',
      // onDelete: 'SET NULL',
    },
    id_rumah_tangga: {
      type: DataTypes.STRING,
      allowNull: false,
      // references: {
      //   model: 'pegawai',
      //   key: 'id_pegawai',
      // },
      // onUpdate: 'CASCADE',
      // onDelete: 'SET NULL',
    },
    tanggal: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    kondisi: {
      type: DataTypes.ENUM('Baik', 'Kurang Baik', 'Rusak', 'Hilang'),
      allowNull: true,
    },
    foto_dokumentasi: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status_progres: {
      type: DataTypes.ENUM('Normal', 'Menunggu Approval', 'Perbaikan', 'Penggantian', 'Selesai'),
      allowNull: true,
    },
    catatan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    jenis_input: {
      type: DataTypes.ENUM('Laporan Kondisi', 'Inventaris Baru'),
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
  await queryInterface.dropTable('inventaris_aset_harian');
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_inventaris_aset_harian_kondisi";'
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_inventaris_aset_harian_status_progres";'
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_inventaris_aset_harian_jenis_input";'
  );
};
