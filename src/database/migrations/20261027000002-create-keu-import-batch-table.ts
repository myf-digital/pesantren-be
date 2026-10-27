import { QueryInterface, DataTypes, literal, Op } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'keu_import_batch',
      {
        id_batch: {
          type: DataTypes.STRING(255),
          primaryKey: true,
          allowNull: false,
        },
        jenis_data: { type: DataTypes.STRING(30), allowNull: false },
        nama_file: { type: DataTypes.STRING(255), allowNull: true },
        hash_file: { type: DataTypes.STRING(128), allowNull: true },
        periode_awal: { type: DataTypes.DATEONLY, allowNull: true },
        periode_akhir: { type: DataTypes.DATEONLY, allowNull: true },
        sumber_data: { type: DataTypes.STRING(200), allowNull: true },
        status_batch: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'Draft',
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
        catatan: { type: DataTypes.TEXT, allowNull: true },
        diimpor_oleh: { type: DataTypes.STRING(255), allowNull: true },
        waktu_import: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: literal('CURRENT_TIMESTAMP'),
        },
        dipublikasikan_oleh: { type: DataTypes.STRING(255), allowNull: true },
        waktu_publikasi: { type: DataTypes.DATE, allowNull: true },
        menggantikan_batch_id: {
          type: DataTypes.STRING(255),
          allowNull: true,
          references: { model: 'keu_import_batch', key: 'id_batch' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
      },
      { transaction }
    );
    await queryInterface.addConstraint('keu_import_batch', {
      fields: ['jenis_data'],
      type: 'check',
      name: 'keu_import_batch_jenis_data_check',
      where: {
        jenis_data: {
          [Op.in]: [
            'RekapHarian',
            'Target',
            'Anggaran',
            'Beasiswa',
            'SaldoAwal',
          ],
        },
      },
      transaction,
    });
    await queryInterface.addConstraint('keu_import_batch', {
      fields: ['status_batch'],
      type: 'check',
      name: 'keu_import_batch_status_batch_check',
      where: {
        status_batch: {
          [Op.in]: [
            'Draft',
            'ValidasiGagal',
            'SiapPublikasi',
            'Dipublikasikan',
            'Digantikan',
            'Dibatalkan',
          ],
        },
      },
      transaction,
    });
    for (const field of ['jumlah_baris', 'jumlah_valid', 'jumlah_error']) {
      await queryInterface.addConstraint('keu_import_batch', {
        fields: [field],
        type: 'check',
        name: `keu_import_batch_${field}_check`,
        where: { [field]: { [Op.gte]: 0 } },
        transaction,
      });
    }
    await queryInterface.addConstraint('keu_import_batch', {
      fields: ['periode_awal', 'periode_akhir'],
      type: 'check',
      name: 'keu_import_batch_periode_check',
      where: literal(
        '"periode_awal" IS NULL OR "periode_akhir" IS NULL OR "periode_awal" <= "periode_akhir"'
      ),
      transaction,
    });
    await queryInterface.addIndex(
      'keu_import_batch',
      ['jenis_data', 'hash_file'],
      {
        name: 'keu_import_batch_jenis_hash_unique',
        unique: true,
        where: {
          hash_file: { [Op.ne]: null },
          status_batch: { [Op.ne]: 'Dibatalkan' },
        },
        transaction,
      }
    );
  });
};

export const down = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('keu_import_batch', { transaction });
  });
};
