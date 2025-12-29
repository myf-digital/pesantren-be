'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import moment from 'moment';
import Cabang from '../cabang/cabang.model';

export class LembagaPendidikanFormal extends Model {
  public id_lembaga!: string;
  public nama_lembaga!: string;
  public keterangan!: string;
  public jenis_lembaga!: string;
  public status_akreditasi!: string;
  public nomor_nspn!: string;
  public created_at!: Date;
  public updated_at!: Date;

  // Relasi
  public cabang?: Cabang[];
}

export function initLembagaPendidikanFormal(sequelize: Sequelize) {
  LembagaPendidikanFormal.init(
    {
      id_lembaga: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      nama_lembaga: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      id_cabang: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      keterangan: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      jenis_lembaga: {
        type: DataTypes.ENUM(
          'SD',
          'MI',
          'SMP',
          'MTs',
          'SMA',
          'MA',
          'SMK',
          'Diniyah',
          'Perguruan Tinggi'
        ),
        allowNull: true,
      },
      status_akreditasi: {
        type: DataTypes.ENUM('A', 'B', 'C', 'Belum Terakreditasi'),
        allowNull: true,
      },
      nomor_npsn: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        get() {
          const value: string = this.getDataValue('created_at');
          return value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : null;
        },
        set(value) {
          const formattedValue = value
            ? moment(value).format('YYYY-MM-DD HH:mm:ss')
            : null;
          this.setDataValue('created_at', formattedValue);
        },
      },
      updated_at: {
        type: DataTypes.DATE,
        get() {
          const value = this.getDataValue('updated_at');
          return value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : null;
        },
        set(value) {
          const formattedValue = value
            ? moment(value).format('YYYY-MM-DD HH:mm:ss')
            : null;
          this.setDataValue('updated_at', formattedValue);
        },
      },
    },
    {
      sequelize,
      modelName: 'LembagaPendidikanFormal',
      tableName: 'lembaga_pendidikan_formal',
      timestamps: false,
    }
  );

  // UUID Otomatis sebelum create
  LembagaPendidikanFormal.beforeCreate((lembaga) => {
    lembaga?.setDataValue('id_lembaga', uuidv4());
  });

  LembagaPendidikanFormal.beforeBulkCreate((lembagaInstances) => {
    lembagaInstances.forEach((lembaga) => {
      lembaga.setDataValue('id_lembaga', uuidv4());
    });
  });

  return LembagaPendidikanFormal;
}

export function associateLembagaPendidikanFormal() {
  LembagaPendidikanFormal.belongsTo(Cabang, {
    foreignKey: 'id_cabang',
    as: 'cabang',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

export default LembagaPendidikanFormal;
