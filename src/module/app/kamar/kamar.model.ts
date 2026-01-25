'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import moment from 'moment';
import Asrama from '../asrama/asrama.model';
import Pegawai from '../pegawai/pegawai.model';

export class Kamar extends Model {
  public id_kamar!: string;
  public nama_kamar!: string;
  public lantai!: string;
  public kapasitas!: string;
  public status!: string;
  public keterangan!: string;
  public created_at!: Date;
  public updated_at!: Date;

  // Relasi
  public asrama?: Asrama;
  public waliAsuh?: Pegawai;
}

export function initKamar(sequelize: Sequelize) {
  Kamar.init(
    {
      id_kamar: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      id_asrama: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      nama_kamar: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      lantai: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      kapasitas: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      id_wali_asuh: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('Aktif', 'Non-Aktif'),
        allowNull: true,
      },
      keterangan: {
        type: DataTypes.TEXT,
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
      modelName: 'Kamar',
      tableName: 'kamar',
      timestamps: false,
    }
  );

  // UUID Otomatis sebelum create
  Kamar.beforeCreate((kamar) => {
    kamar?.setDataValue('id_kamar', uuidv4());
  });

  Kamar.beforeBulkCreate((kamarInstances) => {
    kamarInstances.forEach((kamar) => {
      kamar.setDataValue('id_kamar', uuidv4());
    });
  });

  return Kamar;
}

export function associateKamar() {
  Kamar.belongsTo(Asrama, {
    foreignKey: 'id_asrama',
    as: 'asrama',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Kamar.belongsTo(Pegawai, {
    foreignKey: 'id_wali_asuh',
    as: 'waliAsuh',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

export default Kamar;
