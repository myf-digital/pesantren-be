'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'nama_orgunit',
      'parent_id',
      'level_orgunit',
      'id_cabang',
      'id_lembaga',
      'jenis_orgunit',
      'keterangan',
      'lembaga_type',
    ];
    return field;
  }
}

export const variable = new Variable();
