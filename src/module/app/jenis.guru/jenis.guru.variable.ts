'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'nama_jenis_guru',
      'nomor_urut',
      'keterangan',
      'status',
      'id_guru',
      'id_mapel',
      'id_lembaga',
      'lembaga_type',
      'id_tingkat',
    ];
    return field;
  }
}

export const variable = new Variable();
