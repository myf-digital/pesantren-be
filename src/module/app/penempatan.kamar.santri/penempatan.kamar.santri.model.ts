'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import moment from 'moment';
import Asrama from '../asrama/asrama.model';
import Kamar from '../kamar/kamar.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';

export class PenempatanKamarSantri extends Model {
  public id_penempatan!: string;
  public id_santri!: string;
  public id_asrama!: string;
  public id_kamar!: string;
  public id_tahunajaran!: string;
  public tanggal_masuk!: Date;
  public tanggal_keluar!: Date;
  public status!: string;
  public keterangan!: string;
  public created_at!: Date;
  public updated_at!: Date;

  // Relasi
  public asrama?: Asrama;
  public kamar?: Kamar;
  public tahunAjaran?: TahunAjaran;
}

export function initPenempatanKamarSantri(sequelize: Sequelize) {
  PenempatanKamarSantri.init(
    {
      id_penempatan: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      id_santri: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      id_asrama: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      id_kamar: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      id_tahunajaran: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tanggal_masuk: {
        type: DataTypes.DATE,
        get() {
          const value = this.getDataValue('tanggal_masuk');
          return value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : null;
        },
        set(value) {
          const formattedValue = value
            ? moment(value).format('YYYY-MM-DD HH:mm:ss')
            : null;
          this.setDataValue('tanggal_masuk', formattedValue);
        },
      },
      tanggal_keluar: {
        type: DataTypes.DATE,
        get() {
          const value = this.getDataValue('tanggal_keluar');
          return value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : null;
        },
        set(value) {
          const formattedValue = value
            ? moment(value).format('YYYY-MM-DD HH:mm:ss')
            : null;
          this.setDataValue('tanggal_keluar', formattedValue);
        },
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
      modelName: 'PenempatanKamarSantri',
      tableName: 'penempatan_kamar_santri',
      timestamps: false,
    }
  );

  // UUID Otomatis sebelum create
  PenempatanKamarSantri.beforeCreate((kamar) => {
    kamar?.setDataValue('id_penempatan', uuidv4());
  });

  PenempatanKamarSantri.beforeBulkCreate((kamarInstances) => {
    kamarInstances.forEach((kamar) => {
      kamar.setDataValue('id_penempatan', uuidv4());
    });
  });

  return PenempatanKamarSantri;
}

export function associatePenempatanKamarSantri() {
  // PenempatanKamarSantri.belongsTo(Santri, {
  //   foreignKey: 'id_asrama',
  //   as: 'asrama',
  //   onUpdate: 'CASCADE',
  //   onDelete: 'SET NULL'
  // });

  PenempatanKamarSantri.belongsTo(Asrama, {
    foreignKey: 'id_asrama',
    as: 'asrama',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  PenempatanKamarSantri.belongsTo(Kamar, {
    foreignKey: 'id_kamar',
    as: 'kamar',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  PenempatanKamarSantri.belongsTo(TahunAjaran, {
    foreignKey: 'id_tahunajaran',
    as: 'tahunAjaran',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

export default PenempatanKamarSantri;
