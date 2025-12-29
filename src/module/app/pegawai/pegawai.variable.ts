'use strict';

export default class Variable {
  public fillable() {
    const field: Array<string> = [
      'id_pegawai',
      'nik',
      'nip',
      'nama_lengkap',
      'email',
      'no_hp',
      'jenis_kelamin',
      'tempat_lahir',
      'tanggal_lahir',
      'umur',
      'alamat',
      'pendidikan',
      'bidang_ilmu',
      'id_orgunit',
      'id_jabatan',
      'status_pegawai',
      'tmt',
      'foto',
    ];
    return field;
  }
}

export const variable = new Variable();
