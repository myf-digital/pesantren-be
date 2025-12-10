'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('orgunit', {
    id_orgunit: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      unique: true
    },
    nama_orgunit: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    parent_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'orgunit', // self-referential (parent-child)
        key: 'id_orgunit',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    level_orgunit: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    id_lembaga: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'lembaga_pendidikan_formal',
        key: 'id_lembaga',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    jenis_orgunit: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    keterangan: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  });

  // Tambahkan kolom created_at dan updated_at via raw SQL
  await queryInterface.sequelize.query(`
    ALTER TABLE orgunit
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('orgunit');
};
