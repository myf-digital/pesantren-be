import { DataTypes, QueryInterface, literal, Op } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.addColumn(
      'keu_beasiswa',
      'cakupan_data',
      {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      { transaction }
    );
    await queryInterface.sequelize.query(
      `UPDATE "keu_beasiswa" SET "cakupan_data" = CASE WHEN "id_santri" IS NULL THEN 'Agregat' ELSE 'PerPenerima' END`,
      { transaction }
    );
    await queryInterface.changeColumn(
      'keu_beasiswa',
      'cakupan_data',
      {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'PerPenerima',
      },
      { transaction }
    );
    await queryInterface.addConstraint('keu_beasiswa', {
      fields: ['cakupan_data', 'id_santri'],
      type: 'check',
      name: 'keu_beasiswa_cakupan_check',
      where: literal(
        `("cakupan_data" = 'PerPenerima' AND "id_santri" IS NOT NULL) OR ("cakupan_data" = 'Agregat' AND "id_santri" IS NULL)`
      ),
      transaction,
    });
    await queryInterface.addColumn(
      'keu_anggaran',
      'status_sumber',
      {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      { transaction }
    );
    for (const [table, field] of [
      ['keu_rekap_harian', 'masuk'],
      ['keu_rekap_harian', 'keluar'],
      ['keu_beasiswa', 'nilai_realisasi'],
    ]) {
      await queryInterface.addConstraint(table, {
        fields: [field],
        type: 'check',
        name: `${table}_${field}_nonnegative`,
        where: { [field]: { [Op.gte]: 0 } },
        transaction,
      });
    }
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX "keu_rekap_harian_current_unique"
      ON "keu_rekap_harian" ("tanggal", "id_akun", COALESCE("id_tahunajaran", '')) WHERE "is_current" IS TRUE`,
      { transaction }
    );
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX "keu_target_current_unique"
      ON "keu_target" ("id_akun", "jenis_target", "periode_mulai", "periode_selesai") WHERE "is_current" IS TRUE`,
      { transaction }
    );
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX "keu_beasiswa_current_unique"
      ON "keu_beasiswa" ("cakupan_data", COALESCE("id_santri", ''), "id_jenis_beasiswa", "jenis_bantuan", COALESCE("nama_program", ''), "id_tahunajaran", "tanggal_data")
      WHERE "is_current" IS TRUE`,
      { transaction }
    );
  });
};

export const down = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    for (const name of [
      'keu_rekap_harian_current_unique',
      'keu_target_current_unique',
      'keu_beasiswa_current_unique',
    ]) {
      await queryInterface.sequelize.query(`DROP INDEX "${name}"`, {
        transaction,
      });
    }
    for (const [table, field] of [
      ['keu_rekap_harian', 'masuk'],
      ['keu_rekap_harian', 'keluar'],
      ['keu_beasiswa', 'nilai_realisasi'],
    ]) {
      await queryInterface.removeConstraint(
        table,
        `${table}_${field}_nonnegative`,
        { transaction }
      );
    }
    await queryInterface.removeConstraint(
      'keu_beasiswa',
      'keu_beasiswa_cakupan_check',
      { transaction }
    );
    await queryInterface.removeColumn('keu_beasiswa', 'cakupan_data', {
      transaction,
    });
    await queryInterface.removeColumn('keu_anggaran', 'status_sumber', {
      transaction,
    });
  });
};
