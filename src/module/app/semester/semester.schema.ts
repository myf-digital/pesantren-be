import { z } from 'zod';

export const status = ['Aktif', 'Nonaktif', 'Arsip']
export const semesterSchema = z.object({
  nama_semester: z.string().nonempty('Nama Semester wajib diisi'),
  keterangan: z.any(),
  id_tahunajaran: z.any(),
  nomor_urut: z.number('Nomor Urut harus angka').min(1, 'Nomor Urut wajib diisi'),
  status: z.enum(status, `Status wajib ${status.join('/')}`),
});
