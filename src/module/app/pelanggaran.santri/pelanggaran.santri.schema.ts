import { z } from 'zod';

export const kasusPelanggaranSantriSchema = z.object({
  nomor_kasus: z.string().min(1, 'Nomor kasus wajib diisi'),
  
  id_santri: z.string().min(1, 'Santri wajib dipilih'),
  
  id_pelanggaran_remisi: z.string().min(1, 'Pelanggaran/Remisi wajib dipilih'),
  
  id_lokasi: z.string().min(1, 'Lokasi kejadian wajib dipilih'),

  jenis: z.enum(['Pelanggaran', 'Remisi'], { message: 'Jenis (Pelanggaran/Remisi) wajib dikirim' }),
  
  tanggal_kejadian: z.coerce.date({message: 'Tanggal kejadian tidak valid' }),

  skor_master_snapshot: z.number({ 
    message: 'Skor master snapshot wajib diisi dan harus berupa angka' 
  }),

  skor_diberikan: z.number({ 
    message: 'Skor yang diberikan wajib diisi dan harus berupa angka' 
  }),

  alasan_penyesuaian_skor: z.string().nullable().optional(),
  
  kronologi: z.string().nullable().optional(),
  
  punishment_detail: z.string().nullable().optional(),
  
  foto_bukti: z.string().nullable().optional(),
  
  level_sp: z.enum(['SP1', 'SP2', 'SP3']).nullable().optional(),
  
  nomor_surat_sp: z.string().nullable().optional(),
  
  foto_dokumen_sp: z.string().nullable().optional(),
  
  status_progress: z.enum(['Proses', 'Selesai', 'Batal']).default('Proses'),
  
  id_petugas_pelapor: z.string().nullable().optional(),
  
  id_petugas_penanggung_jawab: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  
  // ---------------------------------------------------------
  // RULE 1: Aturan Khusus "Remisi"
  // ---------------------------------------------------------
  if (data.jenis === 'Remisi') {
    // A. Field yang harus kosong/null jika Remisi
    if (data.level_sp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Level SP harus kosong untuk data Remisi',
        path: ['level_sp'],
      });
    }
    if (data.nomor_surat_sp && data.nomor_surat_sp.trim() !== '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nomor Surat SP harus kosong untuk data Remisi',
        path: ['nomor_surat_sp'],
      });
    }
    if (data.foto_dokumen_sp && data.foto_dokumen_sp.trim() !== '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Foto Dokumen SP harus kosong untuk data Remisi',
        path: ['foto_dokumen_sp'],
      });
    }
    if (data.punishment_detail && data.punishment_detail.trim() !== '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Detail Hukuman (Punishment) harus kosong untuk data Remisi',
        path: ['punishment_detail'],
      });
    }
    
    // B. Status Progress otomatis harus Selesai
    if (data.status_progress !== 'Selesai') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Status Progress harus "Selesai" untuk pemberian Remisi',
        path: ['status_progress'],
      });
    }
  }

  // ---------------------------------------------------------
  // RULE 2: Aturan Surat Peringatan (Hanya berlaku untuk Pelanggaran)
  // ---------------------------------------------------------
  if (data.jenis === 'Pelanggaran') {
    if (data.level_sp) {
      // Jika ada SP -> Nomor & Foto Wajib
      if (!data.nomor_surat_sp || data.nomor_surat_sp.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nomor Surat SP wajib diisi karena Level SP dipilih',
          path: ['nomor_surat_sp'],
        });
      }
      if (!data.foto_dokumen_sp || data.foto_dokumen_sp.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Foto Dokumen SP wajib diunggah karena Level SP dipilih',
          path: ['foto_dokumen_sp'],
        });
      }
    } else {
      // Jika tidak ada SP -> Nomor & Foto Harus Kosong
      if (data.nomor_surat_sp && data.nomor_surat_sp.trim() !== '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nomor Surat SP harus dikosongkan karena tidak ada Level SP yang dipilih',
          path: ['nomor_surat_sp'],
        });
      }
      if (data.foto_dokumen_sp && data.foto_dokumen_sp.trim() !== '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Foto Dokumen SP harus dikosongkan karena tidak ada Level SP yang dipilih',
          path: ['foto_dokumen_sp'],
        });
      }
    }
  }

  // ---------------------------------------------------------
  // RULE 3: Validasi Penyesuaian Skor (Berlaku untuk Keduanya)
  // ---------------------------------------------------------
  if (data.skor_master_snapshot !== data.skor_diberikan) {
    if (!data.alasan_penyesuaian_skor || data.alasan_penyesuaian_skor.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Alasan wajib diisi karena skor yang diberikan (' + data.skor_diberikan + ') berbeda dengan skor referensi master (' + data.skor_master_snapshot + ')',
        path: ['alasan_penyesuaian_skor'],
      });
    }
  }
});

export type KasusPelanggaranSantriInput = z.infer<typeof kasusPelanggaranSantriSchema>;