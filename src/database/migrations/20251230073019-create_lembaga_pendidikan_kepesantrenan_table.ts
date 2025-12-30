'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('lembaga_pendidikan_kepesantrenan', {
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
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  });

  // Tambahkan kolom created_at & updated_at via raw SQL
  await queryInterface.sequelize.query(`
    ALTER TABLE lembaga_pendidikan_kepesantrenan
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('lembaga_pendidikan_kepesantrenan');
};
