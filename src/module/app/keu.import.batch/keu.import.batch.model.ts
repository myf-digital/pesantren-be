import { jenisDataValues, statusBatchValues } from './keu.import.batch.schema';
import { DataTypes, Model, Sequelize, Op } from 'sequelize';

export class KeuImportBatch extends Model {
  declare id_batch: string;
  declare jenis_data: string;
  declare status_batch: string;
  declare periode_awal: string | null;
  declare periode_akhir: string | null;
  declare menggantikan_batch_id: string | null;
}

export function initKeuImportBatch(sequelize: Sequelize) {
  KeuImportBatch.init(
    {
      id_batch: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      jenis_data: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: { isIn: [[...jenisDataValues]] },
      },
      nama_file: { type: DataTypes.STRING(255) },
      hash_file: { type: DataTypes.STRING(128) },
      hash_payload: { type: DataTypes.STRING(64) },
      periode_awal: { type: DataTypes.DATEONLY },
      periode_akhir: { type: DataTypes.DATEONLY },
      sumber_data: { type: DataTypes.STRING(200) },
      status_batch: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'Draft',
        validate: { isIn: [[...statusBatchValues]] },
      },
      jumlah_baris: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      jumlah_valid: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      jumlah_error: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      catatan: { type: DataTypes.TEXT },
      diimpor_oleh: { type: DataTypes.STRING(255) },
      waktu_import: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      dipublikasikan_oleh: { type: DataTypes.STRING(255) },
      waktu_publikasi: { type: DataTypes.DATE },
      menggantikan_batch_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        references: { model: 'keu_import_batch', key: 'id_batch' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
    },
    {
      sequelize,
      modelName: 'KeuImportBatch',
      tableName: 'keu_import_batch',
      timestamps: false,
      indexes: [
        {
          name: 'keu_import_batch_jenis_hash_unique',
          unique: true,
          fields: ['jenis_data', 'hash_file'],
          where: {
            hash_file: { [Op.ne]: null },
            status_batch: { [Op.ne]: 'Dibatalkan' },
          },
        },
      ],
    }
  );
  return KeuImportBatch;
}
export function associateKeuImportBatch() {
  KeuImportBatch.belongsTo(KeuImportBatch, {
    foreignKey: 'menggantikan_batch_id',
    as: 'menggantikan_batch',
  });
}
export default KeuImportBatch;
