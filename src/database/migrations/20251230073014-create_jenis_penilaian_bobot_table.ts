'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('jenis_penilaian_bobot', {
    id_bobot: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      unique: true,
    },
    id_penilaian: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'jenis_penilaian',
        key: 'id_penilaian',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    lembaga_type: {
      type: DataTypes.ENUM('FORMAL', 'PESANTREN'),
      allowNull: false,
    },
    id_lembaga: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    id_tingkat: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'tingkat',
        key: 'id_tingkat',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    id_tahunajaran: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'tahun_ajaran',
        key: 'id_tahunajaran',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    bobot: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Aktif', 'Nonaktif'),
      allowNull: false,
    },
  });

  // Tambahkan kolom created_at dan updated_at via raw SQL
  await queryInterface.sequelize.query(`
    ALTER TABLE jenis_penilaian_bobot
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('jenis_penilaian_bobot');
};
