'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './jenis.guru.model';
import Pegawai from '../pegawai/pegawai.model';
import Tingkat from '../tingkat/tingkat.model';
import MataPelajaran from '../mata.pelajaran/mata.pelajaran.model';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';

export default class Repository {
  public list(data: any) {
    let query: Object = {
      order: [['nomor_urut', 'DESC']],
    };
    if (data?.nama_jenis_guru !== undefined && data?.nama_jenis_guru != null) {
      query = {
        ...query,
        where: {
          nama_jenis_guru: { [Op.like]: `%${data?.nama_jenis_guru}%` },
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
            { nama_jenis_guru: { [Op.like]: `%${data?.keyword}%` } },
            Sequelize.where(
              Sequelize.col('pegawai.nama_lengkap'),
              { [Op.like]: `%${data?.keyword}%` }
            ),
            Sequelize.where(
              Sequelize.col('tingkat.tingkat'),
              { [Op.like]: `%${data?.keyword}%` }
            ),
            Sequelize.where(
              Sequelize.col('mata_pelajaran.nama_mapel'),
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
