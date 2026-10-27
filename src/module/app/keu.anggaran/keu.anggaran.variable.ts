export default class Variable {
  public fillable() {
    return [
      'status_sumber',
      'kode_referensi_sumber',
      'nama_anggaran',
      'periode_mulai',
      'periode_selesai',
      'id_akun',
      'nilai_disetujui',
      'nilai_realisasi',
      'id_batch',
      'is_current',
      'keterangan',
    ];
  }
}
export const variable = new Variable();
