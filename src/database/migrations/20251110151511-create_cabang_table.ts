'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('cabang', {
    id_cabang: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    nama_cabang: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    nomor_urut: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    keterangan: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    alamat: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  });

  await queryInterface.sequelize.query(`
    ALTER TABLE cabang 
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('cabang');
};
