'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import moment from 'moment';
import Cabang from '../cabang/cabang.model';
import LembagaPendidikan, {
  LembagaPendidikanKepesantrenan,
} from '../lembaga.pendidikan.kepesantrenan/lembaga.pendidikan.kepesantrenan.model';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';

export class OrganitationUnit extends Model {
  public id_orgunit!: string;
  public nama_orgunit!: string;
  public parent_id!: string;
  public level_orgunit!: string;
  public id_cabang!: string;
  public id_lembaga!: string;
  public jenis_orgunit!: string;
  public keterangan!: string;
  public lembaga_type!: string;
  public created_at!: Date;
  public updated_at!: Date;

  // Relasi
  public cabang?: Cabang;
  public parent?: OrganitationUnit;
  public children?: OrganitationUnit;
}

export function initOrganitationUnit(sequelize: Sequelize) {
  OrganitationUnit.init(
    {
      id_orgunit: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      nama_orgunit: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      parent_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      level_orgunit: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      id_cabang: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      id_lembaga: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      jenis_orgunit: {
        type: DataTypes.ENUM('Biro', 'Bagian', 'Lembaga', 'Sub-Unit', 'Umum'),
        allowNull: true,
      },
      lembaga_type: {
        type: DataTypes.ENUM('FORMAL', 'PESANTREN'),
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
      modelName: 'OrganitationUnit',
      tableName: 'orgunit',
      timestamps: false,
    }
  );

  // UUID Otomatis sebelum create
  OrganitationUnit.beforeCreate((organitation) => {
    organitation?.setDataValue('id_orgunit', uuidv4());
  });

  OrganitationUnit.beforeBulkCreate((organitationInstances) => {
    organitationInstances.forEach((organitation) => {
      organitation.setDataValue('id_orgunit', uuidv4());
    });
  });

  return OrganitationUnit;
}

export function associateOrganitationUnit() {
  OrganitationUnit.belongsTo(OrganitationUnit, {
    foreignKey: 'parent_id',
    as: 'parent',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  OrganitationUnit.hasMany(OrganitationUnit, {
    foreignKey: 'parent_id',
    as: 'children',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  OrganitationUnit.belongsTo(Cabang, {
    foreignKey: 'id_cabang',
    as: 'cabang',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  OrganitationUnit.belongsTo(LembagaPendidikanFormal, {
    foreignKey: 'id_lembaga',
    as: 'lembagaPendidikanFormal',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  OrganitationUnit.belongsTo(LembagaPendidikanKepesantrenan, {
    foreignKey: 'id_lembaga',
    as: 'lembagaPendidikanKepesantrenan',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

export default OrganitationUnit;
