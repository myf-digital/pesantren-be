import { z } from 'zod';

const reference = (label: string) =>
  z.preprocess(
    (value: any) => (value && typeof value === 'object' ? value.value : value),
    z.string().trim().min(1, `${label} wajib diisi`).max(255)
  );

// Keep decimal values as strings to preserve NUMERIC(18,2) precision.
export const nominalSchema = z
  .union([
    z.string(),
    z
      .number()
      .refine(
        (value) => Math.abs(value) <= Number.MAX_SAFE_INTEGER / 100,
        'Gunakan string untuk nominal besar agar presisi terjaga'
      ),
  ])
  .transform((value) => String(value).trim())
  .refine(
    (value) => /^-?\d{1,16}(\.\d{1,2})?$/.test(value),
    'Nominal harus berupa angka dengan maksimal 16 digit bulat dan 2 desimal'
  )
  .transform((value) => {
    const negative = value.startsWith('-');
    const [whole, fraction = ''] = (negative ? value.slice(1) : value).split(
      '.'
    );
    return `${negative ? '-' : ''}${whole}.${fraction.padEnd(2, '0')}`;
  });

const fields = z.object({
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus YYYY-MM-DD')
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, 'Tanggal tidak valid'),
  id_akun: reference('Akun'),
  id_tahunajaran: z
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
  saldo_awal: nominalSchema,
  masuk: nominalSchema.refine(
    (value) => !value.startsWith('-') || /^-0+\.00$/.test(value),
    'Masuk tidak boleh negatif'
  ),
  keluar: nominalSchema.refine(
    (value) => !value.startsWith('-') || /^-0+\.00$/.test(value),
    'Keluar tidak boleh negatif'
  ),
  saldo_akhir: nominalSchema,
  id_batch: reference('Batch'),
  nomor_baris_sumber: z
    .number()
    .int()
    .min(1)
    .max(2147483647)
    .nullable()
    .optional(),
  keterangan: z.string().nullable().optional(),
  is_current: z.boolean(),
});

export const keuRekapHarianSchema = fields.extend({
  is_current: z.boolean().default(true),
});
export const updateKeuRekapHarianSchema = fields.partial();
