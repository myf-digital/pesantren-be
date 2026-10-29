import { z } from 'zod';
import { nominalSchema } from '../keu.rekap.harian/keu.rekap.harian.schema';

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus YYYY-MM-DD')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, 'Tanggal tidak valid');
const referenceValue = (value: any) =>
  value && typeof value === 'object' ? value.value : value;
const nonnegativeNominal = nominalSchema.refine(
  (value) => !value.startsWith('-') || /^-0+\.00$/.test(value),
  'Nominal harus >= 0'
);
const fields = z.object({
  per_akun: z.boolean().optional(),
  status_sumber: z.string().trim().max(100).nullable().optional(),
  kode_referensi_sumber: z.string().trim().max(150).nullable().optional(),
  nama_anggaran: z.string().trim().min(1, 'Nama Anggaran wajib diisi').max(200),
  periode_mulai: dateOnly,
  periode_selesai: dateOnly,
  id_akun: z
    .preprocess(
      (value: any) =>
        value === '' || value === null ? null : referenceValue(value),
      z.string().trim().min(1).max(255).nullable()
    )
    .optional(),
  nilai_disetujui: nonnegativeNominal,
  nilai_realisasi: nonnegativeNominal.nullable().optional(),
  id_batch: z
    .preprocess(
      referenceValue,
      z.string().trim().min(1, 'Batch wajib diisi').max(255)
    )
    .optional(),
  is_current: z.boolean(),
  keterangan: z.string().nullable().optional(),
});
export const keuAnggaranSchema = fields
  .extend({ is_current: z.boolean().default(true) })
  .refine(
    (data) => data.periode_mulai <= data.periode_selesai,
    'Periode mulai tidak boleh melebihi periode selesai'
  )
  .refine(
    (data) => !data.per_akun || !!data.id_akun,
    'Akun wajib untuk anggaran per akun'
  );
export const updateKeuAnggaranSchema = fields
  .partial()
  .refine(
    (data) =>
      !data.periode_mulai ||
      !data.periode_selesai ||
      data.periode_mulai <= data.periode_selesai,
    'Periode mulai tidak boleh melebihi periode selesai'
  );
