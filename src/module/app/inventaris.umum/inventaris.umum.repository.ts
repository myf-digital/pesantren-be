'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './inventaris.umum.model';

export default class Repository {
  public list(data: any) {
    let query: Object = {
      order: [['created_at', 'DESC']],
    };
    if (data?.nama_aset !== undefined && data?.kode_aset != null) {
      query = {
        ...query,
        where: {
          kode_aset: { [Op.like]: `%${data?.kode_aset}%` },
        },
      };
    }
    return Model.findAll({
      ...query,
      include: [],
    });
  }

  public index(data: any) {
    let query: Object = {
      order: [['created_at', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
    };
    if (data?.keyword && data?.keyword != undefined) {
      query = {
        ...query,
        where: {
          [Op.or]: [
            { kode_aset: { [Op.like]: `%${data?.keyword}%` } },
            { nama_aset: { [Op.like]: `%${data?.keyword}%` } },
            { kategori: { [Op.like]: `%${data?.keyword}%` } },
            { keterangan: { [Op.like]: `%${data?.keyword}%` } },
          ],
        },
      };
    }
    return Model.findAndCountAll({
      ...query,
      include: [],
    });
  }

  public detail(condition: any) {
    return Model.findOne({
      where: {
        ...condition,
      },
      include: [],
    });
  }

  public async create(data: any) {
    return Model.create(data?.payload);
  }

  public update(data: any) {
    return Model.update(data?.payload, {
      where: data?.condition,
      individualHooks: true,
    });
  }

  public delete(data: any) {
    return Model.destroy({
      where: data?.condition,
      individualHooks: true,
    });
  }
}

export const repository = new Repository();
