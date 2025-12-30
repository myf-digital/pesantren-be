'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import moment from 'moment';
import JenisPenilaian from '../jenis.penilaian/jenis.penilaian.model';
import Tingkat from '../tingkat/tingkat.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';

export class JenisPenilaianBobot extends Model {
  public id_bobot!: string;
  public id_penilian!: string;
  public lembaga_type!: string;
  public id_lembaga!: string;
  public id_tingkat!: string;
  public id_tahunajaran!: string;
  public bobot!: string;
  public total_bobot!: number;
  public status!: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Relasi
  public jenisPenilaian?: JenisPenilaian;
  public tingkat?: Tingkat;
  public tahunAJaran?: TahunAjaran;
}

export function initJenisPenilaianBobot(sequelize: Sequelize) {
  JenisPenilaianBobot.init(
    {
      id_bobot: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        unique: true,
      },
      id_penilaian: {
        type: DataTypes.STRING,
        allowNull: false
      },
      lembaga_type: {
        type: DataTypes.ENUM("FORMAL", "PESANTREN"),
        allowNull: false
      },
      id_lembaga: {
        type: DataTypes.STRING,
        allowNull: false
      },
      id_tingkat: {
        type: DataTypes.STRING,
        allowNull: true
      },
      id_tahunajaran: {
        type: DataTypes.STRING,
        allowNull: false
      },
      bobot: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("Aktif", "Nonaktif"),
        allowNull: false
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
      modelName: 'JenisPenilaianBobot',
      tableName: 'jenis_penilaian_bobot',
      timestamps: false,
    }
  );

  JenisPenilaianBobot.beforeCreate((instance) => {
    instance?.setDataValue('id_bobot', uuidv4());
  });

  JenisPenilaianBobot.beforeBulkCreate((instances) => {
    instances.forEach((instance) => {
      instance.setDataValue('id_bobot', uuidv4()); // Assign a UUID to each instance
    });
  });

  return JenisPenilaianBobot;
}

export function associateJenisPenilaianBobot() {
  JenisPenilaianBobot.belongsTo(JenisPenilaian, {
    foreignKey: "id_penilaian",
    as: "jenisPenilaian",
    onUpdate: "CASCADE",
    onDelete: "SET NULL"
  });

  JenisPenilaianBobot.belongsTo(Tingkat, {
    foreignKey: "id_tingkat",
    as: "tingkat",
    onUpdate: "CASCADE",
    onDelete: "SET NULL"
  });

  JenisPenilaianBobot.belongsTo(TahunAjaran, {
    foreignKey: "id_tahunajaran",
    as: "tahunAjaran",
    onUpdate: "CASCADE",
    onDelete: "SET NULL"
  })
}

export default JenisPenilaianBobot;
