import { DataTypes, Model, Sequelize } from 'sequelize';
import KeuImportBatch from '../keu.import.batch/keu.import.batch.model';
import KeuAkun from '../keu.akun/keu.akun.model';

export class KeuAnggaran extends Model {
  declare status_sumber: string | null;
  declare id_anggaran: string;
  declare nama_anggaran: string;
  declare kode_referensi_sumber: string | null;
  declare periode_mulai: string;
  declare periode_selesai: string;
  declare id_akun: string | null;
  declare nilai_disetujui: string;
  declare nilai_realisasi: string | null;
  declare id_batch: string;
  declare keterangan: string | null;
  declare is_current: boolean;
  declare created_at: Date;
  declare updated_at: Date;
}

export function initKeuAnggaran(sequelize: Sequelize) {
  KeuAnggaran.init(
    {
      id_anggaran: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      nama_anggaran: { type: DataTypes.STRING(200), allowNull: false },
      status_sumber: { type: DataTypes.STRING(100), allowNull: true },
      kode_referensi_sumber: { type: DataTypes.STRING(150), allowNull: true },
      periode_mulai: { type: DataTypes.DATEONLY, allowNull: false },
      periode_selesai: { type: DataTypes.DATEONLY, allowNull: false },
      id_akun: {
        type: DataTypes.STRING(255),
        allowNull: true,
        references: { model: 'keu_akun', key: 'id_akun' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      nilai_disetujui: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      nilai_realisasi: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
        validate: { min: 0 },
      },
      id_batch: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: { model: 'keu_import_batch', key: 'id_batch' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      is_current: { type: DataTypes.BOOLEAN, defaultValue: true },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: 'KeuAnggaran',
      tableName: 'keu_anggaran',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );
  return KeuAnggaran;
}

export function associateKeuAnggaran() {
  KeuAnggaran.belongsTo(KeuImportBatch, {
    foreignKey: 'id_batch',
    as: 'batch',
  });
  KeuAnggaran.belongsTo(KeuAkun, { foreignKey: 'id_akun', as: 'akun' });
}

export default KeuAnggaran;
