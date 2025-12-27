'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.changeColumn('tahun_ajaran', 'keterangan', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await queryInterface.changeColumn('tahun_ajaran', 'status', {
    type: DataTypes.ENUM('Aktif', 'Nonaktif', 'Arsip'),
    allowNull: true,
  });

  await queryInterface.addColumn('tahun_ajaran', 'created_at', {
    allowNull: true,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  });

  await queryInterface.addColumn('tahun_ajaran', 'updated_at', {
    allowNull: true,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.removeColumn('tahun_ajaran', 'created_at');
  await queryInterface.removeColumn('tahun_ajaran', 'updated_at');

  await queryInterface.changeColumn('tahun_ajaran', 'keterangan', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  await queryInterface.changeColumn('tahun_ajaran', 'status', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  try {
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_tahun_ajaran_status";'
    );
  } catch (e) {}
};
