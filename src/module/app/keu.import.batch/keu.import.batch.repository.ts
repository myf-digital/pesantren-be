import { FindOptions, Op } from 'sequelize';
import Model from './keu.import.batch.model';
const options = (data: any = {}): FindOptions => {
  const where: any = {};
  for (const field of ['jenis_data', 'status_batch', 'menggantikan_batch_id']) {
    if (data[field]) where[field] = data[field];
  }
  if (data.keyword || data.q)
    where[Op.or] = ['nama_file', 'sumber_data', 'catatan'].map((field) => ({
      [field]: { [Op.iLike]: `%${data.keyword || data.q}%` },
    }));
  return {
    where,
    order: [
      ['waktu_import', 'DESC'],
      ['id_batch', 'ASC'],
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
    return Model.findOne({ where: condition });
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
