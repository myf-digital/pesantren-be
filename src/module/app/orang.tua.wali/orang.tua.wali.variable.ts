'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'id_santri',
      'nama_wali',
      'hubungan',
      'nik',
      'pendidikan',
      'pekerjaan',
      'penghasilan',
      'no_hp',
      'alamat',
      'province_id',
      'city_id',
      'district_id',
      'sub_district_id',
      'keterangan',
    ];
    return field;
  }
}

export const variable = new Variable();
