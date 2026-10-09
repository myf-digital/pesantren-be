'use strict';

import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_lokasi_jenis_lokasi ADD VALUE IF NOT EXISTS 'Lorong';
      ALTER TYPE enum_lokasi_jenis_lokasi ADD VALUE IF NOT EXISTS 'Lingkungan';
      ALTER TYPE enum_lokasi_jenis_lokasi ADD VALUE IF NOT EXISTS 'PosJaga';
    `);
  });
};

export const down = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {});
};
