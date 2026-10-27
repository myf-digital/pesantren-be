import { z } from 'zod';
import { nominalSchema } from '../keu.rekap.harian/keu.rekap.harian.schema';

export const jenisTargetValues = [
  'Penerimaan',
  'Pengeluaran',
  'Anggaran',
  'Lainnya',
] as const;
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus YYYY-MM-DD')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, 'Tanggal tidak valid');
const reference = z.preprocess(
  (value: any) => (value && typeof value === 'object' ? value.value : value),
  z.string().trim().min(1, 'Akun wajib diisi').max(255)
);
const optionalReference = z
  .preprocess(
    (value: any) =>
      value === '' || value === null
        ? null
        : value && typeof value === 'object'
          ? value.value
          : value,
    z.string().trim().min(1).max(255).nullable()
  )
  .optional();
const fields = z.object({
  nama_target: z.string().trim().min(1, 'Nama Target wajib diisi').max(200),
  jenis_target: z.enum(jenisTargetValues),
  periode_mulai: dateOnly,
  periode_selesai: dateOnly,
  id_akun: reference,
  id_tahunajaran: optionalReference,
  nilai_target: nominalSchema.refine(
    (value) => !value.startsWith('-') || /^-0+\.00$/.test(value),
    'Nilai Target harus >= 0'
  ),
  id_batch: optionalReference,
  is_current: z.boolean(),
  keterangan: z.string().nullable().optional(),
});
export const keuTargetSchema = fields
  .extend({ is_current: z.boolean().default(true) })
  .refine(
    (data) => data.periode_mulai <= data.periode_selesai,
    'Periode mulai tidak boleh melebihi periode selesai'
  );
export const updateKeuTargetSchema = fields
  .partial()
  .refine(
    (data) =>
      !data.periode_mulai ||
      !data.periode_selesai ||
      data.periode_mulai <= data.periode_selesai,
    'Periode mulai tidak boleh melebihi periode selesai'
  );
