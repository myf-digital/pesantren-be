'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './kelompok.pelajaran.model';

export default class Repository {
  public list(condition: any) {
    return Model.findAll({
      where: {
        ...condition,
        status: 'A',
      },
      order: [['nomor_urut', 'DESC']],
    });
  }

  public index(data: any) {
    let query: Object = {
      where: {
        parent_id: {
          [Op.is]: null,
        },
      },
      order: [['nomor_urut', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
    };
    if (data?.keyword && data?.keyword != undefined) {
      query = {
        ...query,
        where: {
          parent_id: {
            [Op.is]: null,
          },
          [Op.or]: [
            { nama_kelpelajaran: { [Op.like]: `%${data?.keyword}%` } },
            Sequelize.where(
              Sequelize.cast(Sequelize.col('nomor_urut'), 'TEXT'),
              { [Op.like]: `%${data?.keyword}%` }
            ),
            { keterangan: { [Op.like]: `%${data?.keyword}%` } },
          ],
        },
      };
    }
    return Model.findAndCountAll({
      ...query,
      include: [
        {
          model: Model,
          as: 'children',
          required: false,
        },
      ],
    });
  }

  public detail(condition: any) {
    return Model.findOne({
      where: {
        ...condition,
      },
      include: [
        {
          model: Model,
          as: 'parent',
          required: false,
        },
      ],
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
