'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './lembaga.pendidikan.kepesantrenan.model';
import Cabang from '../cabang/cabang.model';

export default class Repository {
  public list(data: any) {
    let query: Object = {
      order: [['id_lembaga', 'DESC']],
      include: [
        {
          model: Cabang,
          as: 'cabang',
          attributes: ['id_cabang', 'nama_cabang', 'alamat'],
          required: false,
        },
      ],
    };

    const keyword = data?.keyword ? `%${data.keyword}%` : null;

    if (keyword) {
      query = {
        ...query,
        where: {
          nama_lembaga: { [Op.like]: keyword },
        },
      };
    }

    return Model.findAll(query);
  }

  public async index(data: any) {
    let query: Object = {
      order: [['id_lembaga', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
      distinct: true,
      subQuery: false,
      include: [
        {
          model: Cabang,
          as: 'cabang',
          attributes: ['id_cabang', 'nama_cabang', 'alamat'],
          required: false,
        },
      ],
    };

    const keyword = data?.keyword ? `%${data.keyword}%` : null;

    if (keyword) {
      query = {
        ...query,
        where: {
          [Op.or]: [
            { id_lembaga: { [Op.like]: keyword } },
            { nama_lembaga: { [Op.like]: keyword } },
            { keterangan: { [Op.like]: keyword } },
            { '$cabang.nama_cabang$': { [Op.like]: keyword } },
          ],
        },
      };

      return await Model.findAndCountAll(query);
    }

    return Model.findAndCountAll(query);
  }

  public detail(condition: any) {
    return Model.findOne({
      include: [
        {
          model: Cabang,
          as: 'cabang',
          attributes: ['id_cabang', 'nama_cabang', 'alamat'],
          required: false,
        },
      ],
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
