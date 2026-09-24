'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './jurnal.kelas.model';
import AppResource from '../resource/resource.model';
import KelasFormal from '../kelas.formal/kelas.formal.model';
import KelasMda from '../kelas.mda/kelas.mda.model';
import JamPelajaran from '../jam.pelajaran/jam.pelajaran.model';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';
import LembagaPendidikanKepesantrenan from '../lembaga.pendidikan.kepesantrenan/lembaga.pendidikan.kepesantrenan.model';
import { getUserContextData } from '../../../context/userContext';
import JadwalPelajaran from '../jadwal.pelajaran/jadwal.pelajaran.model';

export default class Repository {
  public async findActiveJurnal(criteria: {
    id_petugas: string;
    tanggal: string;
    id_lokasi: string;
    id_jam_pelajaran: string;
  }) {
    return await Model.findOne({
      where: {
        id_petugas: criteria.id_petugas,
        tanggal: criteria.tanggal,
        id_lokasi: criteria.id_lokasi,
        id_jam_pelajaran: criteria.id_jam_pelajaran,
        jam_selesai: null,
      },
    });
  }

  public async findOrCreateJurnal(data: {
    id_petugas: string;
    id_lokasi: string;
    id_jam_pelajaran: string;
    tanggal: string;
    jam_mulai: string;
    created_by?: string | null;
    id_jadwal?: string | null;
  }) {
    let active = await this.findActiveJurnal({
      id_petugas: data.id_petugas,
      tanggal: data.tanggal,
      id_lokasi: data.id_lokasi,
      id_jam_pelajaran: data.id_jam_pelajaran,
    });

    if (!active) {
      active = await Model.create({
        id_petugas: data.id_petugas,
        id_lokasi: data.id_lokasi,
        id_jam_pelajaran: data.id_jam_pelajaran,
        tanggal: data.tanggal,
        jam_mulai: data.jam_mulai,
        created_by: data.created_by,
        id_jadwal: data.id_jadwal,
      });
    }

    return active;
  }

  public async endJurnal(
    id_jurnal: string,
    id_petugas: string,
    payload: {
      materi: string | null;
      catatan: string | null;
      jam_selesai: string;
    }
  ) {
    const jurnal = await Model.findOne({
      where: {
        id_jurnal,
        id_petugas,
      },
    });

    if (!jurnal) {
      return null;
    }

    return await jurnal.update({
      jam_selesai: payload.jam_selesai,
      materi: payload.materi,
      catatan: payload.catatan,
    });
  }

  public async detail(condition: any) {
    return await Model.findOne({
      where: condition,
    });
  }

  public async index(data: any) {
    const userContext = getUserContextData();
    const idLembaga = data?.id_lembaga || userContext?.id_lembaga;

    const query: any = {
      order: [
        ['tanggal', 'DESC'],
        ['jam_mulai', 'DESC'],
      ],
      distinct: true,
      subQuery: false,
      include: [
        {
          model: AppResource,
          as: 'petugas',
          attributes: ['resource_id', 'full_name', 'username'],
        },
        {
          model: KelasFormal,
          as: 'kelasFormal',
          attributes: ['nama_kelas', 'id_lembaga'],
          include: [
            {
              model: LembagaPendidikanFormal,
              as: 'lembaga',
              attributes: ['id_lembaga', 'nama_lembaga'],
            },
          ],
        },
        {
          model: KelasMda,
          as: 'kelasMda',
          attributes: ['nama_kelas_mda', 'id_lembaga'],
          include: [
            {
              model: LembagaPendidikanKepesantrenan,
              as: 'lembaga',
              attributes: ['id_lembaga', 'nama_lembaga'],
            },
          ],
        },
        {
          model: JamPelajaran,
          as: 'jamPelajaran',
          attributes: ['nama_jampel', 'mulai', 'selesai'],
        },
        {
          model: JadwalPelajaran,
          as: 'jadwalPelajaran',
        },
      ],
      where: {},
    };

    if (data?.offset !== undefined) {
      query.offset = data.offset;
    }

    if (data?.limit !== undefined) {
      query.limit = data.limit;
    }

    const andConditions: any[] = [];

    if (data?.tanggal) {
      andConditions.push({ tanggal: data.tanggal });
    }

    if (data?.id_jam_pelajaran) {
      andConditions.push({ id_jam_pelajaran: data.id_jam_pelajaran });
    }

    if (data?.id_jadwal) {
      andConditions.push({ id_jadwal: data.id_jadwal });
    }

    if (data?.id_lokasi) {
      andConditions.push({ id_lokasi: data.id_lokasi });
    }

    if (data?.id_petugas) {
      andConditions.push({ id_petugas: data.id_petugas });
    }

    if (data?.tanggal_awal && data?.tanggal_akhir) {
      andConditions.push({
        tanggal: {
          [Op.between]: [data.tanggal_awal, data.tanggal_akhir],
        },
      });
    }

    if (idLembaga) {
      andConditions.push({
        [Op.or]: [
          { '$kelasMda.id_lembaga$': idLembaga },
          { '$kelasFormal.id_lembaga$': idLembaga },
        ],
      });
    }

    if (data?.keyword) {
      const keyword = `%${data.keyword.toLowerCase()}%`;
      andConditions.push({
        [Op.or]: [
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.cast(Sequelize.col('JurnalKelas.materi'), 'TEXT')
            ),
            {
              [Op.like]: keyword,
            }
          ),
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.cast(Sequelize.col('JurnalKelas.catatan'), 'TEXT')
            ),
            {
              [Op.like]: keyword,
            }
          ),
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('petugas.full_name')),
            {
              [Op.like]: keyword,
            }
          ),
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('kelasFormal.nama_kelas')),
            {
              [Op.like]: keyword,
            }
          ),
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('kelasMda.nama_kelas_mda')),
            {
              [Op.like]: keyword,
            }
          ),
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('jamPelajaran.nama_jampel')),
            {
              [Op.like]: keyword,
            }
          ),
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('jadwalPelajaran.hari')),
            {
              [Op.like]: keyword,
            }
          ),
        ],
      });
    }

    if (andConditions.length > 0) {
      query.where = { [Op.and]: andConditions };
    }

    return await Model.findAndCountAll(query);
  }
}

export const repository = new Repository();
