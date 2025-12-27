'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('asrama', {
    id_asrama: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      unique: true,
    },
    nama_asrama: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    jumlah_kamar: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_cabang: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'cabang', // self-referential (parent-child)
        key: 'id_cabang',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    keterangan: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  });

  // Tambahkan kolom created_at dan updated_at via raw SQL
  await queryInterface.sequelize.query(`
    ALTER TABLE asrama
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('asrama');
};
