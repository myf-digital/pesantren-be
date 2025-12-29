import { z } from "zod";

export const orangTuaWaliSchema = z.object({
  nama_wali: z
    .string().nonempty("Nama Wali wajib diisi"),
    hubungan: z.string().nonempty("Hubungan wajib diisi"),
    nik: z.string(),
    pendidikan: z.string().nonempty("Pendidikan wajib diisi"),
    pekerjaan: z.string().nonempty("Pekerjaan wajib diisi"),
    penghasilan: z.string().nonempty("Penghasilan wajib diisi"),
    no_hp: z.string().nonempty("No HP wajib diisi"),
    alamat: z.string().nonempty("Alamat wajib diisi"),
    province_id: z.any(),
    city_id: z.any(),
    district_id: z.any(),
    sub_district_id: z.any(),
    keterangan: z.any(),
    id_santri: z.any(),
});