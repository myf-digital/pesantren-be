'use strict';

import { Op, Sequelize } from 'sequelize';
import moment from 'moment';
import Model from './jurnal.kelas.model';
import AppResource from '../resource/resource.model';
import KelasFormal from '../kelas.formal/kelas.formal.model';
import KelasMda from '../kelas.mda/kelas.mda.model';
import JamPelajaran from '../jam.pelajaran/jam.pelajaran.model';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';
import LembagaPendidikanKepesantrenan from '../lembaga.pendidikan.kepesantrenan/lembaga.pendidikan.kepesantrenan.model';
import { getUserContextData } from '../../../context/userContext';
import JadwalPelajaran from '../jadwal.pelajaran/jadwal.pelajaran.model';
import Pegawai from '../pegawai/pegawai.model';
import JenisGuru from '../jenis.guru/jenis.guru.model';
import MataPelajaran from '../mata.pelajaran/mata.pelajaran.model';

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

  public async rekapGuru(data: any) {
    const userContext = getUserContextData();
    const idLembaga = data?.id_lembaga || userContext?.id_lembaga;

    const andConditions: any[] = [];

    if (data?.tanggal_awal && data?.tanggal_akhir) {
      andConditions.push({
        tanggal: {
          [Op.between]: [data.tanggal_awal, data.tanggal_akhir],
        },
      });
    } else if (data?.tanggal) {
      andConditions.push({ tanggal: data.tanggal });
    }

    if (data?.id_lokasi) {
      andConditions.push({ id_lokasi: data.id_lokasi });
    }

    if (data?.id_jam_pelajaran) {
      andConditions.push({ id_jam_pelajaran: data.id_jam_pelajaran });
    }

    if (data?.id_petugas) {
      andConditions.push({ id_petugas: data.id_petugas });
    }

    if (idLembaga) {
      andConditions.push({
        [Op.or]: [
          { '$kelasMda.id_lembaga$': idLembaga },
          { '$kelasFormal.id_lembaga$': idLembaga },
          { '$jamPelajaran.id_lembaga$': idLembaga },
        ],
      });
    }

    if (data?.id_tahunajaran) {
      andConditions.push({
        '$jadwalPelajaran.id_tahunajaran$': data.id_tahunajaran,
      });
    }

    if (data?.id_semester) {
      andConditions.push({
        '$jadwalPelajaran.id_semester$': data.id_semester,
      });
    }

    const rows = await Model.findAll({
      order: [
        ['tanggal', 'DESC'],
        ['jam_mulai', 'DESC'],
      ],
      include: [
        {
          model: AppResource,
          as: 'petugas',
          attributes: ['resource_id', 'full_name', 'username', 'id_eksternal'],
          include: [
            {
              model: Pegawai,
              as: 'pegawai',
              attributes: ['id_pegawai', 'nama_lengkap', 'nip'],
              required: false,
            },
          ],
        },
        {
          model: KelasFormal,
          as: 'kelasFormal',
          attributes: ['id_kelas', 'nama_kelas', 'id_lembaga'],
          include: [
            {
              model: LembagaPendidikanFormal,
              as: 'lembaga',
              attributes: ['id_lembaga', 'nama_lembaga'],
            },
          ],
          required: false,
        },
        {
          model: KelasMda,
          as: 'kelasMda',
          attributes: ['id_kelas_mda', 'nama_kelas_mda', 'id_lembaga'],
          include: [
            {
              model: LembagaPendidikanKepesantrenan,
              as: 'lembaga',
              attributes: ['id_lembaga', 'nama_lembaga'],
            },
          ],
          required: false,
        },
        {
          model: JamPelajaran,
          as: 'jamPelajaran',
          attributes: [
            'id_jampel',
            'nama_jampel',
            'mulai',
            'selesai',
            'jumlah_jampel',
            'id_lembaga',
          ],
          required: false,
        },
        {
          model: JadwalPelajaran,
          as: 'jadwalPelajaran',
          required: false,
          include: [
            {
              model: JenisGuru,
              as: 'jenis_guru',
              required: false,
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
        },
      ],
      where: andConditions.length > 0 ? { [Op.and]: andConditions } : {},
    });

    const guruMap: { [key: string]: any } = {};

    for (const row of rows) {
      const rowData = row.toJSON ? row.toJSON() : row;
      const teacherId =
        rowData.id_petugas ||
        rowData.jadwalPelajaran?.jenis_guru?.pegawai?.id_pegawai ||
        'unknown';
      const nip =
        rowData.petugas?.pegawai?.nip ||
        rowData.jadwalPelajaran?.jenis_guru?.pegawai?.nip ||
        rowData.petugas?.username ||
        '-';
      const namaGuru =
        rowData.petugas?.pegawai?.nama_lengkap ||
        rowData.jadwalPelajaran?.jenis_guru?.pegawai?.nama_lengkap ||
        rowData.petugas?.full_name ||
        'Guru';
      const className =
        rowData.kelasFormal?.nama_kelas ||
        rowData.kelasMda?.nama_kelas_mda ||
        rowData.lokasi?.nama_lokasi ||
        '-';
      const classId = rowData.id_lokasi || className;
      const tanggal = rowData.tanggal;

      let durasiMenit = 0;
      if (rowData.jam_mulai && rowData.jam_selesai) {
        const [h1, m1] = String(rowData.jam_mulai).split(':').map(Number);
        const [h2, m2] = String(rowData.jam_selesai).split(':').map(Number);
        durasiMenit = h2 * 60 + m2 - (h1 * 60 + m1);
        if (durasiMenit < 0) durasiMenit += 24 * 60;
      } else if (rowData.jamPelajaran?.mulai && rowData.jamPelajaran?.selesai) {
        const [h1, m1] = String(rowData.jamPelajaran.mulai)
          .split(':')
          .map(Number);
        const [h2, m2] = String(rowData.jamPelajaran.selesai)
          .split(':')
          .map(Number);
        durasiMenit = h2 * 60 + m2 - (h1 * 60 + m1);
        if (durasiMenit < 0) durasiMenit += 24 * 60;
      } else {
        durasiMenit = 45;
      }

      const jampelCount = rowData.jamPelajaran?.jumlah_jampel
        ? Number(rowData.jamPelajaran.jumlah_jampel)
        : Math.max(1, Math.round(durasiMenit / 45));

      if (!guruMap[teacherId]) {
        guruMap[teacherId] = {
          id_petugas: teacherId,
          id_pegawai:
            rowData.petugas?.pegawai?.id_pegawai ||
            rowData.jadwalPelajaran?.jenis_guru?.pegawai?.id_pegawai ||
            null,
          nip,
          nama: namaGuru,
          nama_guru: namaGuru,
          jumlah_mengajar: 0,
          jumlah_asistensi: 0,
          jumlah_tambahan: 0,
          total_durasi_menit: 0,
          total_jam: 0,
          kelas_set: new Set<string>(),
          hari_set: new Set<string>(),
          tanggal_set: new Set<string>(),
          detail_sesi: [],
        };
      }

      const g = guruMap[teacherId];
      g.jumlah_mengajar += 1;
      g.total_durasi_menit += durasiMenit;
      g.total_jam += jampelCount;
      if (classId) g.kelas_set.add(classId);
      if (rowData.jadwalPelajaran?.hari) g.hari_set.add(rowData.jadwalPelajaran.hari);
      if (tanggal) g.tanggal_set.add(tanggal);

      g.detail_sesi.push({
        id_jurnal: rowData.id_jurnal,
        tanggal: rowData.tanggal,
        hari:
          rowData.jadwalPelajaran?.hari ||
          (rowData.tanggal
            ? moment(rowData.tanggal).locale('id').format('dddd')
            : '-'),
        nama_kelas: className,
        nama_jampel: rowData.jamPelajaran?.nama_jampel || '-',
        materi: rowData.materi || '-',
        catatan: rowData.catatan || '-',
        jam_mulai: rowData.jam_mulai,
        jam_selesai: rowData.jam_selesai,
        durasi_menit: durasiMenit,
        jumlah_jampel: jampelCount,
        mata_pelajaran:
          rowData.jadwalPelajaran?.jenis_guru?.mata_pelajaran?.nama_mapel ||
          '-',
      });
    }

    let result = Object.values(guruMap).map((g: any) => ({
      id_petugas: g.id_petugas,
      id_pegawai: g.id_pegawai,
      nip: g.nip,
      nama: g.nama,
      nama_guru: g.nama_guru,
      mengajar: g.jumlah_mengajar,
      asistensi: g.jumlah_asistensi,
      tambahan: g.jumlah_tambahan,
      jam: Math.round(Number(g.total_jam) * 100) / 100,
      durasi_menit: g.total_durasi_menit,
      kelas: g.kelas_set.size,
      hari: g.tanggal_set.size > 0 ? g.tanggal_set.size : g.hari_set.size,
      detail_sesi: g.detail_sesi,
    }));

    if (data?.keyword) {
      const kw = data.keyword.toLowerCase();
      result = result.filter(
        (item) =>
          item.nama.toLowerCase().includes(kw) ||
          item.nip.toLowerCase().includes(kw)
      );
    }

    const total = result.length;
    let paginatedRows = result;
    if (data?.offset !== undefined && data?.limit !== undefined) {
      paginatedRows = result.slice(data.offset, data.offset + data.limit);
    }

    return {
      count: total,
      rows: paginatedRows,
      all: result,
    };
  }
}

export const repository = new Repository();

