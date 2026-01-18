'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './kelas.formal.model';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';
import Tingkat from '../tingkat/tingkat.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';
import Pegawai from '../pegawai/pegawai.model';

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
          model: LembagaPendidikanFormal,
          as: 'lembaga',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
        },
        {
          model: Tingkat,
          as: 'tingkat',
          required: false,
          attributes: ['id_tingkat', 'tingkat'],
        },
        {
          model: TahunAjaran,
          as: 'tahun_ajaran',
          required: false,
          attributes: ['id_tahunajaran', 'tahun_ajaran'],
        },
        {
          model: Pegawai,
          as: 'pegawai',
          required: false,
          attributes: ['id_pegawai', 'nama_lengkap'],
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
            { nama_kelas_mda: { [Op.like]: `%${data?.keyword}%` } },
            Sequelize.where(
              Sequelize.cast(Sequelize.col('KelasMda.nomor_urut'), 'TEXT'),
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
          model: LembagaPendidikanFormal,
          as: 'lembaga',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
        },
        {
          model: Tingkat,
          as: 'tingkat',
          required: false,
          attributes: ['id_tingkat', 'tingkat'],
        },
        {
          model: TahunAjaran,
          as: 'tahun_ajaran',
          required: false,
          attributes: ['id_tahunajaran', 'tahun_ajaran'],
        },
        {
          model: Pegawai,
          as: 'pegawai',
          required: false,
          attributes: ['id_pegawai', 'nama_lengkap'],
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
          model: LembagaPendidikanFormal,
          as: 'lembaga',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
        },
        {
          model: Tingkat,
          as: 'tingkat',
          required: false,
          attributes: ['id_tingkat', 'tingkat'],
        },
        {
          model: TahunAjaran,
          as: 'tahun_ajaran',
          required: false,
          attributes: ['id_tahunajaran', 'tahun_ajaran'],
        },
        {
          model: Pegawai,
          as: 'pegawai',
          required: false,
          attributes: ['id_pegawai', 'nama_lengkap'],
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
