'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('jabatan', {
    id_jabatan: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      unique: true,
    },
    nama_jabatan: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
    level_jabatan: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    sifat_jabatan: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    kode_jabatan: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    keterangan: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  });

  // Tambahkan kolom created_at dan updated_at via raw SQL
  await queryInterface.sequelize.query(`
    ALTER TABLE jabatan
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('jabatan');
};
