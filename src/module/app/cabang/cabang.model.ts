'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import moment from 'moment';
import AreaProvince from '../../area/provinces.model';
import AreaRegency from '../../area/regencies.model';
import AreaDistrict from '../../area/districts.model';
import AreaSubDistrict from '../../area/subdistricts.model';

export class Cabang extends Model {
  public id_cabang!: string;
  public nama_cabang!: string;
  public nomor_urut!: number;
  public keterangan!: string;
  public alamat!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

export function initCabang(sequelize: Sequelize) {
  Cabang.init(
    {
      id_cabang: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      nama_cabang: {
        type: DataTypes.STRING(255),
        unique: true,
      },
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
      contact: {
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
      },
      keterangan: {
        type: DataTypes.STRING(255),
      },
      alamat: {
        type: DataTypes.STRING(255),
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
      modelName: 'Cabang',
      tableName: 'cabang',
      timestamps: false,
    }
  );

  Cabang.beforeCreate((cabang) => {
    cabang?.setDataValue('id_cabang', uuidv4());
  });

  Cabang.beforeBulkCreate((cabangInstances) => {
    cabangInstances.forEach((cabang) => {
      cabang.setDataValue('id_cabang', uuidv4()); // Assign a UUID to each instance
    });
  });

  return Cabang;
}

export function associateCabang() {
  Cabang.belongsTo(AreaProvince, {
    foreignKey: 'province_id',
    as: 'province',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Cabang.belongsTo(AreaRegency, {
    foreignKey: 'city_id',
    as: 'city',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Cabang.belongsTo(AreaDistrict, {
    foreignKey: 'district_id',
    as: 'district',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Cabang.belongsTo(AreaSubDistrict, {
    foreignKey: 'sub_district_id',
    as: 'subDistrict',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

export default Cabang;
