import { QueryInterface, QueryTypes } from 'sequelize';

const nominalCheck = `
  nilai_diajukan > 0 AND nilai_diajukan <> 'NaN'::numeric
  AND COALESCE(nilai_disetujui, 0) BETWEEN 0 AND nilai_diajukan
  AND COALESCE(nilai_realisasi, 0) BETWEEN 0 AND COALESCE(nilai_disetujui, 0)
`;
const statusCheck = `
  CASE status_sumber
    WHEN 'Diajukan' THEN COALESCE(nilai_disetujui, 0) = 0 AND COALESCE(nilai_realisasi, 0) = 0
    WHEN 'Disetujui' THEN COALESCE(nilai_disetujui, 0) > 0 AND COALESCE(nilai_realisasi, 0) = 0
    WHEN 'Realisasi' THEN COALESCE(nilai_disetujui, 0) > 0 AND COALESCE(nilai_realisasi, 0) > 0
    WHEN 'Ditolak' THEN COALESCE(nilai_disetujui, 0) = 0 AND COALESCE(nilai_realisasi, 0) = 0
    ELSE FALSE
  END
`;

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `
      ALTER TABLE keu_anggaran ADD COLUMN nilai_diajukan numeric(18,2);

      UPDATE keu_anggaran
      SET nilai_diajukan = NULLIF(nilai_disetujui, 0),
          status_sumber = CASE
            WHEN LOWER(BTRIM(status_sumber)) = 'diajukan' THEN 'Diajukan'
            WHEN LOWER(BTRIM(status_sumber)) = 'disetujui' THEN 'Disetujui'
            WHEN LOWER(BTRIM(status_sumber)) = 'realisasi' THEN 'Realisasi'
            WHEN LOWER(BTRIM(status_sumber)) = 'ditolak' THEN 'Ditolak'
            WHEN nilai_realisasi > 0 THEN 'Realisasi'
            WHEN nilai_disetujui > 0 THEN 'Disetujui'
            ELSE status_sumber
          END;

      `,
      { transaction }
    );

    const invalidRows = await queryInterface.sequelize.query(
      `
      SELECT id_anggaran, status_sumber, nilai_diajukan, nilai_disetujui, nilai_realisasi,
        CASE
          WHEN nilai_diajukan IS NULL THEN 'Nilai pengajuan historis tidak tersedia'
          WHEN (${nominalCheck}) IS NOT TRUE THEN 'Nominal tidak memenuhi 0 <= realisasi <= disetujui <= diajukan'
          ELSE 'Nominal tidak sesuai dengan status sumber'
        END AS alasan
      FROM keu_anggaran
      WHERE (${nominalCheck}) IS NOT TRUE OR (${statusCheck}) IS NOT TRUE
      ORDER BY id_anggaran
      LIMIT 10
      `,
      { transaction, type: QueryTypes.SELECT }
    );
    if (invalidRows.length) {
      throw new Error(
        `Migrasi keu_anggaran dibatalkan. Periksa data sumber untuk baris bermasalah berikut (maksimal 10): ${JSON.stringify(invalidRows)}`
      );
    }

    await queryInterface.sequelize.query(
      `
      ALTER TABLE keu_anggaran
        ALTER COLUMN nilai_diajukan SET NOT NULL,
        ALTER COLUMN status_sumber SET NOT NULL,
        ALTER COLUMN nilai_disetujui DROP NOT NULL,
        ADD CONSTRAINT keu_anggaran_nominal_check CHECK (${nominalCheck}),
        ADD CONSTRAINT keu_anggaran_status_sumber_check CHECK (${statusCheck});
      `,
      { transaction }
    );
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `
      ALTER TABLE keu_anggaran
        DROP CONSTRAINT keu_anggaran_status_sumber_check,
        DROP CONSTRAINT keu_anggaran_nominal_check,
        ALTER COLUMN status_sumber DROP NOT NULL,
        DROP COLUMN nilai_diajukan;
      UPDATE keu_anggaran SET nilai_disetujui = 0 WHERE nilai_disetujui IS NULL;
      ALTER TABLE keu_anggaran ALTER COLUMN nilai_disetujui SET NOT NULL;
      `,
      { transaction }
    );
  });
};
