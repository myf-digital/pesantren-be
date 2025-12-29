'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'kode_aset',
      'nama_aset',
      'kategori',
      'jumlah',
      'kondisi',
      'lokasi',
      'sumber_aset',
      'tanggal_input',
      'keterangan',
    ];
    return field;
  }
}

export const variable = new Variable();
