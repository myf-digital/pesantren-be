'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './orang.tua.wali.model';
import AreaProvince from '../../area/provinces.model';
import AreaRegency from '../../area/regencies.model';
import AreaDistrict from '../../area/districts.model';
import AreaSubDistrict from '../../area/subdistricts.model';
//import Santri from '../santri/santri.model';


export default class Repository {
  public list(data: any) {
    let query: Object = {
      order: [['created_at', 'DESC']],
      where: {
        is_deleted: false,
      },
    };
    return Model.findAll({
      ...query,
      include: [
        {
          model: AreaProvince,
          as: 'province',
          required: true,
          attributes: ['name'],
        },
        {
          model: AreaRegency,
          as: 'city',
          required: true,
          attributes: ['name'],
        },
        {
          model: AreaDistrict,
          as: 'district',
          required: true,
          attributes: ['name'],
        },
        {
          model: AreaSubDistrict,
          as: 'sub_district',
          required: true,
          attributes: ['name'],
        },
      ],
    });
  }

  public index(data: any) {
    let query: Object = {
      order: [['created_at', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
      where: {
        is_deleted: false,
      },
    };
    if (data?.keyword && data?.keyword != undefined) {
      query = {
        ...query,
        where: {
          [Op.or]: [
            { nama_wali: { [Op.like]: `%${data?.keyword}%` } },
            // Sequelize.where(Sequelize.col('santri.nama_santri'), {
            //   [Op.like]: `%${data?.keyword}%`,
            // }),
          ],
        },
      };
    }
    return Model.findAndCountAll({
      ...query,
      include: [
        {
          model: AreaProvince,
          as: 'province',
          required: false,
          attributes: ['name'],
        },
        {
          model: AreaRegency,
          as: 'city',
          required: false,
          attributes: ['name'],
        },
        {
          model: AreaDistrict,
          as: 'district',
          required: false,
          attributes: ['name'],
        },
        {
          model: AreaSubDistrict,
          as: 'sub_district',
          required: false,
          attributes: ['name'],
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
          model: AreaProvince,
          as: 'province',
          required: true,
          attributes: ['id','name'],
        },
        {
          model: AreaRegency,
          as: 'city',
          required: true,
          attributes: ['id','name'],
        },
        {
          model: AreaDistrict,
          as: 'district',
          required: true,
          attributes: ['id','name'],
        },
        {
          model: AreaSubDistrict,
          as: 'sub_district',
          required: true,
          attributes: ['id','name'],
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
