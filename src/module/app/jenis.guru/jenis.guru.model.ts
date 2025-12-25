'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class JenisGuru extends Model {
  public id_jenisguru!: string;
  public nama_jenis_guru!: string;
  public nomor_urut!: number;
  public keterangan!: string;
  public status!: string;
}

export function initJenisGuru(sequelize: Sequelize) {
  JenisGuru.init(
    {
      id_jenisguru: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      nama_jenis_guru: {
        type: DataTypes.STRING(255),
        unique: true,
      },
      nomor_urut: {
        type: DataTypes.INTEGER,
      },
      keterangan: {
        type: DataTypes.STRING(255),
      },
      status: {
        type: DataTypes.STRING(255),
        defaultValue: 'A',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: 'JenisGuru',
      tableName: 'jenis_guru',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  JenisGuru.beforeCreate((row) => {
    row?.setDataValue('id_jenisguru', uuidv4());
  });

  return JenisGuru;
}

export function associateJenisGuru() {}

export default JenisGuru;
