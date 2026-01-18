'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './mata.pelajaran.model';
import KelompokPelajaran from '../kelompok.pelajaran/kelompok.pelajaran.model';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';

export default class Repository {
  public list(data: any) {
    let query: Object = {
      order: [['nomor_urut', 'DESC']],
    };
    if (data?.nama_mapel !== undefined && data?.nama_mapel != null) {
      query = {
        ...query,
        where: {
          nama_mapel: { [Op.like]: `%${data?.nama_mapel}%` },
        },
      };
    }
    return Model.findAll({
      ...query,
      include: [
        {
          model: KelompokPelajaran,
          as: 'kelompok_pelajaran',
          required: false,
          attributes: ['id_kelpelajaran', 'nama_kelpelajaran', 'keterangan'],
        },
        {
          model: LembagaPendidikanFormal,
          as: 'lembaga_formal',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
        },
      ],
    });
  }

  public index(data: any) {
    let query: Object = {
      order: [['nomor_urut', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
    };
    if (data?.keyword && data?.keyword != undefined) {
      query = {
        ...query,
        where: {
          [Op.or]: [
            { kode_mapel: { [Op.like]: `%${data?.keyword}%` } },
            { nama_mapel: { [Op.like]: `%${data?.keyword}%` } },
            Sequelize.where(
              Sequelize.col('kelompok_pelajaran.nama_kelpelajaran'),
              { [Op.like]: `%${data?.keyword}%` }
            ),
            Sequelize.where(
              Sequelize.col('lembaga_formal.nama_lembaga'),
              { [Op.like]: `%${data?.keyword}%` }
            ),
          ],
        },
      };
    }
    return Model.findAndCountAll({
      ...query,
      include: [
        {
          model: KelompokPelajaran,
          as: 'kelompok_pelajaran',
          required: false,
          attributes: ['nama_kelpelajaran', 'keterangan'],
        },
        {
          model: LembagaPendidikanFormal,
          as: 'lembaga_formal',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
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
          model: KelompokPelajaran,
          as: 'kelompok_pelajaran',
          required: false,
          attributes: ['nama_kelpelajaran', 'keterangan'],
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
