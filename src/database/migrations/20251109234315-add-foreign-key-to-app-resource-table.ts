'use strict';

import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  const addConstraintSafe = async (
    table: string,
    options: Parameters<QueryInterface['addConstraint']>[1]
  ) => {
    try {
      await queryInterface.addConstraint(table, options);
    } catch (error: any) {
      const code = error?.original?.code;
      const message = String(error?.message || '');
      if (code !== '42710' && !message.includes('already exists')) {
        throw error;
      }
    }
  };

  await addConstraintSafe('app_resource', {
    fields: ['role_id'],
    type: 'foreign key',
    name: 'fk_app_resource_role_id',
    references: {
      table: 'app_role',
      field: 'role_id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
  await addConstraintSafe('app_resource', {
    fields: ['area_province_id'],
    type: 'foreign key',
    name: 'fk_app_resource_area_province_id',
    references: {
      table: 'area_provinces',
      field: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
  await addConstraintSafe('app_resource', {
    fields: ['area_regencies_id'],
    type: 'foreign key',
    name: 'fk_app_resource_area_regencies_id',
    references: {
      table: 'area_regencies',
      field: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.removeConstraint(
    'app_resource',
    'fk_app_resource_role_id'
  );
  await queryInterface.removeConstraint(
    'app_resource',
    'fk_app_resource_area_province_id'
  );
  await queryInterface.removeConstraint(
    'app_resource',
    'fk_app_resource_area_regencies_id'
  );
};
