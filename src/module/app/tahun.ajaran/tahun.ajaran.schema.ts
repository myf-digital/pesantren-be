import { z } from 'zod';

export const status = ['Aktif', 'Nonaktif', 'Arsip']
export const tahunAjaranSchema = z.object({
  tahun_ajaran: z
    .string()
    .nonempty('Tahun Ajaran wajib diisi')
    .regex(/^\d{4}\/\d{4}$/, 'Format Tahun Ajaran harus XXXX/XXXX')
    .refine((value) => {
      const [start, end] = value.split('/').map(Number);
      return end === start + 1;
    }, 'Tahun kedua harus tahun pertama + 1'),
  keterangan: z.any(),
  status: z.enum(status, `Status wajib ${status.join('/')}`),
});
