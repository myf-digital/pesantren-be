import { z } from 'zod';

export const jenisBeasiswaSchema = z.object({
  kode_beasiswa: z
    .string()
    .nonempty('Kode Beasiswa wajib diisi')
    .max(20, {
      message: 'Panjang teks Kode Beasiswa maksimal 20 karakter',
    })
    .regex(/^[a-zA-Z0-9]+$/, {
      message: 'Kode Beasiswa mengandung karakter ilegal',
    }),
  nama_beasiswa: z.string().nonempty('Nama Beasiswa wajib diisi').max(150, {
    message: 'Panjang teks Nama Beasiswa maksimal 150 karakter',
  }),
  keterangan: z.any(),
  status: z.string().nonempty('Status wajib diisi'),
});
