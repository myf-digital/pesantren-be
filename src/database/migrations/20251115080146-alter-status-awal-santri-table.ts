'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.renameColumn(
    'status_awal_santri',
    'id_statawalsantri',
    'id_status_awal_santri'
  );
  await queryInterface.renameColumn(
    'status_awal_santri',
    'kode_statawal',
    'kode_status_awal'
  );
  await queryInterface.renameColumn(
    'status_awal_santri',
    'nama_statawal',
    'nama_status_awal'
  );

  await queryInterface.changeColumn('status_awal_santri', 'keterangan', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await queryInterface.changeColumn('status_awal_santri', 'status', {
    type: DataTypes.ENUM('Aktif', 'Nonaktif'),
    allowNull: true,
  });

  await queryInterface.addColumn('status_awal_santri', 'created_at', {
    allowNull: true,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  });

  await queryInterface.addColumn('status_awal_santri', 'updated_at', {
    allowNull: true,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.removeColumn('status_awal_santri', 'created_at');
  await queryInterface.removeColumn('status_awal_santri', 'updated_at');

  await queryInterface.changeColumn('status_awal_santri', 'keterangan', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  await queryInterface.changeColumn('status_awal_santri', 'status', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  await queryInterface.renameColumn(
    'status_awal_santri',
    'id_status_awal_santri',
    'id_statawalsantri'
  );
  await queryInterface.renameColumn(
    'status_awal_santri',
    'kode_status_awal',
    'kode_statawal'
  );
  await queryInterface.renameColumn(
    'status_awal_santri',
    'nama_status_awal',
    'nama_statawal'
  );

  try {
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_status_awal_santri_status";'
    );
  } catch (e) {}
};
