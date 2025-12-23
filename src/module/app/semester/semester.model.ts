'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';

export class Semester extends Model {
  public id_semester!: string;
  public id_tahunajaran!: string;
  public nama_semester!: string;
  public nomor_urut!: number;
  public keterangan!: string;
  public status!: string;
}

export function initSemester(sequelize: Sequelize) {
  Semester.init(
    {
      id_semester: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      id_tahunajaran: {
        type: DataTypes.STRING,
      },
      nama_semester: {
        type: DataTypes.STRING(255),
      },
      nomor_urut: {
        type: DataTypes.INTEGER,
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
      modelName: 'Semester',
      tableName: 'semester',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  Semester.beforeCreate((row) => {
    row?.setDataValue('id_semester', uuidv4());
  });

  return Semester;
}

export function associateSemester() {
  Semester.belongsTo(TahunAjaran, {
    as: 'tahun_ajaran',
    foreignKey: 'id_tahunajaran',
  });
}

export default Semester;
