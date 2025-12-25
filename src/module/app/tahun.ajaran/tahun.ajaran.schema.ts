import { z } from "zod";

export const tahunAjaranSchema = z.object({
  tahun_ajaran: z
    .string().nonempty("tahun_ajaran wajib diisi")
    .regex(/^\d{4}\/\d{4}$/, "Format tahun_ajaran harus XXXX/XXXX")
    .refine((value) => {
      const [start, end] = value.split("/").map(Number);
      return end === start + 1;
    }, "Tahun kedua harus tahun pertama + 1"),
    keterangan: z.any(),
    status: z.string().nonempty("Status wajib diisi"),
});