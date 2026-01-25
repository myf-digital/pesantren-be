import { z } from 'zod';

export const status = ['Aktif', 'Nonaktif', 'Arsip']
export const kelasMdaSchema = z.object({
  nama_kelas_mda: z
    .string()
    .nonempty('Nama Kelas MDA wajib diisi'),
  id_lembaga: z.any(),
  id_tingkat: z.any(),
  id_tahunajaran: z.any(),
  id_wali_kelas: z.any(),
  nomor_urut: z.number('Nomor Urut harus angka').min(1, 'Nomor Urut wajib diisi'),
  keterangan: z.any(),
  status: z.enum(status, `Status wajib ${status.join('/')}`),
});
