import { z } from 'zod';

export const masterPelanggaranRemisiSchema = z
  .object({
    kode_pelanggaran: z
      .string()
      .min(1, 'Kode pelanggaran/remisi wajib diisi')
      .max(20, 'Kode maksimal 20 karakter'),

    nama_pelanggaran: z
      .string()
      .min(3, 'Nama pelanggaran/remisi minimal 3 karakter')
      .max(200, 'Nama maksimal 200 karakter'),

    jenis: z.enum(['Pelanggaran', 'Remisi']),

    kategori: z
      .enum(['Ringan', 'Sedang', 'Berat', 'Sangat Berat'])
      .optional()
      .nullable(),

    skor: z.number({
      error: (issue) => {
        if (issue.input === undefined) {
          return 'Skor wajib diisi';
        }
        return 'Skor harus berupa angka';
      },
    }),


    keterangan: z.string().optional().nullable(),

    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.jenis === 'Pelanggaran') {
        return data.skor > 0;
      }
      return true;
    },
    {
      message: 'Skor untuk jenis Pelanggaran harus bernilai positif (+)',
      path: ['skor'],
    }
  )
  .refine(
    (data) => {
      if (data.jenis === 'Remisi') {
        return data.skor < 0;
      }
      return true;
    },
    {
      message: 'Skor untuk jenis Remisi harus bernilai negatif (-)',
      path: ['skor'],
    }
  );

export type MasterPelanggaranRemisiInput = z.infer<
  typeof masterPelanggaranRemisiSchema
>;