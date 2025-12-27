'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.changeColumn('tingkat', 'tingkat', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  await queryInterface.addColumn('tingkat', 'tingkat_type', {
    allowNull: true,
    type: DataTypes.ENUM('FORMAL', 'PESANTREN'),
  });

  await queryInterface.addConstraint('tingkat', {
    fields: ['tingkat', 'tingkat_type'],
    type: 'unique',
    name: 'unique_tingkat_tingkat_type',
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.changeColumn('tingkat', 'tingkat', {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  });

  try {
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_tingkat_tingkat_type";'
    );
  } catch (e) {}

  try {
    await queryInterface.sequelize.query(
      'DROP CONSTRAINT IF EXISTS "unique_tingkat_tingkat_type";'
    );
  } catch (e) {}
};
