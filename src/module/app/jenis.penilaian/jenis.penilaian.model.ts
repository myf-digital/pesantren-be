'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import moment from 'moment';

export class JenisPenilaian extends Model {
  public id_penilian!: string;
  public singkatan!: string;
  public jenis_pengujian!: string;
  public keterangan!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

export function initJenisPenilaian(sequelize: Sequelize) {
  JenisPenilaian.init(
    {
      id_penilaian: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      singkatan: {
        type: DataTypes.STRING(255),
        unique: true,
      },
      jenis_pengujian: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      keterangan: {
        type: DataTypes.STRING(255),
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
      modelName: 'JenisPenilaian',
      tableName: 'jenis_penilaian',
      timestamps: false,
    }
  );

  JenisPenilaian.beforeCreate((jenisPenilaian) => {
    jenisPenilaian?.setDataValue('id_penilaian', uuidv4());
  });

  JenisPenilaian.beforeBulkCreate((jenisPenilaianInstances) => {
    jenisPenilaianInstances.forEach((jenisPenilaian) => {
      jenisPenilaian.setDataValue('id_penilaian', uuidv4()); // Assign a UUID to each instance
    });
  });

  return JenisPenilaian;
}

export default JenisPenilaian;
