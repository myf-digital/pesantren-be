export default class Variable {
  public fillable() {
    return [
      'kode_kelompok',
      'nama_kelompok',
      'urutan',
      'is_active',
      'keterangan',
    ];
  }
}

export const variable = new Variable();
