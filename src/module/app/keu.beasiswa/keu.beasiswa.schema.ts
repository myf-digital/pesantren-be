import { z } from 'zod';
import { nominalSchema } from '../keu.rekap.harian/keu.rekap.harian.schema';

export const jenisBantuanValues = [
  'Beasiswa',
  'Keringanan',
  'Lainnya',
] as const;
const reference = (label: string) =>
  z.preprocess(
    (value: any) => (value && typeof value === 'object' ? value.value : value),
    z.string().trim().min(1, `${label} wajib diisi`).max(255)
  );
const fields = z.object({
  cakupan_data: z.enum(['PerPenerima', 'Agregat']),
  id_tahunajaran: reference('Tahun Ajaran'),
  id_santri: z
    .preprocess(
      (value: any) =>
        value === '' || value === null
          ? null
          : value && typeof value === 'object'
            ? value.value
            : value,
      z.string().trim().min(1).max(255).nullable()
    )
    .optional(),
  id_jenis_beasiswa: reference('Jenis Beasiswa'),
  jenis_bantuan: z.enum(jenisBantuanValues),
  nama_program: z.string().trim().max(200).nullable().optional(),
  status_final: z.string().trim().min(1, 'Status Final wajib diisi').max(30),
  tanggal_data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus YYYY-MM-DD')
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, 'Tanggal tidak valid'),
  nilai_diajukan: nominalSchema.nullable().optional(),
  nilai_ditetapkan: nominalSchema.refine(
    (value) => !value.startsWith('-') || /^-0+\.00$/.test(value),
    'Nilai Ditetapkan harus >= 0'
  ),
  nilai_realisasi: nominalSchema
    .refine(
      (value) => !value.startsWith('-') || /^-0+\.00$/.test(value),
      'Nilai Realisasi tidak boleh negatif'
    )
    .nullable()
    .optional(),
  id_batch: reference('Batch').optional(),
  is_current: z.boolean(),
  keterangan: z.string().nullable().optional(),
});
export const keuBeasiswaSchema = fields
  .extend({
    is_current: z.boolean().default(true),
    cakupan_data: z.enum(['PerPenerima', 'Agregat']).default('PerPenerima'),
  })
  .refine(
    (data) => data.cakupan_data !== 'PerPenerima' || !!data.id_santri,
    'Santri wajib untuk data PerPenerima'
  )
  .refine(
    (data) => data.cakupan_data !== 'Agregat' || !data.id_santri,
    'Data Agregat tidak boleh memiliki santri'
  );
export const updateKeuBeasiswaSchema = fields.partial();
