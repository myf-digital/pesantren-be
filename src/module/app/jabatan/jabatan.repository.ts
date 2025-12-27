'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './jabatan.model';
import OrganitationUnit from '../organitation.unit/organitation.unit.model';

export default class Repository {
  public list(data: any) {
    let query: Object = {
      order: [['id_jabatan', 'DESC']],
      include: [
        {
          model: OrganitationUnit,
          as: 'orgunit',
          attributes: ['id_orgunit', 'nama_orgunit'],
          required: false,
        },
      ],
    };

    const keyword = data?.keyword ? `%${data.keyword}%` : null;

    if (keyword) {
      query = {
        ...query,
        where: {
          nama_jabatan: { [Op.like]: keyword },
        },
      };
    }

    return Model.findAll(query);
  }

  public async index(data: any) {
    let query: Object = {
      order: [['id_jabatan', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
      distinct: true,
      subQuery: false,
      include: [
        {
          model: OrganitationUnit,
          as: 'orgunit',
          attributes: ['id_orgunit', 'nama_orgunit'],
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
            { nama_jabatan: { [Op.like]: keyword } },
            { level_jabatan: { [Op.like]: keyword } },
            { sifat_jabatan: { [Op.like]: keyword } },
            { kode_jabatan: { [Op.like]: keyword } },
            { keterangan: { [Op.like]: keyword } },
            { '$orgunit.nama_orgunit$': { [Op.like]: keyword } },
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
          model: OrganitationUnit,
          as: 'orgunit',
          attributes: ['id_orgunit', 'nama_orgunit'],
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
