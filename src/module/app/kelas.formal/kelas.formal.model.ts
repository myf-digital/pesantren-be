'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';
import Pegawai from '../pegawai/pegawai.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';
import Tingkat from '../tingkat/tingkat.model';

export class KelasFormal extends Model {
  public id_kelas!: string;
  public nama_kelas!: string;
  public nomor_urut!: number;
  public keterangan!: string;
  public status!: string;
  public id_lembaga!: string;
  public id_tahunajaran!: string;
}

export function initKelasFormal(sequelize: Sequelize) {
  KelasFormal.init(
    {
      id_kelas: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      nama_kelas: {
        type: DataTypes.STRING(255),
      },
      id_lembaga: {
        type: DataTypes.STRING,
      },
      id_tahunajaran: {
        type: DataTypes.STRING,
      },
      id_tingkat: {
        type: DataTypes.STRING,
      },
      id_wali_kelas: {
        type: DataTypes.STRING,
        allowNull: true,
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
      modelName: 'KelasFormal',
      tableName: 'kelas_formal',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  KelasFormal.beforeCreate((row) => {
    row?.setDataValue('id_kelas', uuidv4());
  });

  return KelasFormal;
}

export function associateKelasFormal() {
  KelasFormal.belongsTo(LembagaPendidikanFormal, {
    as: 'lembaga',
    foreignKey: 'id_lembaga',
  });

  KelasFormal.belongsTo(Tingkat, {
    as: 'tingkat',
    foreignKey: 'id_tingkat',
  });

  KelasFormal.belongsTo(TahunAjaran, {
    as: 'tahun_ajaran',
    foreignKey: 'id_tahunajaran',
  });

  KelasFormal.belongsTo(Pegawai, {
    as: 'pegawai',
    foreignKey: 'id_wali_kelas',
  });
}

export default KelasFormal;
