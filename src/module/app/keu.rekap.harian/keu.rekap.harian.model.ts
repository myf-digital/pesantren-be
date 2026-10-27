import { DataTypes, Model, Sequelize } from 'sequelize';
import KeuImportBatch from '../keu.import.batch/keu.import.batch.model';
import KeuAkun from '../keu.akun/keu.akun.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';

export class KeuRekapHarian extends Model {
  declare id_rekap: string;
  declare tanggal: string;
  declare id_akun: string;
  declare id_tahunajaran: string | null;
  declare saldo_awal: string;
  declare masuk: string;
  declare keluar: string;
  declare saldo_akhir: string;
  declare id_batch: string;
  declare nomor_baris_sumber: number | null;
  declare keterangan: string | null;
  declare is_current: boolean;
  declare created_at: Date;
  declare updated_at: Date;
}

export function initKeuRekapHarian(sequelize: Sequelize) {
  KeuRekapHarian.init(
    {
      id_rekap: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      id_akun: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: { model: 'keu_akun', key: 'id_akun' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      id_tahunajaran: {
        type: DataTypes.STRING(255),
        allowNull: true,
        references: { model: 'tahun_ajaran', key: 'id_tahunajaran' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      saldo_awal: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      masuk: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      keluar: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      saldo_akhir: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      id_batch: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: { model: 'keu_import_batch', key: 'id_batch' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      nomor_baris_sumber: { type: DataTypes.INTEGER, allowNull: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      is_current: { type: DataTypes.BOOLEAN, defaultValue: true },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: 'KeuRekapHarian',
      tableName: 'keu_rekap_harian',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );
  return KeuRekapHarian;
}

export function associateKeuRekapHarian() {
  KeuRekapHarian.belongsTo(KeuImportBatch, {
    foreignKey: 'id_batch',
    as: 'batch',
  });
  KeuRekapHarian.belongsTo(KeuAkun, { foreignKey: 'id_akun', as: 'akun' });
  KeuRekapHarian.belongsTo(TahunAjaran, {
    foreignKey: 'id_tahunajaran',
    as: 'tahun_ajaran',
  });
}

export default KeuRekapHarian;
