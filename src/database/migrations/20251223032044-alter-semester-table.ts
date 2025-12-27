'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.changeColumn('semester', 'nomor_urut', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await queryInterface.addColumn('semester', 'archived_by', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  await queryInterface.addColumn('semester', 'archived_at', {
    allowNull: true,
    type: DataTypes.DATE,
  });

  await queryInterface.addConstraint('semester', {
    fields: ['nama_semester', 'id_tahunajaran'],
    type: 'unique',
    name: 'unique_nama_semester_id_tahunajaran',
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.changeColumn('semester', 'nomor_urut', {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: true,
  });

  await queryInterface.removeColumn('semester', 'archived_by');
  await queryInterface.removeColumn('semester', 'archived_at');

  try {
    await queryInterface.sequelize.query(
      'DROP CONSTRAINT IF EXISTS "unique_nama_semester_id_tahunajaran";'
    );
  } catch (e) {}
};
