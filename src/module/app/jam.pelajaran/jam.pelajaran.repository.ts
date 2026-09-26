'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './jam.pelajaran.model';
import JenisJamPelajaran from '../jenis.jampel/jenis.jampel.model';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';
import LembagaPendidikanKepesantrenan from '../lembaga.pendidikan.kepesantrenan/lembaga.pendidikan.kepesantrenan.model';
import { getUserContextData } from '../../../context/userContext';
import { sequelize } from '../../../database/connection';

export default class Repository {
  public list(data: any) {
    let where: any = {};

    if (data?.nama_jampel !== undefined && data?.nama_jampel != null && data?.nama_jampel !== '') {
      where.nama_jampel = { [Op.like]: `%${data.nama_jampel}%` };
    }

    if (data?.lembaga_type) {
      where.lembaga_type = data.lembaga_type;
    }

    if (data?.id_kelas) {
      where.id_jampel = {
        [Op.in]: Sequelize.literal(
          `(SELECT DISTINCT id_jam_pelajaran FROM jadwal_pelajaran WHERE id_kelas = ${sequelize.escape(data.id_kelas)})`
        ),
      };
    }

    const userContext = getUserContextData();
    if (userContext && userContext?.lembaga_type) {
      where.lembaga_type = userContext.lembaga_type;
    }

    return Model.findAll({
      order: [['mulai', 'ASC']],
      where,
      include: [
        {
          model: JenisJamPelajaran,
          as: 'jenis_jam_pelajaran',
          required: false,
          attributes: ['id_jenisjam', 'nama_jenis_jam', 'keterangan'],
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

    const userContext = getUserContextData();
    if (userContext && userContext?.lembaga_type) {
      query = {
        ...query,
        where: { lembaga_type: userContext?.lembaga_type },
      };
    }
    if (userContext && userContext?.id_lembaga) {
      query = {
        ...query,
        where: {
          ...query.where,
          id_lembaga: userContext?.id_lembaga,
        },
      };
    }

    if (data?.keyword && data?.keyword != undefined) {
      const keyword = `%${data.keyword.toLowerCase()}%`;
      query = {
        ...query,
        where: {
          ...query.where,
          [Op.or]: [
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('JamPelajaran.nama_jampel')),
              {
                [Op.like]: keyword,
              }
            ),
            Sequelize.where(
              Sequelize.fn(
                'LOWER',
                Sequelize.col('jenis_jam_pelajaran.nama_jenis_jam')
              ),
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
    return Model.findAndCountAll({
      ...query,
      include: [
        {
          model: JenisJamPelajaran,
          as: 'jenis_jam_pelajaran',
          required: false,
          attributes: ['id_jenisjam', 'nama_jenis_jam', 'keterangan'],
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
      where: {
        ...condition,
      },
      include: [
        {
          model: JenisJamPelajaran,
          as: 'jenis_jam_pelajaran',
          required: false,
          attributes: ['id_jenisjam', 'nama_jenis_jam', 'keterangan'],
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
