'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import moment from 'moment';
import OrganitationUnit from '../organitation.unit/organitation.unit.model';

export class Jabatan extends Model {
  public id_jabatan!: string;
  public nama_jabatan!: string;
  public id_orgunit!: string;
  public level_jabatan!: number;
  public sifat_jabatan!: string;
  public kode_jabatan!: string;
  public keterangan!: string;
  public created_at!: Date;
  public updated_at!: Date;

  // Relasi
  public orgunit?: OrganitationUnit;
}

export function initJabatan(sequelize: Sequelize) {
  Jabatan.init(
    {
      id_jabatan: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      nama_jabatan: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      id_orgunit: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      level_jabatan: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      sifat_jabatan: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      kode_jabatan: {
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
      modelName: 'Jabatan',
      tableName: 'jabatan',
      timestamps: false,
    }
  );

  // UUID Otomatis sebelum create
  Jabatan.beforeCreate((jabatan) => {
    jabatan?.setDataValue('id_jabatan', uuidv4());
  });

  Jabatan.beforeBulkCreate((jabatanInstances) => {
    jabatanInstances.forEach((jabatan) => {
      jabatan.setDataValue('id_jabatan', uuidv4());
    });
  });

  return Jabatan;
}

export function associateJabatan() {
  Jabatan.belongsTo(OrganitationUnit, {
    foreignKey: 'id_orgunit',
    as: 'orgunit',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

export default Jabatan;
