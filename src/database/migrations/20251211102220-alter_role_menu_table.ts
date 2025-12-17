'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
   await queryInterface.addColumn('app_role_menu', 'import', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await queryInterface.addColumn('app_role_menu', 'export', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.removeColumn('app_role_menu', 'import');
  await queryInterface.removeColumn('app_role_menu', 'export');
};
