'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './jenis.guru.model';
import Pegawai from '../pegawai/pegawai.model';
import Tingkat from '../tingkat/tingkat.model';
import MataPelajaran from '../mata.pelajaran/mata.pelajaran.model';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';
import LembagaPendidikanKepesantrenan from '../lembaga.pendidikan.kepesantrenan/lembaga.pendidikan.kepesantrenan.model';
import { getUserContextData } from '../../../context/userContext';

export default class Repository {
  public list(data: any) {
    let query: any = {
      order: [
        [Sequelize.col('pegawai.nama_lengkap'), 'ASC'],
        [Sequelize.col('mata_pelajaran.nama_mapel'), 'ASC'],
      ],
    };
    if (data?.nama_jenis_guru !== undefined && data?.nama_jenis_guru != null) {
      query = {
        ...query,
        where: {
          nama_jenis_guru: { [Op.like]: `%${data?.nama_jenis_guru}%` },
        },
      };
    }

    if (data?.lembaga_type) {
      query.where = { ...query.where, lembaga_type: data.lembaga_type };
    }
    if (data?.id_tingkat) {
      query.where = { ...query.where, id_tingkat: data.id_tingkat };
    }
    if (data?.id_guru) {
      query.where = { ...query.where, id_guru: data.id_guru };
    }

    const userContext = getUserContextData();
    if (userContext && userContext?.id_lembaga) {
      query = {
        ...query,
        where: {
          ...query.where,
          id_lembaga: userContext?.id_lembaga,
        },
      };
    }

    return Model.findAll({
      ...query,
      include: [
        {
          model: Pegawai,
          as: 'pegawai',
          required: false,
          attributes: ['id_pegawai', 'nama_lengkap', 'nip'],
        },
        {
          model: Tingkat,
          as: 'tingkat',
          required: false,
          attributes: ['id_tingkat', 'tingkat'],
        },
        {
          model: MataPelajaran,
          as: 'mata_pelajaran',
          required: false,
          attributes: ['id_mapel', 'nama_mapel'],
        },
        {
          model: LembagaPendidikanFormal,
          as: 'lembaga_formal',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
        },
        {
          model: LembagaPendidikanKepesantrenan,
          as: 'lembaga_kepesantrenan',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
        },
      ],
    });
  }

  public index(data: any) {
    let query: any = {
      order: [['nomor_urut', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
    };
    if (data?.keyword && data?.keyword != undefined) {
      const keyword = `%${data.keyword.toLowerCase()}%`;
      query = {
        ...query,
        where: {
          [Op.or]: [
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('JenisGuru.nama_jenis_guru')),
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
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('tingkat.tingkat')),
              {
                [Op.like]: keyword,
              }
            ),
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('mata_pelajaran.nama_mapel')),
              {
                [Op.like]: keyword,
              }
            ),
            Sequelize.where(
              Sequelize.fn(
                'LOWER',
                Sequelize.col('lembaga_formal.nama_lembaga')
              ),
              {
                [Op.like]: keyword,
              }
            ),
            Sequelize.where(
              Sequelize.fn(
                'LOWER',
                Sequelize.col('lembaga_kepesantrenan.nama_lembaga')
              ),
              {
                [Op.like]: keyword,
              }
            ),
          ],
        },
      };
    }

    const userContext = getUserContextData();
    if (userContext && userContext?.id_lembaga) {
      query = {
        ...query,
        where: {
          ...query.where,
          id_lembaga: userContext?.id_lembaga,
        },
      };
    }

    return Model.findAndCountAll({
      ...query,
      include: [
        {
          model: Pegawai,
          as: 'pegawai',
          required: false,
          attributes: ['id_pegawai', 'nama_lengkap', 'nip'],
        },
        {
          model: Tingkat,
          as: 'tingkat',
          required: false,
          attributes: ['id_tingkat', 'tingkat'],
        },
        {
          model: MataPelajaran,
          as: 'mata_pelajaran',
          required: false,
          attributes: ['id_mapel', 'nama_mapel'],
        },
        {
          model: LembagaPendidikanFormal,
          as: 'lembaga_formal',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
        },
        {
          model: LembagaPendidikanKepesantrenan,
          as: 'lembaga_kepesantrenan',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
        },
      ],
    });
  }

  public detail(condition: any) {
    return Model.findOne({
      where: condition,
      include: [
        {
          model: Pegawai,
          as: 'pegawai',
          required: false,
          attributes: ['id_pegawai', 'nama_lengkap', 'nip'],
        },
        {
          model: Tingkat,
          as: 'tingkat',
          required: false,
          attributes: ['id_tingkat', 'tingkat'],
        },
        {
          model: MataPelajaran,
          as: 'mata_pelajaran',
          required: false,
          attributes: ['id_mapel', 'nama_mapel'],
        },
        {
          model: LembagaPendidikanFormal,
          as: 'lembaga_formal',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
        },
        {
          model: LembagaPendidikanKepesantrenan,
          as: 'lembaga_kepesantrenan',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
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
