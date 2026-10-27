import { DataTypes, Model, Sequelize } from 'sequelize';

export class KeuKelompokKas extends Model {
  declare id_kelompok_kas: string;
  declare kode_kelompok: string;
  declare nama_kelompok: string;
  declare urutan: number;
  declare is_active: boolean;
  declare keterangan: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

export function initKeuKelompokKas(sequelize: Sequelize) {
  KeuKelompokKas.init(
    {
      id_kelompok_kas: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      kode_kelompok: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      nama_kelompok: { type: DataTypes.STRING(150), allowNull: false },
      urutan: { type: DataTypes.INTEGER, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: 'KeuKelompokKas',
      tableName: 'keu_kelompok_kas',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );
  return KeuKelompokKas;
}

export default KeuKelompokKas;
