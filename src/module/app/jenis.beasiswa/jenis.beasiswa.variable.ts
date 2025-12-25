'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'kode_beasiswa',
      'nama_beasiswa',
      'keterangan',
      'status',
    ];
    return field;
  }
}

export const variable = new Variable();
