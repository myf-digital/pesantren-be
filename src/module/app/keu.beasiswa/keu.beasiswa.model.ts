import { DataTypes, Model, Sequelize } from 'sequelize';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';
import AppSantri from '../santri/santri.model';
import JenisBeasiswa from '../jenis.beasiswa/jenis.beasiswa.model';
import KeuImportBatch from '../keu.import.batch/keu.import.batch.model';
import { jenisBantuanValues } from './keu.beasiswa.schema';

export class KeuBeasiswa extends Model {
  declare id_rekap_beasiswa: string;
  declare cakupan_data: 'PerPenerima' | 'Agregat';
  declare id_tahunajaran: string;
  declare id_santri: string | null;
  declare id_jenis_beasiswa: string;
  declare jenis_bantuan: string;
  declare nama_program: string | null;
  declare status_final: string;
  declare tanggal_data: string;
  declare nilai_diajukan: string | null;
  declare nilai_ditetapkan: string;
  declare nilai_realisasi: string | null;
  declare id_batch: string;
  declare is_current: boolean;
  declare keterangan: string | null;
}

export function initKeuBeasiswa(sequelize: Sequelize) {
  KeuBeasiswa.init(
    {
      id_rekap_beasiswa: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      cakupan_data: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'PerPenerima',
      },
      id_tahunajaran: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: { model: 'tahun_ajaran', key: 'id_tahunajaran' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      id_santri: {
        type: DataTypes.STRING(255),
        allowNull: true,
        references: { model: 'santri', key: 'id_santri' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      id_jenis_beasiswa: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: { model: 'jenis_beasiswa', key: 'id_beasiswa' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      id_batch: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: { model: 'keu_import_batch', key: 'id_batch' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      jenis_bantuan: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: { isIn: [[...jenisBantuanValues]] },
      },
      nama_program: { type: DataTypes.STRING(200), allowNull: true },
      status_final: { type: DataTypes.STRING(30), allowNull: false },
      tanggal_data: { type: DataTypes.DATEONLY, allowNull: false },
      nilai_diajukan: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      nilai_ditetapkan: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      nilai_realisasi: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      is_current: { type: DataTypes.BOOLEAN, defaultValue: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE },
    },
    {
      sequelize,
      modelName: 'KeuBeasiswa',
      tableName: 'keu_beasiswa',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );
  return KeuBeasiswa;
}
export function associateKeuBeasiswa() {
  KeuBeasiswa.belongsTo(TahunAjaran, {
    foreignKey: 'id_tahunajaran',
    as: 'tahun_ajaran',
  });
  KeuBeasiswa.belongsTo(AppSantri, { foreignKey: 'id_santri', as: 'santri' });
  KeuBeasiswa.belongsTo(JenisBeasiswa, {
    foreignKey: 'id_jenis_beasiswa',
    targetKey: 'id_beasiswa',
    as: 'jenis_beasiswa',
  });
  KeuBeasiswa.belongsTo(KeuImportBatch, {
    foreignKey: 'id_batch',
    as: 'batch',
  });
}
export default KeuBeasiswa;
