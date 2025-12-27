'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './cabang.model';
import AreaProvince from '../../area/provinces.model';
import AreaRegency from '../../area/regencies.model';
import AreaDistrict from '../../area/districts.model';
import AreaSubDistrict from '../../area/subdistricts.model';

export default class Repository {
  public list(data: any) {
    let query: Object = {
      order: [['id_cabang', 'DESC']],
      include: [
        {
          model: AreaProvince,
          as: 'province',
          attributes: ['id', 'name'],
          required: false,
        },
        {
          model: AreaRegency,
          as: 'city',
          attributes: ['id', 'name'],
          required: false,
        },
        {
          model: AreaDistrict,
          as: 'district',
          attributes: ['id', 'name'],
          required: false,
        },
        {
          model: AreaSubDistrict,
          as: 'subDistrict',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    };

    if (data?.cabang !== undefined && data?.cabang != null) {
      query = {
        ...query,
        where: {
          cabang: { [Op.like]: `%${data?.cabang}%` },
        },
      };
    }

    return Model.findAll(query);
  }

  public index(data: any) {
    let query: Object = {
      order: [['id_cabang', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
    };

    if (data?.keyword && data?.keyword != undefined) {
      query = {
        ...query,
        where: {
          [Op.or]: [
            { id_cabang: { [Op.like]: `%${data?.keyword}%` } },
            { nama_cabang: { [Op.like]: `%${data?.keyword}%` } },
            { keterangan: { [Op.like]: `%${data?.keyword}%` } },
            { alamat: { [Op.like]: `%${data?.keyword}%` } },
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
