import { FindOptions, Op } from 'sequelize';
import Model from './keu.beasiswa.model';

const include = [
  { association: 'batch' },
  { association: 'tahun_ajaran' },
  { association: 'santri' },
  { association: 'jenis_beasiswa' },
];
const options = (data: any = {}): FindOptions => {
  const where: any = {};
  for (const field of [
    'cakupan_data',
    'id_tahunajaran',
    'id_santri',
    'id_jenis_beasiswa',
    'jenis_bantuan',
    'status_final',
    'id_batch',
    'tanggal_data',
  ]) {
    if (data[field]) where[field] = data[field];
  }
  if (!data.tanggal_data && (data.tanggal_awal || data.tanggal_akhir)) {
    where.tanggal_data = {
      ...(data.tanggal_awal ? { [Op.gte]: data.tanggal_awal } : {}),
      ...(data.tanggal_akhir ? { [Op.lte]: data.tanggal_akhir } : {}),
    };
  }
  if (
    data.is_current === undefined ||
    data.is_current === '' ||
    [true, 'true', '1', 'Ya'].includes(data.is_current)
  )
    where.is_current = true;
  else if ([false, 'false', '0', 'Tidak'].includes(data.is_current))
    where.is_current = false;
  const keyword = data.keyword || data.q;
  if (keyword)
    where[Op.or] = [
      { nama_program: { [Op.iLike]: `%${keyword}%` } },
      { keterangan: { [Op.iLike]: `%${keyword}%` } },
      { '$santri.nis$': { [Op.iLike]: `%${keyword}%` } },
      { '$santri.fullname$': { [Op.iLike]: `%${keyword}%` } },
      { '$jenis_beasiswa.nama_beasiswa$': { [Op.iLike]: `%${keyword}%` } },
    ];
  return {
    where,
    include,
    order: [
      ['tanggal_data', 'DESC'],
      ['created_at', 'DESC'],
      ['id_rekap_beasiswa', 'ASC'],
    ],
  };
};

export default class Repository {
  public list(data: any = {}) {
    return Model.findAll(options(data));
  }
  public index(data: any) {
    return Model.findAndCountAll({
      ...options(data),
      offset: data.offset,
      limit: data.limit,
    });
  }
  public detail(condition: any) {
    return Model.findOne({ where: condition, include });
  }
  public create(data: any) {
    return Model.create(data.payload);
  }
  public update(data: any) {
    return Model.update(data.payload, {
      where: data.condition,
      individualHooks: true,
    });
  }
  public delete(data: any) {
    return Model.destroy({ where: data.condition, individualHooks: true });
  }
}
export const repository = new Repository();
