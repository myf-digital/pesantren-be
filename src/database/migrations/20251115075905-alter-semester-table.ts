'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.changeColumn('semester', 'keterangan', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await queryInterface.changeColumn('semester', 'status', {
    type: DataTypes.ENUM('Aktif', 'Nonaktif', 'Arsip'),
    allowNull: true,
  });

  await queryInterface.addColumn('semester', 'created_at', {
    allowNull: true,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  });

  await queryInterface.addColumn('semester', 'updated_at', {
    allowNull: true,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.removeColumn('semester', 'created_at');
  await queryInterface.removeColumn('semester', 'updated_at');

  await queryInterface.changeColumn('semester', 'keterangan', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  await queryInterface.changeColumn('semester', 'status', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  try {
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_semester_status";'
    );
  } catch (e) {}
};
