'use strict';

export class Variable {
  /**
   * Kolom yang diizinkan untuk diisi (Whitelist)
   * Sesuai dengan Model KasusPelanggaranSantri
   */
  public fillable() {
    return [
      'id_kasus',
      'nomor_kasus',
      'jenis',
      
      // Relasi Utama
      'id_santri',
      'id_pelanggaran_remisi',
      'id_lokasi',
      
      // Waktu Kejadian
      'tanggal_kejadian',
      
      // Sistem Skor
      'skor_master_snapshot',
      'skor_diberikan',
      'alasan_penyesuaian_skor',
      
      // Detail Kejadian & Hukuman
      'kronologi',
      'punishment_detail',
      'foto_bukti',
      
      // Surat Peringatan (SP)
      'level_sp',
      'nomor_surat_sp',
      'foto_dokumen_sp',
      
      // Status & Petugas Terkait
      'status_progress',
      'id_petugas_pelapor',
      'id_petugas_penanggung_jawab',
      
      // Timestamps & Audit Log
      'created_at',
      'updated_at',
      'deleted_at',
    ];
  }
}

export const variable = new Variable();