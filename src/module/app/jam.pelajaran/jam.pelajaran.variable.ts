'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'nama_jampel',
      'nomor_urut',
      'mulai',
      'selesai',
      'jumlah_jampel',
      'keterangan',
      'status',
      'id_lembaga',
      'id_jenisjam',
      'lembaga_type',
    ];
    return field;
  }
}

export const variable = new Variable();
