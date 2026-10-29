import { z } from 'zod';

export const jenisDataValues = [
  'RekapHarian',
  'Target',
  'Anggaran',
  'Beasiswa',
] as const;
export const statusBatchValues = [
  'Draft',
  'ValidasiGagal',
  'SiapPublikasi',
  'Dipublikasikan',
  'Digantikan',
  'Dibatalkan',
] as const;
export const statusBatchSchema = z.enum(statusBatchValues);
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, 'Tanggal tidak valid');
const nullableString = (max: number) =>
  z.string().trim().max(max).nullable().optional();
const count = z.number().int().min(0).max(2147483647);
const fields = z.object({
  jenis_data: z.enum(jenisDataValues),
  nama_file: nullableString(255),
  hash_file: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? null : value,
    nullableString(128)
  ),
  periode_awal: dateOnly.nullable().optional(),
  periode_akhir: dateOnly.nullable().optional(),
  sumber_data: nullableString(200),
  status_batch: statusBatchSchema,
  jumlah_baris: count,
  jumlah_valid: count,
  jumlah_error: count,
  catatan: z.string().nullable().optional(),
  diimpor_oleh: nullableString(255),
  waktu_import: z.iso.datetime({ offset: true }).optional(),
  dipublikasikan_oleh: nullableString(255),
  waktu_publikasi: z.iso.datetime({ offset: true }).nullable().optional(),
  menggantikan_batch_id: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .nullable()
    .optional(),
});
export const keuImportBatchSchema = fields
  .extend({
    status_batch: statusBatchSchema.default('Draft'),
    jumlah_baris: count.default(0),
    jumlah_valid: count.default(0),
    jumlah_error: count.default(0),
  })
  .refine(
    (data) =>
      !data.periode_awal ||
      !data.periode_akhir ||
      data.periode_awal <= data.periode_akhir,
    'Periode awal tidak boleh melebihi periode akhir'
  );
export const updateKeuImportBatchSchema = fields.partial();
