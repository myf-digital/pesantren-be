'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.changeColumn('tahun_angkatan', 'keterangan', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await queryInterface.addColumn('tahun_angkatan', 'created_at', {
    allowNull: true,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  });

  await queryInterface.addColumn('tahun_angkatan', 'updated_at', {
    allowNull: true,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.removeColumn('tahun_angkatan', 'created_at');
  await queryInterface.removeColumn('tahun_angkatan', 'updated_at');

  await queryInterface.changeColumn('tahun_angkatan', 'keterangan', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });
};
