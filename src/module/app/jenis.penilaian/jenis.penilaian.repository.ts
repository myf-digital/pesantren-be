'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './jenis.penilaian.model';

export default class Repository {
  public list(data: any) {
    let query: Object = {
      order: [['id_penilaian', 'DESC']],
    };

    if (data?.singkatan !== undefined && data?.singkatan != null) {
      query = {
        ...query,
        where: {
          singkatan: { [Op.like]: `%${data?.singkatan}%` },
        },
      };
    }

    return Model.findAll(query);
  }

  public index(data: any) {
    let query: Object = {
      order: [['id_penilaian', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
    };

    if (data?.keyword && data?.keyword != undefined) {
      query = {
        ...query,
        where: {
          [Op.or]: [
            { singkatan: { [Op.like]: `%${data?.keyword}%` } },
            { jenis_pengujian: { [Op.like]: `%${data?.keyword}%` } },
            { keterangan: { [Op.like]: `%${data?.keyword}%` } },
          ],
        },
      };
    }

    return Model.findAndCountAll(query);
  }

  public detail(condition: any) {
    return Model.findOne({
      where: {
        ...condition,
      },
    });
  }

  public async create(data: any) {
    return Model.bulkCreate(data.payload);
  }

  public update(data: any) {
    return Model.update(data?.payload, {
      where: data?.condition,
    });
  }

  public delete(data: any) {
    return Model.destroy({
      where: data?.condition,
    });
  }
}

export const repository = new Repository();
