'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'nama_jabatan',
      'id_orgunit',
      'level_jabatan',
      'sifat_jabatan',
      'kode_jabatan',
      'keterangan',
    ];
    return field;
  }
}

export const variable = new Variable();
