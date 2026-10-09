import { z } from 'zod';

const LOKASI_TYPE = [
  'Cabang',
  'Asrama',
  'Kamar',
  'Masjid',
  'AreaMasjid',
  'SekolahFormal',
  'SekolahMDA',
  'RuangKelas',
  'RuangGuru',
  'RuangTU',
  'Perpustakaan',
  'Laboratorium',
  'GuestHouse',
  'Klinik',
  'UKS',
  'Dapur',
  'Kantin',
  'Koperasi',
  'Kantor',
  'Aula',
  'Gudang',
  'Lapangan',
  'Parkiran',
  'PosSatpam',
  'RuangRapat',
  'RuangSerbaguna',
  'Taman',
  'AreaUmum',
  'RuangMakan',
  'Lahan',
  'Workshop',
  'Studio',
  'RuangIT',
  'GedungLain',
  'AreaLain',
  'Lorong',
  'Lingkungan',
  'PosJaga',
] as const;

export const locationSchema = z.object({
  // id_lokasi: z.string().nonempty('ID Lokasi wajib diisi'),
  nama_lokasi: z.string().max(150).nonempty('Nama Lokasi wajib diisi'),
  jenis_lokasi: z.enum(LOKASI_TYPE).describe('Jenis lokasi wajib dipilih'),
  parent_id: z.string().nullable().optional(),
  id_cabang: z.string().nullable().optional(),

  // Validasi Kapasitas > 0
  kapasitas: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z
      .number()
      .positive('Kapasitas harus lebih besar dari 0')
      .optional()
      .nullable()
  ),

  // Validasi Latitude & Longitude dengan Regex
  latitude: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z
      .string()
      .regex(/^-?([1-8]?\d(\.\d+)?|90(\.0+)?)$/, 'Format Latitude tidak valid')
      .optional()
      .nullable()
  ),
  longitude: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z
      .string()
      .regex(
        /^-?((1[0-7]|[1-9])?\d(\.\d+)?|180(\.0+)?)$/,
        'Format Longitude tidak valid'
      )
      .optional()
      .nullable()
  ),

  map_zoom: z.number().optional().nullable(),
  kode_lokasi: z.string().max(50).optional().nullable(),
  qr_code: z.string().max(255).optional().nullable(),
  lantai: z.number().optional().nullable(),
  keterangan: z.string().optional().nullable(),
});

// Untuk keperluan parsing parsial saat Update
export const locationUpdateSchema = locationSchema.partial();
