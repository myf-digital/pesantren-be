'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class KelompokPelajaran extends Model {
  public id_kelpelajaran!: string;
  public tahun_ajaran!: string;
  public nomor_urut!: number;
  public keterangan!: string;
  public status!: string;
}

export function initKelompokPelajaran(sequelize: Sequelize) {
  KelompokPelajaran.init(
    {
      id_kelpelajaran: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      nama_kelpelajaran: {
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
      parent_id: {
        type: DataTypes.STRING,
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
      modelName: 'KelompokPelajaran',
      tableName: 'kelompok_pelajaran',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  KelompokPelajaran.beforeCreate((row) => {
    row?.setDataValue('id_kelpelajaran', uuidv4());
  });

  return KelompokPelajaran;
}

export function associateKelompokPelajaran() {
  KelompokPelajaran.belongsTo(KelompokPelajaran, { as: 'parent', foreignKey: 'parent_id', targetKey: 'id_kelpelajaran' });
  KelompokPelajaran.hasMany(KelompokPelajaran, {
    as: 'children',
    foreignKey: 'parent_id',
    sourceKey: 'id_kelpelajaran',
  });
}

export default KelompokPelajaran;
