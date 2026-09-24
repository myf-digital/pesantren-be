'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    const tableDesc: any = await queryInterface.describeTable(
      'jurnal_kelas'
    );

    if (!tableDesc.id_jadwal) {
      await queryInterface.addColumn(
        'jurnal_kelas',
        'id_jadwal',
        {
          type: DataTypes.STRING,
          allowNull: true,
          references: {
            model: 'jadwal_pelajaran',
            key: 'id_jadwal',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        { transaction }
      );
    }
  });
};

export const down = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    const tableDesc: any = await queryInterface.describeTable(
      'jurnal_kelas'
    );

    if (tableDesc.id_jadwal) {
      await queryInterface.removeColumn(
        'jurnal_kelas',
        'id_jadwal',
        {
          transaction,
        }
      );
    }
  });
};
