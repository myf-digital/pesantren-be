'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './kelas.mda.model';
import LembagaPendidikanKepesantrenan from '../lembaga.pendidikan.kepesantrenan/lembaga.pendidikan.kepesantrenan.model';
import Tingkat from '../tingkat/tingkat.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';
import Pegawai from '../pegawai/pegawai.model';
import { getUserContextData } from '../../../context/userContext';

export default class Repository {
  public list(data: any) {
    let where: any = {};

    if (data?.id_tingkat) {
      where.id_tingkat = data.id_tingkat;
    }

    if (data?.status) {
      where.status = data.status;
    }

    const userContext = getUserContextData();
    if (userContext && userContext?.id_lembaga) {
      where.id_lembaga = userContext.id_lembaga;
    }

    return Model.findAll({
      order: [[Sequelize.fn('LENGTH', Sequelize.col('nama_kelas_mda')), 'ASC'], ['nama_kelas_mda', 'ASC']],
      where,
      include: [
        {
          model: LembagaPendidikanKepesantrenan,
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
    let where: any = {};

    // Filter keyword
    if (data?.keyword) {
      const keyword = `%${data.keyword.toLowerCase()}%`;
      where[Op.or] = [
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('KelasMda.nama_kelas_mda')),
          {
            [Op.like]: keyword,
          }
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.cast(Sequelize.col('KelasMda.nomor_urut'), 'TEXT')
          ),
          {
            [Op.like]: keyword,
          }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('KelasMda.keterangan')),
          {
            [Op.like]: keyword,
          }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('tahun_ajaran.tahun_ajaran')),
          {
            [Op.like]: keyword,
          }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('pegawai.nama_lengkap')),
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

    const userContext = getUserContextData();
    if (userContext && userContext?.id_lembaga) {
      where = {
        ...where,
        id_lembaga: userContext?.id_lembaga,
      };
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
          model: LembagaPendidikanKepesantrenan,
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
          model: LembagaPendidikanKepesantrenan,
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
