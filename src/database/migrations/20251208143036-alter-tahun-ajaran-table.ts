'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
   await queryInterface.addColumn('tahun_ajaran', 'archived_by', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  await queryInterface.addColumn('tahun_ajaran', 'archived_at', {
    allowNull: true,
    type: DataTypes.DATE
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.removeColumn('tahun_ajaran', 'archived_by');
  await queryInterface.removeColumn('tahun_ajaran', 'archived_at');
};