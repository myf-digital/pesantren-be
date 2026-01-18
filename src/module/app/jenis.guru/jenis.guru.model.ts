'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import Pegawai from '../pegawai/pegawai.model';
import Tingkat from '../tingkat/tingkat.model';
import MataPelajaran from '../mata.pelajaran/mata.pelajaran.model';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';

export class JenisGuru extends Model {
  public id_jenisguru!: string;
  public nama_jenis_guru!: string;
  public id_guru!: string;
  public id_mapel!: string;
  public id_lembaga!: string;
  public lembaga_type!: string;
  public id_tingkat!: string;
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
      id_guru: {
        type: DataTypes.STRING,
      },
      id_mapel: {
        type: DataTypes.STRING,
      },
      id_lembaga: {
        type: DataTypes.STRING,
      },
      lembaga_type: {
        type: DataTypes.STRING,
      },
      id_tingkat: {
        type: DataTypes.STRING,
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

export function associateJenisGuru() {
  JenisGuru.belongsTo(Pegawai, {
    as: 'pegawai',
    foreignKey: 'id_guru',
    targetKey: 'id_pegawai',
  });
  JenisGuru.belongsTo(MataPelajaran, {
    as: 'mata_pelajaran',
    foreignKey: 'id_mapel',
  });
  JenisGuru.belongsTo(LembagaPendidikanFormal, {
    as: 'lembaga_formal',
    foreignKey: 'id_lembaga',
  });
  JenisGuru.belongsTo(Tingkat, {
    as: 'tingkat',
    foreignKey: 'id_tingkat',
  });
}

export default JenisGuru;
