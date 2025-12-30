'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'nama_kelas',
      'id_lembaga',
      'id_tingkat',
      'id_tahunajaran',
      'id_wali_kelas',
      'nomor_urut',
      'keterangan',
      'status',
    ];
    return field;
  }
}

export const variable = new Variable();
