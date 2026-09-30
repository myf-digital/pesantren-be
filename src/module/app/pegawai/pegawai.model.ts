'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import moment from 'moment';
import OrganizationUnit from '../organization.unit/organization.unit.model';
import Jabatan from '../jabatan/jabatan.model';
import AreaProvince from '../../area/provinces.model';
import AreaRegency from '../../area/regencies.model';
import AreaDistrict from '../../area/districts.model';
import AreaSubDistrict from '../../area/subdistricts.model';
import JamKerjaPegawai from '../pegawai.jam.kerja/pegawai.jam.kerja.model';
import JenisGuru from '../jenis.guru/jenis.guru.model';

export class Pegawai extends Model {
  declare id_pegawai: string;
  declare nik: string;
  declare nip: string;
  declare nama_lengkap: string;
  declare email: string;
  declare no_hp: string;
  declare jenis_kelamin: string;
  declare tempat_lahir: string;
  declare tanggal_lahir: Date;
  declare umur: number;
  declare alamat: string;
  declare id_lembaga?: string | null;

  // Tambahan Wilayah
  declare province_id: string;
  declare city_id: string;
  declare district_id: string;
  declare sub_district_id: string;

  declare pendidikan: string;
  declare bidang_ilmu: string;
  declare id_orgunit: string;
  declare id_jabatan: string;
  declare status_pegawai: string;
  declare tmt: string;
  declare foto: string;
  declare created_at: Date;
  declare updated_at: Date;

  // Relasi (Disesuaikan menjadi objek tunggal karena belongsTo)
  declare organizationUnit?: OrganizationUnit;
  declare jabatan?: Jabatan;
  declare jamKerjaPegawai?: JamKerjaPegawai;
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
      // Kolom Wilayah Baru
      province_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      district_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      sub_district_id: {
        type: DataTypes.STRING,
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
      id_lembaga: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.organizationUnit
            ? this.organizationUnit.id_lembaga
            : null;
        },
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
        // set(value) {
        //   const formattedValue = value
        //     ? moment(value).format('YYYY-MM-DD HH:mm:ss')
        //     : null;
        //   this.setDataValue('created_at', formattedValue);
        // },
      },
      updated_at: {
        type: DataTypes.DATE,
        get() {
          const value = this.getDataValue('updated_at');
          return value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : null;
        },
        // set(value) {
        //   const formattedValue = value
        //     ? moment(value).format('YYYY-MM-DD HH:mm:ss')
        //     : null;
        //   this.setDataValue('updated_at', formattedValue);
        // },
      },
    },
    {
      sequelize,
      modelName: 'Pegawai',
      tableName: 'pegawai',
      underscored: true, // Otomatis mengubah createdAt jadi created_at
      timestamps: true,
      paranoid: true, // Aktifkan Soft Delete
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  // UUID Otomatis sebelum create
  Pegawai.beforeCreate((pegawai) => {
    pegawai?.setDataValue('id_pegawai', uuidv4());
  });

  Pegawai.beforeBulkCreate((pegawaiInstances) => {
    pegawaiInstances.forEach((pegawai) => {
      pegawai.setDataValue('id_pegawai', uuidv4());
    });
  });

  return Pegawai;
}

export function associatePegawai() {
  Pegawai.belongsTo(OrganizationUnit, {
    foreignKey: 'id_orgunit',
    as: 'organizationUnit',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Pegawai.belongsTo(Jabatan, {
    foreignKey: 'id_jabatan',
    as: 'jabatan',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  // Relasi Wilayah (Geo-Location)
  Pegawai.belongsTo(AreaProvince, {
    foreignKey: 'province_id',
    as: 'province',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Pegawai.belongsTo(AreaRegency, {
    foreignKey: 'city_id',
    as: 'city',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Pegawai.belongsTo(AreaDistrict, {
    foreignKey: 'district_id',
    as: 'district',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Pegawai.belongsTo(AreaSubDistrict, {
    foreignKey: 'sub_district_id',
    as: 'subDistrict',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Pegawai.hasOne(JamKerjaPegawai, {
    foreignKey: 'id_pegawai',
    as: 'jamKerjaPegawai',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  Pegawai.hasMany(JenisGuru, {
    foreignKey: 'id_guru',
    as: 'jenis_guru',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });
}

export default Pegawai;
