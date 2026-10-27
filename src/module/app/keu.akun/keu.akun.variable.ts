export default class Variable {
  public fillable() {
    return [
      'kode_akun',
      'nama_akun',
      'id_kelompok_kas',
      'is_periodik_tahun_ajaran',
      'urutan',
      'is_active',
      'keterangan',
    ];
  }
}

export const variable = new Variable();
