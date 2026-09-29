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

    if (data?.q || data?.keyword) {
      const kw = data?.q || data?.keyword;
      where[Op.or] = [
        { '$jenis_guru.pegawai.nama_lengkap$': { [Op.like]: `%${kw}%` } },
        { '$jenis_guru.mata_pelajaran.nama_mapel$': { [Op.like]: `%${kw}%` } },
        { keterangan: { [Op.like]: `%${kw}%` } },
      ];
    }
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

  public async indexJadwalGuru(data: any) {
    const page = Math.max(1, parseInt(data?.page || '1', 10));
    const perPage = Math.max(
      1,
      parseInt(data?.perPage || data?.limit || '10', 10)
    );
    const offset =
      data?.offset !== undefined ? data.offset : (page - 1) * perPage;
    const limit = perPage;

    let whereJadwal: any = {};
    if (data?.status) whereJadwal.status = data.status;
    if (data?.hari) whereJadwal.hari = data.hari;
    if (data?.id_lokasi) whereJadwal.id_lokasi = data.id_lokasi;
    if (data?.id_lokasi_parent)
      whereJadwal['$lokasi.parent_id$'] = data.id_lokasi_parent;
    if (data?.id_tahunajaran) whereJadwal.id_tahunajaran = data.id_tahunajaran;
    if (data?.id_semester) whereJadwal.id_semester = data.id_semester;

    let wherePegawai: any = {};
    if (data?.keyword || data?.q) {
      const kw = data?.keyword || data?.q;
      wherePegawai[Op.or] = [
        { nama_lengkap: { [Op.like]: `%${kw}%` } },
        { nip: { [Op.like]: `%${kw}%` } },
      ];
    }

    let whereJenisGuru: any = {};
    if (data?.id_lembaga) {
      whereJenisGuru.id_lembaga = data.id_lembaga;
    }

    const userContext = getUserContextData();
    if (userContext && userContext?.id_lembaga) {
      whereJadwal = {
        ...whereJadwal,
        [Op.or]: [
          { '$kelas_formal.id_lembaga$': userContext?.id_lembaga },
          { '$kelas_mda.id_lembaga$': userContext?.id_lembaga },
        ],
      };
    }

    // Step 1: Find all distinct teacher IDs that have schedules matching filters
    const matchingSchedules = await Model.findAll({
      attributes: ['id_gmapel'],
      where: whereJadwal,
      include: [
        {
          model: JenisGuru,
          as: 'jenis_guru',
          required: true,
          where:
            Object.keys(whereJenisGuru).length > 0 ? whereJenisGuru : undefined,
          attributes: ['id_guru'],
        },
        {
          model: Lokasi,
          as: 'lokasi',
          required: false,
          attributes: ['id_lokasi', 'parent_id'],
        },
        {
          model: KelasFormal,
          as: 'kelas_formal',
          required: false,
          attributes: ['id_kelas', 'id_lembaga'],
        },
        {
          model: KelasMda,
          as: 'kelas_mda',
          required: false,
          attributes: ['id_kelas_mda', 'id_lembaga'],
        },
      ],
      raw: true,
    });

    const teacherIds = Array.from(
      new Set(
        matchingSchedules
          .map((s: any) => s['jenis_guru.id_guru'])
          .filter(Boolean)
      )
    );

    if (teacherIds.length === 0) {
      return { total: 0, values: [], page, perPage };
    }

    wherePegawai.id_pegawai = { [Op.in]: teacherIds };

    // Step 2: Paginate the teachers (Pegawai)
    const { count: totalTeachers, rows: paginatedTeachers } =
      await Pegawai.findAndCountAll({
        where: wherePegawai,
        order: [['nama_lengkap', 'ASC']],
        limit,
        offset,
        attributes: ['id_pegawai', 'nama_lengkap', 'nip'],
      });

    if (paginatedTeachers.length === 0) {
      return { total: totalTeachers, values: [], page, perPage };
    }

    const currentTeacherIds = paginatedTeachers.map((t) => t.id_pegawai);

    // Step 3: Fetch all matching schedules for only the paginated teachers
    const currentSchedules = await Model.findAll({
      where: whereJadwal,
      order: [
        ['hari', 'ASC'],
        ['created_at', 'ASC'],
      ],
      include: [
        {
          model: JenisGuru,
          as: 'jenis_guru',
          required: true,
          where: {
            id_guru: { [Op.in]: currentTeacherIds },
            ...(Object.keys(whereJenisGuru).length > 0 ? whereJenisGuru : {}),
          },
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
              required: true,
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

    // Step 4: Map schedules to teachers
    const scheduleMap: Record<string, any[]> = {};
    for (const item of currentSchedules) {
      const plain = item.toJSON ? item.toJSON() : item;
      const pId = plain.jenis_guru?.pegawai?.id_pegawai;
      if (pId) {
        if (!scheduleMap[pId]) scheduleMap[pId] = [];
        scheduleMap[pId].push(plain);
      }
    }

    const values = paginatedTeachers.map((t) => {
      const plain = t.toJSON ? t.toJSON() : t;
      return {
        guru: plain,
        schedules: scheduleMap[plain.id_pegawai] || [],
      };
    });

    return {
      total: totalTeachers,
      values,
      page,
      perPage,
    };
  }
}

export const repository = new Repository();

