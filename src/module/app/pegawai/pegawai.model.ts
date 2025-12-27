'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import moment from 'moment';
import OrganitationUnit from '../organitation.unit/organitation.unit.model';
import Jabatan from '../jabatan/jabatan.model';

export class Pegawai extends Model {
  public id_pegawai!: string;
  public nik!: string;
  public nip!: string;
  public nama_lengkap!: string;
  public email!: string;
  public no_hp!: string;
  public jenis_kelamin!: string;
  public tempat_lahir!: string;
  public tanggal_lahir!: Date;
  public umur!: number;
  public alamat!: string;
  public pendidikan!: string;
  public bidang_ilmu!: string;
  public id_orgunit!: string;
  public id_jabatan!: string;
  public status_pegawai!: string;
  public tmt!: string;
  public foto!: string;
  public created_at!: Date;
  public updated_at!: Date;

  // Relasi
  public orgunit?: OrganitationUnit[];
  public jabatan?: Jabatan[];
}

export function initPegawai(sequelize: Sequelize) {
  Pegawai.init(
    {
      id_pegawai: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      nik: {
        type: DataTypes.STRING(30),
        allowNull: true,
        unique: true,
      },
      nip: {
        type: DataTypes.STRING(30),
        allowNull: true,
        unique: true,
      },
      nama_lengkap: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      no_hp: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      jenis_kelamin: {
        type: DataTypes.ENUM('Laki-laki', 'Perempuan'),
        allowNull: true,
      },
      tempat_lahir: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      tanggal_lahir: {
        type: DataTypes.DATE,
        get() {
          const value = this.getDataValue('tanggal_lahir');
          return value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : null;
        },
        set(value) {
          const formattedValue = value
            ? moment(value).format('YYYY-MM-DD HH:mm:ss')
            : null;
          this.setDataValue('tanggal_lahir', formattedValue);
        },
      },
      umur: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      alamat: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      pendidikan: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      bidang_ilmu: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      id_orgunit: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      id_jabatan: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status_pegawai: {
        type: DataTypes.ENUM('Aktif', 'Tidak Aktif', 'Pensiun'),
        allowNull: true,
      },
      tmt: {
        type: DataTypes.DATE,
        get() {
          const value: string = this.getDataValue('tmt');
          return value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : null;
        },
        set(value) {
          const formattedValue = value
            ? moment(value).format('YYYY-MM-DD HH:mm:ss')
            : null;
          this.setDataValue('tmt', formattedValue);
        },
      },
      foto: {
        type: DataTypes.STRING,
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
      modelName: 'Pegawai',
      tableName: 'pegawai',
      timestamps: false,
    }
  );

  // UUID Otomatis sebelum create
  Pegawai.beforeCreate((lembaga) => {
    lembaga?.setDataValue('id_pegawai', uuidv4());
  });

  Pegawai.beforeBulkCreate((lembagaInstances) => {
    lembagaInstances.forEach((lembaga) => {
      lembaga.setDataValue('id_pegawai', uuidv4());
    });
  });

  return Pegawai;
}

export function associatePegawai() {
  Pegawai.belongsTo(OrganitationUnit, {
    foreignKey: 'id_orgunit',
    as: 'organitationUnit',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Pegawai.belongsTo(Jabatan, {
    foreignKey: 'id_jabatan',
    as: 'jabatan',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

export default Pegawai;
