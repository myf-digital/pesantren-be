import { FindOptions, Op } from 'sequelize';
import Model from './keu.rekap.harian.model';

const include = [
  { association: 'batch' },
  { association: 'akun' },
  { association: 'tahun_ajaran' },
];
const options = (data: any = {}): FindOptions => {
  const where: any = {};
  for (const field of ['id_akun', 'id_tahunajaran', 'id_batch', 'tanggal']) {
    if (data[field]) where[field] = data[field];
  }
  if (!data.tanggal && (data.tanggal_awal || data.tanggal_akhir)) {
    where.tanggal = {
      ...(data.tanggal_awal ? { [Op.gte]: data.tanggal_awal } : {}),
      ...(data.tanggal_akhir ? { [Op.lte]: data.tanggal_akhir } : {}),
    };
  }
  if ([true, 'true', '1', 'Ya'].includes(data.is_current))
    where.is_current = true;
  else if ([false, 'false', '0', 'Tidak'].includes(data.is_current))
    where.is_current = false;
  const keyword = data.keyword || data.q;
  if (keyword)
    where[Op.or] = [
      { keterangan: { [Op.iLike]: `%${keyword}%` } },
      { '$akun.kode_akun$': { [Op.iLike]: `%${keyword}%` } },
      { '$akun.nama_akun$': { [Op.iLike]: `%${keyword}%` } },
    ];
  return {
    where,
    include,
    order: [
      ['tanggal', 'DESC'],
      ['created_at', 'DESC'],
      ['id_rekap', 'ASC'],
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
