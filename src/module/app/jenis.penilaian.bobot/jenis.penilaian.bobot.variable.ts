'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'id_penilaian',
      'lembaga_type',
      'id_lembaga',
      'id_tingkat',
      'id_tahunajaran',
      'bobot',
      'status',
    ];
    return field;
  }
}

export const variable = new Variable();
