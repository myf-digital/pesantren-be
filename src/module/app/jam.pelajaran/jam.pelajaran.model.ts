'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import JenisJamPelajaran from '../jenis.jampel/jenis.jampel.model';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';

export class JamPelajaran extends Model {
  public id_jampel!: string;
  public id_jenisjam!: string;
  public id_lembaga!: string;
  public nama_jampel!: string;
  public mulai!: string;
  public selesai!: string;
  public jumlah_jampel!: number;
  public nomor_urut!: number;
  public keterangan!: string;
  public status!: string;
}

export function initJamPelajaran(sequelize: Sequelize) {
  JamPelajaran.init(
    {
      id_jampel: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      id_jenisjam: {
        type: DataTypes.STRING,
      },
      id_lembaga: {
        type: DataTypes.STRING,
      },
      lembaga_type: {
        type: DataTypes.STRING,
      },
      nama_jampel: {
        type: DataTypes.STRING(255),
      },
      mulai: {
        type: DataTypes.TIME,
      },
      selesai: {
        type: DataTypes.TIME,
      },
      jumlah_jampel: {
        type: DataTypes.DECIMAL(19, 1),
        get() {
          const rawValue = this.getDataValue('jumlah_jampel');
          return rawValue === null ? null : parseFloat(rawValue);
        },
      },
      nomor_urut: {
        type: DataTypes.INTEGER,
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
      modelName: 'JamPelajaran',
      tableName: 'jam_pelajaran',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  JamPelajaran.beforeCreate((row) => {
    row?.setDataValue('id_jampel', uuidv4());
  });

  return JamPelajaran;
}

export function associateJamPelajaran() {
  JamPelajaran.belongsTo(JenisJamPelajaran, {
    as: 'jenis_jam_pelajaran',
    foreignKey: 'id_jenisjam',
  });
  JamPelajaran.belongsTo(LembagaPendidikanFormal, {
    as: 'lembaga_formal',
    foreignKey: 'id_lembaga',
  });
}

export default JamPelajaran;
