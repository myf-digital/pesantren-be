'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'id_santri',
      'id_kamar',
      'id_asrama',
      'id_tahunajaran',
      'tanggal_masuk',
      'tanggal_keluar',
      'status',
      'keterangan'
    ];
    return field;
  }
}

export const variable = new Variable();
