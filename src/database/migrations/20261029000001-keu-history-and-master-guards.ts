import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    // Fail on pre-existing duplicates rather than silently discarding financial history.
    await queryInterface.sequelize.query(
      `
      ALTER TABLE keu_import_batch ADD COLUMN hash_payload VARCHAR(64);
      CREATE UNIQUE INDEX keu_import_batch_payload_unique ON keu_import_batch (jenis_data, hash_payload)
        WHERE hash_payload IS NOT NULL AND status_batch <> 'Dibatalkan';
      CREATE UNIQUE INDEX keu_anggaran_current_source_unique ON keu_anggaran
      (kode_referensi_sumber, periode_mulai, periode_selesai, COALESCE(id_akun, ''))
      WHERE is_current = true AND kode_referensi_sumber IS NOT NULL AND kode_referensi_sumber <> '';
      CREATE FUNCTION keu_guard_master_identity() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_TABLE_NAME = 'keu_kelompok_kas' THEN
          IF NEW.kode_kelompok IS DISTINCT FROM OLD.kode_kelompok THEN
            RAISE EXCEPTION 'Kode kelompok kas tidak boleh diubah' USING ERRCODE = '23514';
          END IF;
        ELSE
          IF NEW.kode_akun IS DISTINCT FROM OLD.kode_akun THEN
            RAISE EXCEPTION 'Kode akun tidak boleh diubah' USING ERRCODE = '23514';
          END IF;
          IF NEW.id_kelompok_kas IS DISTINCT FROM OLD.id_kelompok_kas AND (
            EXISTS (SELECT 1 FROM keu_rekap_harian WHERE id_akun = OLD.id_akun) OR
            EXISTS (SELECT 1 FROM keu_target WHERE id_akun = OLD.id_akun) OR
            EXISTS (SELECT 1 FROM keu_anggaran WHERE id_akun = OLD.id_akun)
          ) THEN
            RAISE EXCEPTION 'Akun yang telah digunakan tidak boleh dipindahkan kelompoknya' USING ERRCODE = '23514';
          END IF;
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER keu_akun_identity_guard BEFORE UPDATE ON keu_akun
        FOR EACH ROW EXECUTE FUNCTION keu_guard_master_identity();
      CREATE TRIGGER keu_kelompok_identity_guard BEFORE UPDATE ON keu_kelompok_kas
        FOR EACH ROW EXECUTE FUNCTION keu_guard_master_identity();
    `,
      { transaction }
    );
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `
      DROP TRIGGER IF EXISTS keu_akun_identity_guard ON keu_akun;
      DROP TRIGGER IF EXISTS keu_kelompok_identity_guard ON keu_kelompok_kas;
      DROP FUNCTION IF EXISTS keu_guard_master_identity();
      DROP INDEX IF EXISTS keu_anggaran_current_source_unique;
      DROP INDEX IF EXISTS keu_import_batch_payload_unique;
      ALTER TABLE keu_import_batch DROP COLUMN hash_payload;
    `,
      { transaction }
    );
  });
};
