export default class Variable {
  public fillable() {
    return [
      'nama_target',
      'jenis_target',
      'periode_mulai',
      'periode_selesai',
      'id_akun',
      'id_tahunajaran',
      'nilai_target',
      'id_batch',
      'is_current',
      'keterangan',
    ];
  }
}
export const variable = new Variable();
