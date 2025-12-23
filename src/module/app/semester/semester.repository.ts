'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './semester.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';

export default class Repository {
  public list(data: any) {
    let query: Object = {
      order: [['created_at', 'DESC']],
    };
    if (data?.status != '') {
      query = {
        ...query,
        where: {
          status: { [Op.eq]: data?.status },
        },
      };
    }
    return Model.findAll({
      ...query,
      include: [
        {
          model: TahunAjaran,
          as: 'tahun_ajaran',
          required: true,
          attributes: ['tahun_ajaran'],
        },
      ],
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
            { nama_semester: { [Op.like]: `%${data?.keyword}%` } },
            Sequelize.where(
              Sequelize.cast(Sequelize.col('Semester.nomor_urut'), 'TEXT'),
              { [Op.like]: `%${data?.keyword}%` }
            ),
            { keterangan: { [Op.like]: `%${data?.keyword}%` } },
            Sequelize.where(Sequelize.col('tahun_ajaran.tahun_ajaran'), {
              [Op.like]: `%${data?.keyword}%`,
            }),
          ],
        },
      };
    }
    return Model.findAndCountAll({
      ...query,
      include: [
        {
          model: TahunAjaran,
          as: 'tahun_ajaran',
          required: false,
          attributes: ['tahun_ajaran'],
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
          model: TahunAjaran,
          as: 'tahun_ajaran',
          required: true,
          attributes: ['tahun_ajaran', 'id_tahunajaran'],
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
