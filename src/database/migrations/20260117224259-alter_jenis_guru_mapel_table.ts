'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.addColumn('jenis_guru', 'id_guru', {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'pegawai',
      key: 'id_pegawai',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  await queryInterface.addColumn('jenis_guru', 'id_mapel', {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'mata_pelajaran',
      key: 'id_mapel',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  await queryInterface.addColumn('jenis_guru', 'id_tingkat', {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'tingkat',
      key: 'id_tingkat',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  await queryInterface.addColumn('jenis_guru', 'id_lembaga', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await queryInterface.addColumn('jenis_guru', 'lembaga_type', {
    type: DataTypes.STRING,
    allowNull: true,
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.removeColumn('jenis_guru', 'id_guru');
  await queryInterface.removeColumn('jenis_guru', 'id_mapel');
  await queryInterface.removeColumn('jenis_guru', 'id_tingkat');
  await queryInterface.removeColumn('jenis_guru', 'id_lembaga');
  await queryInterface.removeColumn('jenis_guru', 'lembaga_type');
};
