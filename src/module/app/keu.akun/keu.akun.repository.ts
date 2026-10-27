import { FindOptions, Op } from 'sequelize';
import Model from './keu.akun.model';

const options = (data: any = {}): FindOptions => {
  const where: any = {};
  const keyword = data.keyword || data.q;
  if (keyword)
    where[Op.or] = [
      { kode_akun: { [Op.iLike]: `%${keyword}%` } },
      { nama_akun: { [Op.iLike]: `%${keyword}%` } },
      { keterangan: { [Op.iLike]: `%${keyword}%` } },
    ];
  if (data.id_kelompok_kas) where.id_kelompok_kas = data.id_kelompok_kas;
  const periodik = data.is_periodik_tahun_ajaran;
  if ([true, 'true', '1', 'Ya'].includes(periodik))
    where.is_periodik_tahun_ajaran = true;
  else if ([false, 'false', '0', 'Tidak'].includes(periodik))
    where.is_periodik_tahun_ajaran = false;
  const active =
    data.is_active !== undefined && data.is_active !== ''
      ? data.is_active
      : data.status;
  if (active !== undefined && active !== '') {
    if ([true, 'true', '1', 'Ya'].includes(active)) where.is_active = true;
    else if ([false, 'false', '0', 'Tidak'].includes(active))
      where.is_active = false;
  }
  return {
    where,
    include: [{ association: 'kelompok_kas' }],
    order: [
      ['urutan', 'ASC'],
      ['kode_akun', 'ASC'],
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
    return Model.findOne({
      where: condition,
      include: [{ association: 'kelompok_kas' }],
    });
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
