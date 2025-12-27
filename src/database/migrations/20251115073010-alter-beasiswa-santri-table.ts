'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.renameTable('beasiswa_santri', 'jenis_beasiswa');

  await queryInterface.renameColumn(
    'jenis_beasiswa',
    'id_beasiswasantri',
    'id_beasiswa'
  );

  await queryInterface.changeColumn('jenis_beasiswa', 'keterangan', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await queryInterface.changeColumn('jenis_beasiswa', 'status', {
    type: DataTypes.ENUM('Aktif', 'Nonaktif'),
    allowNull: true,
  });

  await queryInterface.addColumn('jenis_beasiswa', 'created_at', {
    allowNull: true,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  });

  await queryInterface.addColumn('jenis_beasiswa', 'updated_at', {
    allowNull: true,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.removeColumn('jenis_beasiswa', 'created_at');
  await queryInterface.removeColumn('jenis_beasiswa', 'updated_at');

  await queryInterface.changeColumn('jenis_beasiswa', 'keterangan', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  await queryInterface.changeColumn('jenis_beasiswa', 'status', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  await queryInterface.renameColumn(
    'jenis_beasiswa',
    'id_beasiswa',
    'id_beasiswasantri'
  );

  await queryInterface.renameTable('jenis_beasiswa', 'beasiswa_santri');

  try {
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_jenis_beasiswa_status";'
    );
  } catch (e) {}
};
