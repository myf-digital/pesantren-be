import KeuKelompokKas from '../keu.kelompok.kas/keu.kelompok.kas.model';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class KeuAkun extends Model {
  declare id_akun: string;
  declare kode_akun: string;
  declare nama_akun: string;
  declare id_kelompok_kas: string;
  declare is_periodik_tahun_ajaran: boolean;
  declare urutan: number;
  declare is_active: boolean;
  declare keterangan: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

export function initKeuAkun(sequelize: Sequelize) {
  KeuAkun.init(
    {
      id_akun: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      kode_akun: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      nama_akun: { type: DataTypes.STRING(200), allowNull: false },
      id_kelompok_kas: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: { model: 'keu_kelompok_kas', key: 'id_kelompok_kas' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      is_periodik_tahun_ajaran: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      urutan: { type: DataTypes.INTEGER, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: 'KeuAkun',
      tableName: 'keu_akun',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );
  return KeuAkun;
}

export function associateKeuAkun() {
  KeuAkun.belongsTo(KeuKelompokKas, {
    foreignKey: 'id_kelompok_kas',
    as: 'kelompok_kas',
  });
}

export default KeuAkun;
