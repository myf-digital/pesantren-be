import { z } from 'zod';
export const status = ['Aktif', 'Nonaktif']
export const statusAwalSantriSchema = z.object({
  kode_status_awal: z
    .string()
    .nonempty('Kode Status Awal wajib diisi')
    .max(10, {
      message: 'Panjang teks Kode Status Awal maksimal 10 karakter',
    })
    .regex(/^[a-zA-Z0-9]+$/, {
      message: 'Kode Status Awal mengandung karakter ilegal',
    }),
  nama_status_awal: z.string().nonempty('Nama Status Awal wajib diisi'),
  keterangan: z.any(),
  status: z.enum(status, `Status wajib ${status.join('/')}`),
});
