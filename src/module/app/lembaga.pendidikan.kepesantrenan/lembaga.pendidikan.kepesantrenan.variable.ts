'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = ['nama_lembaga', 'id_cabang', 'keterangan'];
    return field;
  }
}

export const variable = new Variable();
