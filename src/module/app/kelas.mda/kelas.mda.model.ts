'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import LembagaPendidikanKepesantrenan from '../lembaga.pendidikan.kepesantrenan/lembaga.pendidikan.kepesantrenan.model';
import Pegawai from '../pegawai/pegawai.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';
import Tingkat from '../tingkat/tingkat.model';

export class KelasMda extends Model {
  public id_kelas_mda!: string;
  public nama_kelas_mda!: string;
  public nomor_urut!: number;
  public keterangan!: string;
  public status!: string;
  public id_lembaga!: string;
  public id_tahunajaran!: string;
}

export function initKelasMda(sequelize: Sequelize) {
  KelasMda.init(
    {
      id_kelas_mda: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      nama_kelas_mda: {
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
      modelName: 'KelasMda',
      tableName: 'kelas_mda',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  KelasMda.beforeCreate((row) => {
    row?.setDataValue('id_kelas_mda', uuidv4());
  });

  return KelasMda;
}

export function associateKelasMda() {
  KelasMda.belongsTo(LembagaPendidikanKepesantrenan, {
    as: 'lembaga',
    foreignKey: 'id_lembaga',
  });

  KelasMda.belongsTo(Tingkat, {
    as: 'tingkat',
    foreignKey: 'id_tingkat',
  });

  KelasMda.belongsTo(TahunAjaran, {
    as: 'tahun_ajaran',
    foreignKey: 'id_tahunajaran',
  });

  KelasMda.belongsTo(Pegawai, {
    as: 'pegawai',
    foreignKey: 'id_wali_kelas',
  });
}

export default KelasMda;
