'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'kode_status_awal',
      'nama_status_awal',
      'keterangan',
      'status',
    ];
    return field;
  }
}

export const variable = new Variable();
