'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'nama_asrama',
      'jumlah_kamar',
      'id_cabang',
      'keterangan',
      'alamat',
    ];
    return field;
  }
}

export const variable = new Variable();
