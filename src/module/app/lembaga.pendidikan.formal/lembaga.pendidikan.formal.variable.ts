'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'nama_lembaga',
      'id_cabang',
      'keterangan',
      'jenis_lembaga',
      'status_akreditasi',
      'nomor_npsn',
    ];
    return field;
  }
}

export const variable = new Variable();
