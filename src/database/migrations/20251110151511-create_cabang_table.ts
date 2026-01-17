'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  const createTableSafe = async () => {
    try {
      await queryInterface.createTable('cabang', {
        id_cabang: {
          type: DataTypes.STRING,
          primaryKey: true,
          allowNull: false,
          unique: true,
        },
        nama_cabang: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
        },
        nomor_urut: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        keterangan: {
          type: DataTypes.STRING(255),
          allowNull: true,
          unique: true,
        },
        alamat: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
      });
    } catch (error: any) {
      const code = error?.original?.code;
      const message = String(error?.message || '');
      if (code !== '42P07' && !message.includes('already exists')) {
        throw error;
      }
    }
  };

  const addColumnSafe = async (column: string) => {
    try {
      await queryInterface.addColumn('cabang', column, {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: true,
      });
    } catch (error: any) {
      const code = error?.original?.code;
      const message = String(error?.message || '');
      if (code !== '42701' && !message.includes('already exists')) {
        throw error;
      }
    }
  };

  await createTableSafe();
  await addColumnSafe('created_at');
  await addColumnSafe('updated_at');
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('cabang');
};
