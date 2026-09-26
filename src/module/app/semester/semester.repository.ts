'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './semester.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';

export default class Repository {
  public list(data: any) {
    let where: any = {};

    if (data?.id_tahunajaran) {
      where.id_tahunajaran = data.id_tahunajaran;
    }

    if (data?.status) {
      where.status = data.status;
    }

    return Model.findAll({
      order: [['created_at', 'DESC']],
      where,
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
    let where: any = {};

    // Filter keyword
    if (data?.keyword) {
      const keyword = `%${data.keyword.toLowerCase()}%`;
      where[Op.or] = [
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('tahun_ajaran.tahun_ajaran')),
          {
            [Op.like]: keyword,
          }
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.cast(Sequelize.col('Semester.nomor_urut'), 'TEXT')
          ),
          {
            [Op.like]: keyword,
          }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('Semester.nama_semester')),
          {
            [Op.like]: keyword,
          }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('Semester.keterangan')),
          {
            [Op.like]: keyword,
          }
        ),
      ];
    }

    // Filter status
    if (data?.status) {
      where.status = data.status;
    }

    let query: Object = {
      order: [['created_at', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
      where,
    };

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
