export default class Variable {
  public fillable() {
    return [
      'jenis_data',
      'nama_file',
      'hash_file',
      'periode_awal',
      'periode_akhir',
      'sumber_data',
      'status_batch',
      'jumlah_baris',
      'jumlah_valid',
      'jumlah_error',
      'catatan',
      'diimpor_oleh',
      'waktu_import',
      'dipublikasikan_oleh',
      'waktu_publikasi',
      'menggantikan_batch_id',
    ];
  }
}
export const variable = new Variable();
