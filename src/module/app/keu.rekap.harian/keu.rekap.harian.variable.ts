export default class Variable {
  public fillable() {
    return [
      'tanggal',
      'id_akun',
      'id_tahunajaran',
      'saldo_awal',
      'masuk',
      'keluar',
      'saldo_akhir',
      'id_batch',
      'nomor_baris_sumber',
      'keterangan',
      'is_current',
    ];
  }
}
export const variable = new Variable();
