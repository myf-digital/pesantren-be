'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import moment from 'moment';

export class MasterPelanggaranRemisi extends Model {
  declare id_pelanggaran_remisi: string;
  declare kode_pelanggaran: string;
  declare nama_pelanggaran: string;
  declare jenis: 'Pelanggaran' | 'Remisi';
  declare kategori: 'Ringan' | 'Sedang' | 'Berat' | 'Sangat Berat' | null;
  declare skor: number;
  declare keterangan: string | null;
  declare is_active: boolean;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

export function initMasterPelanggaranRemisi(sequelize: Sequelize) {
  MasterPelanggaranRemisi.init(
    {
      id_pelanggaran_remisi: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        unique: true,
      },
      kode_pelanggaran: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      nama_pelanggaran: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      jenis: {
        type: DataTypes.ENUM('Pelanggaran', 'Remisi'),
        allowNull: false,
      },
      kategori: {
        type: DataTypes.ENUM('Ringan', 'Sedang', 'Berat', 'Sangat Berat'),
        allowNull: true,
      },
      skor: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      keterangan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        get() {
          const value = this.getDataValue('created_at');
          return value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : null;
        },
      },
      updated_at: {
        type: DataTypes.DATE,
        get() {
          const value = this.getDataValue('updated_at');
          return value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : null;
        },
      },
      deleted_at: {
        type: DataTypes.DATE,
        get() {
          const value = this.getDataValue('deleted_at');
          return value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : null;
        },
      },
    },
    {
      sequelize,
      modelName: 'MasterPelanggaranRemisi',
      tableName: 'master_pelanggaran_remisi',
      underscored: true,
      timestamps: true,
      paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  // Otomatisasi pembentukan UUID sebelum record disimpan
  MasterPelanggaranRemisi.beforeCreate((instance) => {
    if (!instance.getDataValue('id_pelanggaran_remisi')) {
      instance.setDataValue('id_pelanggaran_remisi', uuidv4());
    }
  });

  MasterPelanggaranRemisi.beforeBulkCreate((instances) => {
    instances.forEach((instance) => {
      if (!instance.getDataValue('id_pelanggaran_remisi')) {
        instance.setDataValue('id_pelanggaran_remisi', uuidv4());
      }
    });
  });

  return MasterPelanggaranRemisi;
}

export function associateMasterPelanggaranRemisi() {
}

export default MasterPelanggaranRemisi;