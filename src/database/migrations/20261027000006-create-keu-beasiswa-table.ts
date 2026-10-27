import { QueryInterface, DataTypes, literal, Op } from 'sequelize';
export const up = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'keu_beasiswa',
      {
        id_rekap_beasiswa: {
          type: DataTypes.STRING(255),
          primaryKey: true,
          allowNull: false,
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
        jenis_bantuan: { type: DataTypes.STRING(30), allowNull: false },
        nama_program: { type: DataTypes.STRING(200), allowNull: true },
        status_final: { type: DataTypes.STRING(30), allowNull: false },
        tanggal_data: { type: DataTypes.DATEONLY, allowNull: false },
        nilai_diajukan: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
        nilai_ditetapkan: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
        nilai_realisasi: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
        is_current: { type: DataTypes.BOOLEAN, defaultValue: true },
        keterangan: { type: DataTypes.TEXT, allowNull: true },
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
    await queryInterface.addConstraint('keu_beasiswa', {
      fields: ['jenis_bantuan'],
      type: 'check',
      name: 'keu_beasiswa_jenis_bantuan_check',
      where: {
        jenis_bantuan: { [Op.in]: ['Beasiswa', 'Keringanan', 'Lainnya'] },
      },
      transaction,
    });
    await queryInterface.addConstraint('keu_beasiswa', {
      fields: ['nilai_ditetapkan'],
      type: 'check',
      name: 'keu_beasiswa_nilai_ditetapkan_check',
      where: { nilai_ditetapkan: { [Op.gte]: 0 } },
      transaction,
    });
    await queryInterface.addIndex(
      'keu_beasiswa',
      ['id_tahunajaran', 'tanggal_data', 'is_current'],
      { name: 'keu_beasiswa_tahun_tanggal_current_idx', transaction }
    );
    for (const field of ['id_santri', 'id_jenis_beasiswa', 'id_batch']) {
      await queryInterface.addIndex('keu_beasiswa', [field], { transaction });
    }
  });
};
export const down = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('keu_beasiswa', { transaction });
  });
};
