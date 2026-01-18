'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import KelompokPelajaran from '../kelompok.pelajaran/kelompok.pelajaran.model';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';

export class MataPelajaran extends Model {
  public id_mapel!: string;
  public id_kelpelajaran!: string;
  public id_lembaga!: string;
  public kode_mapel!: string;
  public nama_mapel!: string;
  public nomor_urut!: number;
  public kkm!: number | null;
  public keterangan!: string;
  public status!: string;
}

export function initMataPelajaran(sequelize: Sequelize) {
  MataPelajaran.init(
    {
      id_mapel: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      id_kelpelajaran: {
        type: DataTypes.STRING,
      },
      id_lembaga: {
        type: DataTypes.STRING,
      },
      lembaga_type: {
        type: DataTypes.STRING,
      },
      kode_mapel: {
        type: DataTypes.STRING(255),
      },
      nama_mapel: {
        type: DataTypes.STRING(255),
      },
      nomor_urut: {
        type: DataTypes.INTEGER,
      },
      kkm: {
        type: DataTypes.DECIMAL(19, 1),
        get() {
          const rawValue = this.getDataValue('kkm');
          return rawValue === null ? null : parseFloat(rawValue);
        },
      },
      keterangan: {
        type: DataTypes.STRING(255),
      },
      status: {
        type: DataTypes.STRING(255),
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
      modelName: 'MataPelajaran',
      tableName: 'mata_pelajaran',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  MataPelajaran.beforeCreate((row) => {
    row?.setDataValue('id_mapel', uuidv4());
  });

  return MataPelajaran;
}

export function associateMataPelajaran() {
  MataPelajaran.belongsTo(KelompokPelajaran, {
    as: 'kelompok_pelajaran',
    foreignKey: 'id_kelpelajaran',
  });
  MataPelajaran.belongsTo(LembagaPendidikanFormal, {
    as: 'lembaga_formal',
    foreignKey: 'id_lembaga',
  });
}

export default MataPelajaran;
