'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class JenisJamPelajaran extends Model {
  public id_jenisjam!: string;
  public nama_jenis_jam!: string;
  public lembaga_type!: string;
  public nomor_urut!: number;
  public keterangan!: string;
  public status!: string;
}

export function initJenisJamPelajaran(sequelize: Sequelize) {
  JenisJamPelajaran.init(
    {
      id_jenisjam: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      nama_jenis_jam: {
        type: DataTypes.STRING(100),
        unique: true,
      },
      lembaga_type: {
        type: DataTypes.STRING(25),
      },
      nomor_urut: {
        type: DataTypes.INTEGER,
      },
      keterangan: {
        type: DataTypes.TEXT,
      },
      status: {
        type: DataTypes.STRING(10),
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
      modelName: 'JenisJamPelajaran',
      tableName: 'jenis_jam_pelajaran',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  JenisJamPelajaran.beforeCreate((row) => {
    row?.setDataValue('id_jenisjam', uuidv4());
  });

  return JenisJamPelajaran;
}

export function associateJenisJamPelajaran() {}

export default JenisJamPelajaran;
