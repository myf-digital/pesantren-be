'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.addColumn('kelompok_pelajaran', 'parent_id', {
    type: DataTypes.STRING,
    allowNull: true,
      references: {
      model: 'kelompok_pelajaran',
      key: 'id_kelpelajaran',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.removeColumn('kelompok_pelajaran', 'parent_id');
};
