'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('pegawai', {
    id_pegawai: {
      type: DataTypes.STRING,
      primaryKey: true,
      unique: true,
    },
    nik: {
      type: DataTypes.STRING(30),
      allowNull: true,
      unique: true,
    },
    nip: {
      type: DataTypes.STRING(30),
      allowNull: true,
      unique: true,
    },
    nama_lengkap: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    no_hp: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    jenis_kelamin: {
      type: DataTypes.ENUM('Laki-laki', 'Perempuan'),
      allowNull: true,
    },
    tempat_lahir: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    tanggal_lahir: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    umur: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    alamat: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pendidikan: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    bidang_ilmu: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    id_orgunit: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'orgunit',
        key: 'id_orgunit',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    id_jabatan: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'jabatan',
        key: 'id_jabatan',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    status_pegawai: {
      type: DataTypes.ENUM('Aktif', 'Tidak Aktif', 'Pensiun'),
      allowNull: true,
    },
    tmt: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    foto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  // Tambahkan kolom created_at & updated_at via raw SQL
  await queryInterface.sequelize.query(`
    ALTER TABLE pegawai
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('pegawai');
};
