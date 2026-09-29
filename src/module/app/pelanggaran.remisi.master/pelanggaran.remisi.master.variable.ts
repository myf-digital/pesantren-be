'use strict';

export class Variable {
  /**
   * Kolom yang diizinkan untuk diisi (Whitelist)
   * Sesuai dengan Model MasterPelanggaranRemisi
   */
  public fillable() {
    return [
      'id_pelanggaran_remisi',
      'kode_pelanggaran',
      'nama_pelanggaran',
      'jenis',
      'kategori',
      'skor',
      'keterangan',
      'is_active',
      
      // Timestamps & Audit Log
      'created_at',
      'updated_at',
      'deleted_at',
    ];
  }
}

export const variable = new Variable();