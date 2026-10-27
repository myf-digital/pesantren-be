import { QueryInterface, DataTypes, literal, Op } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'keu_target',
      {
        id_target: {
          type: DataTypes.STRING(255),
          primaryKey: true,
          allowNull: false,
        },
        nama_target: { type: DataTypes.STRING(200), allowNull: false },
        jenis_target: { type: DataTypes.STRING(30), allowNull: false },
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
        nilai_target: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
        id_batch: {
          type: DataTypes.STRING(255),
          allowNull: true,
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
    await queryInterface.addConstraint('keu_target', {
      fields: ['jenis_target'],
      type: 'check',
      name: 'keu_target_jenis_target_check',
      where: {
        jenis_target: {
          [Op.in]: ['Penerimaan', 'Pengeluaran', 'Anggaran', 'Lainnya'],
        },
      },
      transaction,
    });
    await queryInterface.addConstraint('keu_target', {
      fields: ['nilai_target'],
      type: 'check',
      name: 'keu_target_nilai_target_check',
      where: { nilai_target: { [Op.gte]: 0 } },
      transaction,
    });
    await queryInterface.addConstraint('keu_target', {
      fields: ['periode_mulai', 'periode_selesai'],
      type: 'check',
      name: 'keu_target_periode_check',
      where: literal('"periode_mulai" <= "periode_selesai"'),
      transaction,
    });
    await queryInterface.addIndex(
      'keu_target',
      ['id_akun', 'periode_mulai', 'periode_selesai', 'is_current'],
      {
        name: 'keu_target_akun_periode_current_idx',
        transaction,
      }
    );
    await queryInterface.addIndex('keu_target', ['id_batch'], {
      transaction,
    });
    await queryInterface.addIndex('keu_target', ['id_tahunajaran'], {
      transaction,
    });
  });
};

export const down = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('keu_target', { transaction });
  });
};
