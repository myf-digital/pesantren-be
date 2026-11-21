'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // 1. Buat tabel di dalam transaksi
    await queryInterface.createTable(
      'notifications',
      {
        id_notification: {
          type: DataTypes.STRING,
          primaryKey: true,
          allowNull: false,
          unique: true,
        },
        from: {
          type: DataTypes.STRING,
          allowNull: true,
          references: {
            model: 'app_resource',
            key: 'resource_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        to: {
          type: DataTypes.STRING,
          allowNull: true,
          references: {
            model: 'app_resource',
            key: 'resource_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        title: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        url: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.SMALLINT,
          allowNull: true,
          defaultValue: 0,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: DataTypes.NOW,
        },
      },
      { transaction }
    );
  });
};

export const down = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // 1. Hapus tabel
    await queryInterface.dropTable('notifications', { transaction });

    // Note: Drop table secara otomatis menghapus constraint yang menempel padanya
  });
};
