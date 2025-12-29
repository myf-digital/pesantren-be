'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.addColumn('mata_pelajaran', 'lembaga_type', {
    type: DataTypes.ENUM('FORMAL', 'PESANTREN'),
    allowNull: true,
  });
  await queryInterface.addColumn('jenis_jam_pelajaran', 'lembaga_type', {
    type: DataTypes.ENUM('FORMAL', 'PESANTREN'),
    allowNull: true,
  });
  await queryInterface.addColumn('jam_pelajaran', 'lembaga_type', {
    type: DataTypes.ENUM('FORMAL', 'PESANTREN'),
    allowNull: true,
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.removeColumn('mata_pelajaran', 'lembaga_type');
  await queryInterface.removeColumn('jenis_jam_pelajaran', 'lembaga_type');
  await queryInterface.removeColumn('jam_pelajaran', 'lembaga_type');
};