'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = ['singkatan', 'jenis_pengujian', 'keterangan'];
    return field;
  }
}

export const variable = new Variable();
