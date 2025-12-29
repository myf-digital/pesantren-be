'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import Semester from '../semester/semester.model';

export class TahunAjaran extends Model {
  public id_tahunajaran!: string;
  public tahun_ajaran!: string;
  public nomor_urut!: number;
  public keterangan!: string;
  public status!: string;
}

export function initTahunAjaran(sequelize: Sequelize) {
  TahunAjaran.init(
    {
      id_tahunajaran: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      tahun_ajaran: {
        type: DataTypes.STRING(255),
        unique: true,
      },
      nomor_urut: {
        type: DataTypes.INTEGER,
        unique: true,
      },
      keterangan: {
        type: DataTypes.TEXT,
      },
      status: {
        type: DataTypes.ENUM('Aktif', 'Nonaktif', 'Arsip'),
      },
      archived_at: {
        type: DataTypes.DATE,
      },
      archived_by: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      modelName: 'TahunAjaran',
      tableName: 'tahun_ajaran',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  TahunAjaran.beforeCreate((row) => {
    row?.setDataValue('id_tahunajaran', uuidv4());
  });

  return TahunAjaran;
}

export function associateTahunAjaran() {
  TahunAjaran.hasMany(Semester, {
    as: 'semesters',
    foreignKey: 'id_tahunajaran',
  });
}

export default TahunAjaran;
