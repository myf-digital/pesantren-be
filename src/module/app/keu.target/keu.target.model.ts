import { jenisTargetValues } from './keu.target.schema';
import { DataTypes, Model, Sequelize } from 'sequelize';
import KeuImportBatch from '../keu.import.batch/keu.import.batch.model';
import KeuAkun from '../keu.akun/keu.akun.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';

export class KeuTarget extends Model {
  declare id_target: string;
  declare nama_target: string;
  declare jenis_target: string;
  declare periode_mulai: string;
  declare periode_selesai: string;
  declare id_akun: string;
  declare id_tahunajaran: string | null;
  declare nilai_target: string;
  declare id_batch: string | null;
  declare keterangan: string | null;
  declare is_current: boolean;
  declare created_at: Date;
  declare updated_at: Date;
}

export function initKeuTarget(sequelize: Sequelize) {
  KeuTarget.init(
    {
      id_target: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      nama_target: { type: DataTypes.STRING(200), allowNull: false },
      jenis_target: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: { isIn: [[...jenisTargetValues]] },
      },
      periode_mulai: { type: DataTypes.DATEONLY, allowNull: false },
      periode_selesai: { type: DataTypes.DATEONLY, allowNull: false },
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
      nilai_target: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      id_batch: {
        type: DataTypes.STRING(255),
        allowNull: true,
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
      modelName: 'KeuTarget',
      tableName: 'keu_target',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );
  return KeuTarget;
}

export function associateKeuTarget() {
  KeuTarget.belongsTo(KeuImportBatch, {
    foreignKey: 'id_batch',
    as: 'batch',
  });
  KeuTarget.belongsTo(KeuAkun, { foreignKey: 'id_akun', as: 'akun' });
  KeuTarget.belongsTo(TahunAjaran, {
    foreignKey: 'id_tahunajaran',
    as: 'tahun_ajaran',
  });
}

export default KeuTarget;
