import { QueryInterface, DataTypes, literal, Op } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'keu_anggaran',
      {
        id_anggaran: {
          type: DataTypes.STRING(255),
          primaryKey: true,
          allowNull: false,
        },
        nama_anggaran: { type: DataTypes.STRING(200), allowNull: false },
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
        nilai_disetujui: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
        nilai_realisasi: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
        id_batch: {
          type: DataTypes.STRING(255),
          allowNull: false,
          references: { model: 'keu_import_batch', key: 'id_batch' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
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
    await queryInterface.addConstraint('keu_anggaran', {
      fields: ['nilai_disetujui'],
      type: 'check',
      name: 'keu_anggaran_nilai_disetujui_check',
      where: { nilai_disetujui: { [Op.gte]: 0 } },
      transaction,
    });
    await queryInterface.addConstraint('keu_anggaran', {
      fields: ['nilai_realisasi'],
      type: 'check',
      name: 'keu_anggaran_nilai_realisasi_check',
      where: literal('"nilai_realisasi" IS NULL OR "nilai_realisasi" >= 0'),
      transaction,
    });
    await queryInterface.addConstraint('keu_anggaran', {
      fields: ['periode_mulai', 'periode_selesai'],
      type: 'check',
      name: 'keu_anggaran_periode_check',
      where: literal('"periode_mulai" <= "periode_selesai"'),
      transaction,
    });
    await queryInterface.addIndex(
      'keu_anggaran',
      ['id_akun', 'periode_mulai', 'periode_selesai', 'is_current'],
      {
        name: 'keu_anggaran_akun_periode_current_idx',
        transaction,
      }
    );
    await queryInterface.addIndex('keu_anggaran', ['id_batch'], {
      transaction,
    });
  });
};

export const down = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('keu_anggaran', { transaction });
  });
};
