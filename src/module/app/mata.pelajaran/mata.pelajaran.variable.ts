'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'kode_mapel',
      'nama_mapel',
      'nomor_urut',
      'kkm',
      'keterangan',
      'status',
      'id_lembaga',
      'id_kelpelajaran',
      'lembaga_type',
    ];
    return field;
  }
}

export const variable = new Variable();
