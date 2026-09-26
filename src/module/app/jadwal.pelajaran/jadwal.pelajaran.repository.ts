'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './jadwal.pelajaran.model';
import KelasFormal from '../kelas.formal/kelas.formal.model';
import KelasMda from '../kelas.mda/kelas.mda.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';
import Semester from '../semester/semester.model';
import JamPelajaran from '../jam.pelajaran/jam.pelajaran.model';
import JenisGuru from '../jenis.guru/jenis.guru.model';
import Lokasi from '../location/location.model';
import Pegawai from '../pegawai/pegawai.model';
import MataPelajaran from '../mata.pelajaran/mata.pelajaran.model';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';
import LembagaPendidikanKepesantrenan from '../lembaga.pendidikan.kepesantrenan/lembaga.pendidikan.kepesantrenan.model';
import { getUserContextData } from '../../../context/userContext';

export default class Repository {
  public list(data: any) {
    let where: any = {};

    if (data?.status) {
      where.status = data.status;
    }
    if (data?.id_lokasi) {
      where.id_lokasi = data.id_lokasi;
    }
    if (data?.id_lokasi_parent) {
      where['$lokasi.parent_id$'] = data.id_lokasi_parent;
    }
    if (data?.id_kelas) {
      where.id_kelas = data.id_kelas;
    }
    if (data?.id_kelas_mda) {
      where.id_kelas_mda = data.id_kelas_mda;
    }
    if (data?.id_tahunajaran) {
      where.id_tahunajaran = data.id_tahunajaran;
    }
    if (data?.id_semester) {
      where.id_semester = data.id_semester;
    }
    if (data?.hari) {
      where.hari = data.hari;
    }
    if (data?.id_pegawai) {
      where['$jenis_guru.pegawai.id_pegawai$'] = data.id_pegawai;
    }

    const userContext = getUserContextData();
    if (userContext && userContext?.id_lembaga) {
      where = {
        ...where,
        [Op.or]: [
          { '$kelas_formal.id_lembaga$': userContext?.id_lembaga },
          { '$kelas_mda.id_lembaga$': userContext?.id_lembaga },
        ],
      };
    }

    return Model.findAll({
      order: [['created_at', 'DESC']],
      where,
      include: [
        {
          model: KelasFormal,
          as: 'kelas_formal',
          required: false,
          attributes: ['id_kelas', 'nama_kelas'],
          include: [
            {
              model: LembagaPendidikanFormal,
              as: 'lembaga',
              required: false,
              attributes: ['id_lembaga', 'nama_lembaga'],
            },
          ],
        },
        {
          model: KelasMda,
          as: 'kelas_mda',
          required: false,
          attributes: ['id_kelas_mda', 'nama_kelas_mda'],
          include: [
            {
              model: LembagaPendidikanKepesantrenan,
              as: 'lembaga',
              required: false,
              attributes: ['id_lembaga', 'nama_lembaga'],
            },
          ],
        },
        {
          model: Semester,
          as: 'semester',
          required: false,
          attributes: ['id_semester', 'nama_semester'],
        },
        {
          model: TahunAjaran,
          as: 'tahun_ajaran',
          required: false,
          attributes: ['id_tahunajaran', 'tahun_ajaran'],
        },
        {
          model: JamPelajaran,
          as: 'jam_pelajaran',
          required: false,
          attributes: ['id_jampel', 'nama_jampel', 'mulai', 'selesai'],
        },
        {
          model: Lokasi,
          as: 'lokasi',
          required: false,
          attributes: ['id_lokasi', 'nama_lokasi'],
        },
        {
          model: JenisGuru,
          as: 'jenis_guru',
          required: false,
          attributes: ['id_jenisguru', 'nama_jenis_guru'],
          include: [
            {
              model: Pegawai,
              as: 'pegawai',
              required: false,
              attributes: ['id_pegawai', 'nama_lengkap', 'nip'],
            },
            {
              model: MataPelajaran,
              as: 'mata_pelajaran',
              required: false,
              attributes: ['id_mapel', 'nama_mapel'],
            },
          ],
        },
      ],
    });
  }

  public index(data: any) {
    let where: any = {};

    // Filter keyword
    if (data?.keyword) {
      where[Op.or] = [{ keterangan: { [Op.like]: `%${data?.keyword}%` } }];
    }

    // Filter status
    if (data?.status) {
      where.status = data.status;
    }

    // Filter lokasi
    if (data?.id_lokasi) {
      where.id_lokasi = data.id_lokasi;
    }

    // Filter lokasi parent
    if (data?.id_lokasi_parent) {
      where['$lokasi.parent_id$'] = data.id_lokasi_parent;
    }

    // Filter kelas formal
    if (data?.id_kelas) {
      where.id_kelas = data.id_kelas;
    }

    // Filter kelas mda
    if (data?.id_kelas_mda) {
      where.id_kelas_mda = data.id_kelas_mda;
    }

    // Filter hari
    if (data?.hari) {
      where.hari = data.hari;
    }

    // Filter guru (pegawai)
    if (data?.id_pegawai) {
      where['$jenis_guru.pegawai.id_pegawai$'] = data.id_pegawai;
    }

    const userContext = getUserContextData();
    if (userContext && userContext?.id_lembaga) {
      where = {
        ...where,
        [Op.or]: [
          { '$kelas_formal.id_lembaga$': userContext?.id_lembaga },
          { '$kelas_mda.id_lembaga$': userContext?.id_lembaga },
        ],
      };
    }

    let query: any = {
      order: [['created_at', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
      where,
    };

    return Model.findAndCountAll({
      ...query,
      include: [
        {
          model: KelasFormal,
          as: 'kelas_formal',
          required: false,
          attributes: ['id_kelas', 'nama_kelas'],
          include: [
            {
              model: LembagaPendidikanFormal,
              as: 'lembaga',
              required: false,
              attributes: ['id_lembaga', 'nama_lembaga'],
            },
          ],
        },
        {
          model: KelasMda,
          as: 'kelas_mda',
          required: false,
          attributes: ['id_kelas_mda', 'nama_kelas_mda'],
          include: [
            {
              model: LembagaPendidikanKepesantrenan,
              as: 'lembaga',
              required: false,
              attributes: ['id_lembaga', 'nama_lembaga'],
            },
          ],
        },
        {
          model: Semester,
          as: 'semester',
          required: false,
          attributes: ['id_semester', 'nama_semester'],
        },
        {
          model: TahunAjaran,
          as: 'tahun_ajaran',
          required: false,
          attributes: ['id_tahunajaran', 'tahun_ajaran'],
        },
        {
          model: JamPelajaran,
          as: 'jam_pelajaran',
          required: false,
          attributes: ['id_jampel', 'nama_jampel', 'mulai', 'selesai'],
        },
        {
          model: Lokasi,
          as: 'lokasi',
          required: false,
          attributes: ['id_lokasi', 'nama_lokasi'],
        },
        {
          model: JenisGuru,
          as: 'jenis_guru',
          required: false,
          attributes: ['id_jenisguru', 'nama_jenis_guru'],
          include: [
            {
              model: Pegawai,
              as: 'pegawai',
              required: false,
              attributes: ['id_pegawai', 'nama_lengkap', 'nip'],
            },
            {
              model: MataPelajaran,
              as: 'mata_pelajaran',
              required: false,
              attributes: ['id_mapel', 'nama_mapel'],
            },
          ],
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
          model: KelasFormal,
          as: 'kelas_formal',
          required: false,
          attributes: ['id_kelas', 'nama_kelas'],
        },
        {
          model: KelasMda,
          as: 'kelas_mda',
          required: false,
          attributes: ['id_kelas_mda', 'nama_kelas_mda'],
        },
        {
          model: JenisGuru,
          as: 'jenis_guru',
          required: false,
          attributes: [
            'id_jenisguru',
            'nama_jenis_guru',
            'id_tingkat',
            'lembaga_type',
          ],
          include: [
            {
              model: Pegawai,
              as: 'pegawai',
              required: false,
              attributes: ['id_pegawai', 'nama_lengkap', 'nip'],
            },
            {
              model: MataPelajaran,
              as: 'mata_pelajaran',
              required: false,
              attributes: ['id_mapel', 'nama_mapel'],
            },
          ],
        },
        {
          model: Semester,
          as: 'semester',
          required: false,
          attributes: ['id_semester', 'nama_semester'],
        },
        {
          model: TahunAjaran,
          as: 'tahun_ajaran',
          required: false,
          attributes: ['id_tahunajaran', 'tahun_ajaran'],
        },
        {
          model: JamPelajaran,
          as: 'jam_pelajaran',
          required: false,
          attributes: ['id_jampel', 'nama_jampel', 'mulai', 'selesai'],
        },
        {
          model: Lokasi,
          as: 'lokasi',
          required: false,
          attributes: ['id_lokasi', 'nama_lokasi'],
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
