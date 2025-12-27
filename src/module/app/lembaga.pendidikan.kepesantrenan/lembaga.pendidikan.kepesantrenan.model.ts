'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import moment from 'moment';
import Cabang from '../cabang/cabang.model';

export class LembagaPendidikanKepesantrenan extends Model {
  public id_lembaga!: string;
  public nama_lembaga!: string;
  public keterangan!: string;
  public created_at!: Date;
  public updated_at!: Date;

  // Relasi
  public cabang?: Cabang[];
}

export function initLembagaPendidikanKepesantrenan(sequelize: Sequelize) {
  LembagaPendidikanKepesantrenan.init(
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
      created_at: {
        type: DataTypes.DATE,
        get() {
          const value = this.getDataValue('created_at');
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
      modelName: 'LembagaPendidikanKepesantrenan',
      tableName: 'lembaga_pendidikan_kepesantrenan',
      timestamps: false,
    }
  );

  // UUID Otomatis sebelum create
  LembagaPendidikanKepesantrenan.beforeCreate((lembaga) => {
    lembaga?.setDataValue('id_lembaga', uuidv4());
  });

  LembagaPendidikanKepesantrenan.beforeBulkCreate((lembagaInstances) => {
    lembagaInstances.forEach((lembaga) => {
      lembaga.setDataValue('id_lembaga', uuidv4());
    });
  });

  return LembagaPendidikanKepesantrenan;
}

export function associateLembagaPendidikanKepesantrenan() {
  LembagaPendidikanKepesantrenan.belongsTo(Cabang, {
    foreignKey: 'id_cabang',
    as: 'cabang',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

export default LembagaPendidikanKepesantrenan;
