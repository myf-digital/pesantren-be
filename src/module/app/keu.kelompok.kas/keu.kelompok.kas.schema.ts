import { z } from 'zod';

export const keuKelompokKasSchema = z.object({
  kode_kelompok: z.string().trim().min(1, 'Kode Kelompok wajib diisi').max(50),
  nama_kelompok: z.string().trim().min(1, 'Nama Kelompok wajib diisi').max(150),
  urutan: z.number().int().min(-2147483648).max(2147483647).default(0),
  is_active: z.boolean().default(true),
  keterangan: z.string().nullable().optional(),
});

export const updateKeuKelompokKasSchema = keuKelompokKasSchema
  .extend({
    urutan: z.number().int().min(-2147483648).max(2147483647),
    is_active: z.boolean(),
  })
  .partial();
