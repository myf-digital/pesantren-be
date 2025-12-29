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
  await queryInterface.addIndex('kelompok_pelajaran', ['parent_id'], {
    name: 'idx_kelompok_pelajaran_parent_id',
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.removeIndex(
    'kelompok_pelajaran',
    'idx_kelompok_pelajaran_parent_id'
  );
  await queryInterface.removeColumn('kelompok_pelajaran', 'parent_id');
};
