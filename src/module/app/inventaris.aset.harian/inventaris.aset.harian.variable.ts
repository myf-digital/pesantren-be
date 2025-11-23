'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'id_aset',
      'id_asrama',
      'id_kamar',
      'id_biro_aset',
      'id_rumah_tangga',
      'tanggal',
      'kondisi',
      'foto_dokumentasi',
      'status_progres',
      'catatan',
      'jenis_input',
    ];
    return field;
  }
}

export const variable = new Variable();
