'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.createTable('guru_mapel', {
    id_gmapel: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
    },
    id_guru: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'pegawai',
        key: 'id_pegawai',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    id_lembaga: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'lembaga_pendidikan_formal',
        key: 'id_lembaga',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
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
    id_mapel: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'mata_pelajaran',
        key: 'mapel',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    nama_kelas: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    nomor_urut: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    keterangan: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Aktif', 'Nonaktif', 'Arsip'),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    archived_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    archived_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  await queryInterface.addConstraint('guru_mapel', {
    fields: ['id_lembaga', 'id_tahunajaran', 'nama_kelas'],
    type: 'unique',
    name: 'unique_guru_mapel_id_lembaga_id_tahunajaran_nama_kelas',
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('guru_mapel');
  try {
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_guru_mapel_status";'
    );
  } catch (e) {}
  try {
    await queryInterface.sequelize.query(
      'DROP CONSTRAINT IF EXISTS "unique_guru_mapel_id_lembaga_id_tahunajaran_nama_kelas";'
    );
  } catch (e) {}
};
