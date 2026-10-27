import { QueryInterface, DataTypes, literal } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'keu_rekap_harian',
      {
        id_rekap: {
          type: DataTypes.STRING(255),
          primaryKey: true,
          allowNull: false,
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
        created_at: {
          type: DataTypes.DATE,
          defaultValue: literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: DataTypes.DATE,
          defaultValue: literal('CURRENT_TIMESTAMP'),
        },
      },
      { transaction }
    );
    await queryInterface.addIndex(
      'keu_rekap_harian',
      ['tanggal', 'id_akun', 'is_current'],
      {
        name: 'keu_rekap_harian_tanggal_akun_current_idx',
        transaction,
      }
    );
    await queryInterface.addIndex('keu_rekap_harian', ['id_batch'], {
      transaction,
    });
    await queryInterface.addIndex('keu_rekap_harian', ['id_tahunajaran'], {
      transaction,
    });
  });
};

export const down = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('keu_rekap_harian', { transaction });
  });
};
