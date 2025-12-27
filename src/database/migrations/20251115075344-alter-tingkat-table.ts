'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.changeColumn('tingkat', 'keterangan', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await queryInterface.addColumn('tingkat', 'created_at', {
    allowNull: true,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  });

  await queryInterface.addColumn('tingkat', 'updated_at', {
    allowNull: true,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.removeColumn('tingkat', 'created_at');
  await queryInterface.removeColumn('tingkat', 'updated_at');

  await queryInterface.changeColumn('tingkat', 'keterangan', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });
};
