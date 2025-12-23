import { z } from "zod";

export const semesterSchema = z.object({
  nama_semester: z
    .string().nonempty("Nama Semester wajib diisi"),
    keterangan: z.any(),
    id_tahunajaran: z.any(),
    nomor_urut: z.number(),
    status: z.string(),
});