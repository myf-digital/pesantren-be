'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('jenis_penilaian', {
    id_penilaian: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      unique: true,
    },
    singkatan: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    jenis_pengujian: {
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
    ALTER TABLE jenis_penilaian
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('jenis_penilaian');
};
