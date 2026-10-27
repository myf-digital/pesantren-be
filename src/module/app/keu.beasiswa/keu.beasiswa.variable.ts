export default class Variable {
  public fillable() {
    return [
      'cakupan_data',
      'id_tahunajaran',
      'id_santri',
      'id_jenis_beasiswa',
      'jenis_bantuan',
      'nama_program',
      'status_final',
      'tanggal_data',
      'nilai_diajukan',
      'nilai_ditetapkan',
      'nilai_realisasi',
      'id_batch',
      'is_current',
      'keterangan',
    ];
  }
}
export const variable = new Variable();
