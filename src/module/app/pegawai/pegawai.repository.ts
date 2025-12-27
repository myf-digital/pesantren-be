'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './pegawai.model';
import OrganitationUnit from '../organitation.unit/organitation.unit.model';
import Jabatan from '../jabatan/jabatan.model';

export default class Repository {
  public list(data: any) {
    let query: Object = {
      order: [['id_pegawai', 'DESC']],
      include: [
        {
          model: OrganitationUnit,
          as: 'organitationUnit',
          attributes: ['id_orgunit', 'nama_orgunit'],
          required: false,
        },
        {
          model: Jabatan,
          as: 'jabatan',
          attributes: ['id_jabatan', 'nama_jabatan'],
          required: false,
        },
      ],
    };

    const keyword = data?.keyword ? `%${data.keyword}%` : null;

    if (keyword) {
      query = {
        ...query,
        where: {
          nama_orgunit: { [Op.like]: keyword },
        },
      };
    }

    return Model.findAll(query);
  }

  public async index(data: any) {
    let query: Object = {
      order: [['id_orgunit', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
      distinct: true,
      subQuery: false,
      include: [
        {
          model: OrganitationUnit,
          as: 'organitationUnit',
          attributes: ['id_orgunit', 'nama_orgunit'],
          required: false,
        },
        {
          model: Jabatan,
          as: 'jabatan',
          attributes: ['id_jabatan', 'nama_jabatan'],
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
            { nama_pegawai: { [Op.like]: keyword } },
            { nik: { [Op.like]: keyword } },
            { nip: { [Op.like]: keyword } },
            { email: { [Op.like]: keyword } },
            { no_hp: { [Op.like]: keyword } },
            { jenis_kelamin: { [Op.like]: keyword } },
            { tempat_lahir: { [Op.like]: keyword } },
            { tanggal_lahir: { [Op.like]: keyword } },
            { umur: { [Op.like]: keyword } },
            { alamat: { [Op.like]: keyword } },
            { pendidikan: { [Op.like]: keyword } },
            { bidang_ilmu: { [Op.like]: keyword } },
            { status_pegawai: { [Op.like]: keyword } },
            { tmt: { [Op.like]: keyword } },
            { '$orgunit.nama_orgunit$': { [Op.like]: keyword } },
            { '$jabatan.nama_jabatan$': { [Op.like]: keyword } },
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
          as: 'organitationUnit',
          attributes: ['id_orgunit', 'nama_orgunit'],
          required: false,
        },
        {
          model: Jabatan,
          as: 'jabatan',
          attributes: ['id_jabatan', 'nama_jabatan'],
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
