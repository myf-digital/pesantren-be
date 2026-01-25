import { z } from 'zod';

export const status = ['Aktif', 'Nonaktif']
export const kelasFormalSchema = z.object({
  nama_kelas: z.string().nonempty('Nama Kelas wajib diisi'),
  id_lembaga: z.any(),
  id_tingkat: z.any(),
  id_tahunajaran: z.any(),
  id_wali_kelas: z.any(),
  nomor_urut: z.number('Nomor Urut harus angka').min(1, 'Nomor Urut wajib diisi'),
  keterangan: z.any(),
  status: z.enum(status, `Status wajib ${status.join('/')}`),
});
