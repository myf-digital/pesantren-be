import { z } from 'zod';

export const type = ['FORMAL', 'PESANTREN'];
export const tingkatSchema = z.object({
  tingkat: z.string().nonempty('Tingkat wajib diisi'),
  keterangan: z.any(),
  tingkat_type: z.enum(type, `Tipe wajib ${type.join('/')}`),
  nomor_urut: z
    .number('Nomor Urut harus angka')
    .min(1, 'Nomor Urut wajib diisi'),
});
