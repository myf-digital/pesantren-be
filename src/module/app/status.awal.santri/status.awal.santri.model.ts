'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class StatusAwalSantri extends Model {
  public id_status_awal_santri!: string;
  public kode_status_awal!: string;
  public nama_status_awal!: string;
  public nomor_urut!: number;
  public keterangan!: string;
  public status!: string;
}

export function initStatusAwalSantri(sequelize: Sequelize) {
  StatusAwalSantri.init(
    {
      id_status_awal_santri: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      kode_status_awal: {
        type: DataTypes.STRING(255),
        unique: true,
      },
      nama_status_awal: {
        type: DataTypes.STRING(255),
      },
      keterangan: {
        type: DataTypes.TEXT,
      },
      status: {
        type: DataTypes.ENUM('Aktif', 'Nonaktif'),
      },
    },
    {
      sequelize,
      modelName: 'StatusAwalSantri',
      tableName: 'status_awal_santri',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  StatusAwalSantri.beforeCreate((row) => {
    row?.setDataValue('id_status_awal_santri', uuidv4());
  });

  return StatusAwalSantri;
}

export default StatusAwalSantri;
