'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'nama_jenis_jam',
      'nomor_urut',
      'keterangan',
      'status',
      'lembaga_type',
    ];
    return field;
  }
}

export const variable = new Variable();
