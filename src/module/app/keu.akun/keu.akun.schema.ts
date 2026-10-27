import { z } from 'zod';

export const keuAkunSchema = z.object({
  kode_akun: z.string().trim().min(1, 'Kode Akun wajib diisi').max(50),
  nama_akun: z.string().trim().min(1, 'Nama Akun wajib diisi').max(200),
  id_kelompok_kas: z.preprocess(
    (value: any) => (value && typeof value === 'object' ? value.value : value),
    z.string().trim().min(1, 'Kelompok Kas wajib diisi').max(255)
  ),
  is_periodik_tahun_ajaran: z.boolean().default(false),
  urutan: z.number().int().min(-2147483648).max(2147483647).default(0),
  is_active: z.boolean().default(true),
  keterangan: z.string().nullable().optional(),
});

export const updateKeuAkunSchema = keuAkunSchema
  .extend({
    urutan: z.number().int().min(-2147483648).max(2147483647),
    is_active: z.boolean(),
    is_periodik_tahun_ajaran: z.boolean(),
  })
  .partial();
