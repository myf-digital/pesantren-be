'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'id_asrama',
      'nama_kamar',
      'lantai',
      'kapasitas',
      'id_wali_asuh',
      'status',
      'keterangan'
    ];
    return field;
  }
}

export const variable = new Variable();
