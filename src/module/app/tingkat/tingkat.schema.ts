import { z } from 'zod';

export const tingkatSchema = z.object({
  tingkat: z.string().nonempty('tingkat wajib diisi'),
  keterangan: z.any(),
  tingkat_type: z.string().nonempty('Tipe wajib diisi'),
  nomor_urut: z.number(),
});
