import { createHash, randomUUID } from 'crypto';
import { Transaction } from 'sequelize';
import KeuImportBatch from '../keu.import.batch/keu.import.batch.model';
import { Op } from 'sequelize';
import { getUserLogin } from '../../../context/userContext';
import { OperationalError } from './operasional';
import { jenisDataValues } from '../keu.import.batch/keu.import.batch.schema';

type ImportRow = { valid: boolean; payload: any; [key: string]: any };

// Reserve an ID for validation without writing anything during preview.
export function automaticImportBatch(jenis: (typeof jenisDataValues)[number]) {
  const id = randomUUID();
  return {
    id,
    created: false,
    hash: null as string | null,
    async checkFile(buffer: Buffer) {
      this.hash = createHash('sha256').update(buffer).digest('hex');
      if (
        await KeuImportBatch.findOne({
          where: {
            jenis_data: jenis,
            hash_file: this.hash,
            status_batch: { [Op.ne]: 'Dibatalkan' },
          },
        })
      )
        throw new OperationalError('File yang sama sudah diimpor');
    },
    preview(rows: ImportRow[]) {
      return rows.map((row) => ({
        ...row,
        payload: {
          ...row.payload,
          id_batch: row.payload.id_batch === id ? null : row.payload.id_batch,
        },
      }));
    },
    async save(
      rows: ImportRow[],
      transaction: Transaction,
      filename?: string,
      source?: string
    ) {
      const automatic = rows.filter((row) => row.payload.id_batch === id);
      if (!automatic.length) return;
      const valid = automatic.filter((row) => row.valid);
      const canonical = valid.map(({ payload }) =>
        Object.fromEntries(
          Object.keys(payload)
            .filter(
              (key) => !['id_batch', 'created_at', 'updated_at'].includes(key)
            )
            .sort()
            .map((key) => [key, payload[key]])
        )
      );
      const payloadHash = valid.length
        ? createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
        : null;
      if (
        payloadHash &&
        (await KeuImportBatch.findOne({
          where: {
            jenis_data: jenis,
            hash_payload: payloadHash,
            status_batch: { [Op.ne]: 'Dibatalkan' },
          },
          transaction,
        }))
      )
        throw new OperationalError('Data yang sama sudah diimpor');
      const starts = valid
        .map(
          ({ payload }) =>
            payload.tanggal || payload.tanggal_data || payload.periode_mulai
        )
        .filter(Boolean)
        .sort();
      const ends = valid
        .map(
          ({ payload }) =>
            payload.tanggal || payload.tanggal_data || payload.periode_selesai
        )
        .filter(Boolean)
        .sort();
      await KeuImportBatch.create(
        {
          id_batch: id,
          jenis_data: jenis,
          nama_file: filename || null,
          sumber_data: source || `Import ${jenis}`,
          status_batch: valid.length ? 'Dipublikasikan' : 'ValidasiGagal',
          hash_file: valid.length ? this.hash : null,
          hash_payload: payloadHash,
          diimpor_oleh: getUserLogin(),
          dipublikasikan_oleh: valid.length ? getUserLogin() : null,
          waktu_publikasi: valid.length ? new Date() : null,
          jumlah_baris: automatic.length,
          jumlah_valid: valid.length,
          jumlah_error: automatic.length - valid.length,
          periode_awal: starts[0] || null,
          periode_akhir: ends[ends.length - 1] || null,
        },
        { transaction }
      );
      this.created = true;
    },
  };
}
