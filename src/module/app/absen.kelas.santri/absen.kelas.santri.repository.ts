'use strict';

import { Op, Sequelize } from 'sequelize';
import moment from 'moment';
import Model from './absen.kelas.santri.model';
import AppSantri from '../santri/santri.model';
import Pegawai from '../pegawai/pegawai.model';
import AppResource from '../resource/resource.model';
import JamPelajaran from '../jam.pelajaran/jam.pelajaran.model';
import Cabang from '../cabang/cabang.model';
import PenempatanKelasSantri from '../penempatan.kelas.santri/penempatan.kelas.santri.model';
import KelasFormal from '../kelas.formal/kelas.formal.model';
import KelasMda from '../kelas.mda/kelas.mda.model';
import Lokasi from '../location/location.model';
import JadwalPelajaran from '../jadwal.pelajaran/jadwal.pelajaran.model';
import { getUserContextData } from '../../../context/userContext';
import { TIMEZONE } from '../../../utils/constant';

export default class Repository {
  public async findMatchingJamPelajaran(waktu_absen: string) {
    const time = moment(waktu_absen, ['HH:mm:ss', 'HH:mm']).format('HH:mm:ss');
    const userContext = getUserContextData();

    const whereClause: any = {
      status: 'A',
      mulai: {
        [Op.lte]: time,
      },
      selesai: {
        [Op.gte]: time,
      },
    };

    if (userContext && userContext?.lembaga_type) {
      whereClause.lembaga_type = userContext?.lembaga_type;
    }

    if (userContext && userContext?.id_lembaga) {
      whereClause.id_lembaga = userContext.id_lembaga;
    }

    const result = await JamPelajaran.findAll({
      where: whereClause,
    });

    return result;
  }

  public async findAllJamPelajaran() {
    const result = await JamPelajaran.findAll({
      where: {
        status: 'A',
      },
    });

    return result;
  }

  public async checkExistingAbsen(criteria: {
    id_santri: string;
    tanggal: string;
    id_jam_pelajaran: string | null;
  }) {
    return await Model.findOne({
      where: {
        id_santri: criteria.id_santri,
        tanggal: criteria.tanggal,
        id_jam_pelajaran: criteria.id_jam_pelajaran,
      },
    });
  }

  public async detail(condition: { id_absen?: string }) {
    return await Model.findOne({
      where: condition,
      include: [
        {
          model: AppSantri,
          as: 'santri',
          attributes: ['id_santri', 'fullname', 'nis', 'nik', 'gender'],
        },
        {
          model: KelasFormal,
          as: 'kelasFormal',
          attributes: ['id_kelas', 'nama_kelas'],
        },
        {
          model: KelasMda,
          as: 'kelasMda',
          attributes: ['id_kelas_mda', 'nama_kelas_mda'],
        },
        {
          model: JamPelajaran,
          as: 'jamPelajaran',
          attributes: ['id_jampel', 'nama_jampel', 'mulai', 'selesai'],
        },
        {
          model: Pegawai,
          as: 'petugas',
          attributes: ['id_pegawai', 'nama_lengkap'],
        },
        {
          model: AppResource,
          as: 'resource',
          attributes: ['resource_id', 'full_name'],
        },
      ],
    });
  }

  public async update(data: {
    payload: any;
    condition: { id_absen?: string };
  }) {
    return await Model.update(data.payload, {
      where: data.condition,
    });
  }

  public async upsertBulkAbsen(payloads: any[]) {
    const trx = await Model.sequelize?.transaction();
    try {
      const results: any[] = [];
      for (const item of payloads) {
        const existing = await Model.findOne({
          where: {
            id_santri: item.id_santri,
            tanggal: item.tanggal,
            id_jam_pelajaran: item.id_jam_pelajaran,
            is_deleted: false,
          },
          transaction: trx,
        });

        if (existing) {
          const updated = await existing.update(item, { transaction: trx });
          results.push(updated);
        } else {
          const created = await Model.create(item, { transaction: trx });
          results.push(created);
        }
      }
      await trx?.commit();
      return results;
    } catch (error) {
      await trx?.rollback();
      throw error;
    }
  }

  public async index(data: any) {
    const userContext = getUserContextData();
    const santriAttributes = ['id_santri', 'fullname', 'nis', 'nik', 'gender'];
    if (data?.isOpenApi) {
      santriAttributes.push(
        'id_santri_sitrendi',
        'id_wali_sitrendi',
        'institution_id_sitrendi'
      );
    }

    const query: any = {
      order: [
        ['tanggal', 'DESC'],
        ['waktu_absen', 'DESC'],
      ],
      offset: data?.offset,
      limit: data?.limit,
      distinct: true,
      include: [
        {
          model: AppSantri,
          as: 'santri',
          attributes: santriAttributes,
        },
        { model: KelasFormal, as: 'kelasFormal', attributes: ['nama_kelas'] },
        { model: KelasMda, as: 'kelasMda', attributes: ['nama_kelas_mda'] },
        {
          model: JamPelajaran,
          as: 'jamPelajaran',
          attributes: ['nama_jampel'],
        },
        { model: Pegawai, as: 'petugas', attributes: ['nama_lengkap'] },
        {
          model: AppResource,
          as: 'resource',
          attributes: ['resource_id', 'full_name'],
        },
      ],
      where: {
        is_deleted: false,
      },
    };

    if (userContext && userContext?.id_cabang) {
      query.include.push({
        model: Lokasi,
        as: 'lokasi',
        required: true,
        attributes: [],
        where: {
          id_cabang: userContext.id_cabang,
        },
      });
    }

    // 1. Filter Tanggal (jika data.tanggal dikirim)
    if (data?.tanggal) {
      query.where.tanggal = data.tanggal;
    }

    // 2. Filter Jam Pelajaran (id_jam_pelajaran)
    if (data?.id_jam_pelajaran) {
      query.where.id_jam_pelajaran = data.id_jam_pelajaran;
    }

    // 3. Filter Lokasi (id_lokasi)
    if (data?.id_lokasi) {
      query.where.id_lokasi = data.id_lokasi;
    }

    // 4. Filter Status Kehadiran (Hadir, Izin, Sakit, Alfa)
    if (data?.status) {
      query.where.status_kehadiran = data.status;
    }

    // 5. Filter Date Range (tanggal_awal & tanggal_akhir)
    if (data?.tanggal_awal && data?.tanggal_akhir) {
      query.where.tanggal = {
        [Op.between]: [data.tanggal_awal, data.tanggal_akhir],
      };
    }

    // 6. Filter Santri (id_santri SiTrendi dari relasi santri)
    if (data?.id_santri) {
      query.where['$santri.id_santri_sitrendi$'] = data.id_santri;
    }

    // 6. Filter Pencarian Global (Nama / NIS / Keyword)
    if (data?.keyword) {
      const keyword = `%${data.keyword.toLowerCase()}%`;
      query.where[Op.or] = [
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('santri.fullname')),
          {
            [Op.like]: keyword,
          }
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.cast(Sequelize.col('santri.nis'), 'TEXT')
          ),
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
      ];
    }

    return await Model.findAndCountAll(query);
  }

  public async findSantriByNis(nis: string) {
    return await AppSantri.findOne({
      where: {
        status: 1, // Santri aktif
        [Op.or]: [{ nis: nis }, { kartu_santri_nomor: nis }],
      },
      attributes: ['id_santri', 'fullname', 'nis'],
    });
  }

  public async upsertSingleAbsen(payload: any) {
    const existing = await Model.findOne({
      where: {
        id_santri: payload.id_santri,
        tanggal: payload.tanggal,
        id_jam_pelajaran: payload.id_jam_pelajaran,
        is_deleted: false,
      },
    });

    if (existing) {
      return await existing.update({
        status_kehadiran: 'Hadir',
        waktu_absen: payload.waktu_absen,
        id_petugas: payload.id_petugas,
        id_jurnal: payload.id_jurnal,
        keterangan: 'Hadir via Pindai QR Code',
      });
    }

    return await Model.create(payload);
  }

  public async listForExport(params: {
    q?: string;
    id_lokasi?: string;
    id_jam_pelajaran?: string;
    tanggal?: string;
    status?: string;
    isTemplate?: boolean;
    limit?: number;
    tanggal_awal?: string;
    tanggal_akhir?: string;
  }) {
    const {
      q,
      id_lokasi,
      id_jam_pelajaran,
      tanggal,
      status,
      isTemplate,
      limit,
      tanggal_awal,
      tanggal_akhir,
    } = params;

    const userContext = getUserContextData();
    let whereClause: any = {
      is_deleted: false,
    };

    if (!isTemplate) {
      // 1. Filter Tanggal
      if (tanggal) {
        whereClause.tanggal = tanggal;
      }

      // 2. Filter Jam Pelajaran
      if (id_jam_pelajaran) {
        whereClause.id_jam_pelajaran = id_jam_pelajaran;
      }

      // 3. Filter Lokasi
      if (id_lokasi) {
        whereClause.id_lokasi = id_lokasi;
      }

      // 4. Filter Status Kehadiran
      if (status) {
        whereClause.status_kehadiran = status;
      }

      // 5. Filter Date Range (tanggal_awal & tanggal_akhir)
      if (tanggal_awal && tanggal_akhir) {
        whereClause.tanggal = {
          [Op.between]: [tanggal_awal, tanggal_akhir],
        };
      }

      // 6. Filter Pencarian Global (Nama / NIS)
      if (q) {
        const keyword = `%${q.toLowerCase()}%`;
        whereClause[Op.or] = [
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('santri.fullname')),
            {
              [Op.like]: keyword,
            }
          ),
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.cast(Sequelize.col('santri.nis'), 'TEXT')
            ),
            {
              [Op.like]: keyword,
            }
          ),
        ];
      }
    }

    const includes: any[] = [
      { model: AppSantri, as: 'santri', attributes: ['fullname', 'nis'] },
      {
        model: KelasFormal,
        as: 'kelasFormal',
        attributes: ['id_kelas', 'nama_kelas'],
      },
      {
        model: KelasMda,
        as: 'kelasMda',
        attributes: ['id_kelas_mda', 'nama_kelas_mda'],
      },
      {
        model: JamPelajaran,
        as: 'jamPelajaran',
        attributes: ['id_jampel', 'nama_jampel'],
      },
      {
        model: Pegawai,
        as: 'petugas',
        attributes: ['id_pegawai', 'nama_lengkap'],
      },
      {
        model: AppResource,
        as: 'resource',
        attributes: ['resource_id', 'full_name'],
      },
    ];

    if (userContext && userContext?.id_cabang) {
      includes.push({
        model: Lokasi,
        as: 'lokasi',
        required: true,
        attributes: [],
        where: {
          id_cabang: userContext.id_cabang,
        },
      });
    }

    return await Model.findAll({
      where: whereClause,
      limit: limit || (isTemplate ? 5 : undefined),
      subQuery: false,
      include: includes,
      order: [
        ['tanggal', 'DESC'],
        [{ model: AppSantri, as: 'santri' }, 'fullname', 'ASC'],
      ],
    });
  }

  public async listSantriActiveForTemplate(params: { id_cabang?: string }) {
    let condition: any = {
      status: 1,
      id_cabang: params.id_cabang,
    };

    return await AppSantri.findAll({
      where: condition,
      attributes: ['id_santri', 'fullname', 'nis', 'nik'],
      include: [
        {
          model: Cabang,
          as: 'cabang',
          attributes: ['id_cabang', 'nama_cabang'],
        },
      ],
    });
  }

  public async findSantriByNisOnly(nis: string) {
    return await AppSantri.findOne({
      where: { nis: nis, status: 1 },
      attributes: ['id_santri', 'fullname', 'nis'],
    });
  }

  public async findKelasSantri(id_kelas: string) {
    let where: any = {
      status: 1,
    };

    if (id_kelas) {
      const targetDate = moment().tz(TIMEZONE).format('YYYY-MM-DD');
      const placements = await PenempatanKelasSantri.findAll({
        where: {
          status: 'Aktif',
          [Op.and]: [
            {
              [Op.or]: [
                { tanggal_masuk: null },
                { tanggal_masuk: { [Op.lte]: targetDate } },
              ],
            },
            {
              [Op.or]: [
                { tanggal_keluar: null },
                { tanggal_keluar: { [Op.gte]: targetDate } },
              ],
            },
            {
              [Op.or]: [
                { id_kelas_formal: id_kelas },
                { id_kelas_mda: id_kelas },
              ],
            },
          ],
        },
        attributes: ['id_santri'],
      });

      const studentIds = placements.map((p) => p.getDataValue('id_santri'));
      where.id_santri = { [Op.in]: studentIds };
    }

    return await AppSantri.findAll({
      where: where,
      attributes: ['id_santri', 'fullname', 'nis'],
      include: [
        {
          model: Cabang,
          as: 'cabang',
          attributes: ['id_cabang', 'nama_cabang'],
        },
      ],
    });
  }

  public async checkSantriKelasValidity(
    id_santri: string,
    id_kelas: string,
    tanggal: string
  ) {
    const targetDate = moment(tanggal).format('YYYY-MM-DD');

    const placement = await PenempatanKelasSantri.findOne({
      where: {
        id_santri,
        status: 'Aktif',
        [Op.and]: [
          {
            [Op.or]: [
              { tanggal_masuk: null },
              { tanggal_masuk: { [Op.lte]: targetDate } },
            ],
          },
          {
            [Op.or]: [
              { tanggal_keluar: null },
              { tanggal_keluar: { [Op.gte]: targetDate } },
            ],
          },
          {
            [Op.or]: [
              { id_kelas_formal: id_kelas },
              { id_kelas_mda: id_kelas },
            ],
          },
        ],
      },
    });

    return !!placement;
  }

  public async findAllClasses(idLembaga?: string) {
    const userContext = getUserContextData();
    let where: any = {
      status: 'Aktif',
    };

    const targetLembaga = idLembaga || userContext?.id_lembaga;
    if (targetLembaga) {
      where.id_lembaga = targetLembaga;
    }

    const formal = await KelasFormal.findAll({
      where: where,
      attributes: ['id_kelas', 'nama_kelas', 'id_lembaga'],
    });

    const mda = await KelasMda.findAll({
      where: where,
      attributes: ['id_kelas_mda', 'nama_kelas_mda', 'id_lembaga'],
    });

    const list: any[] = [];
    formal.forEach((c) => {
      list.push({
        id_kelas: c.getDataValue('id_kelas'),
        nama_kelas: c.getDataValue('nama_kelas'),
        type: 'Formal',
        id_lembaga: c.getDataValue('id_lembaga'),
      });
    });

    mda.forEach((c) => {
      list.push({
        id_kelas: c.getDataValue('id_kelas_mda'),
        nama_kelas: c.getDataValue('nama_kelas_mda'),
        type: 'MDA',
        id_lembaga: c.getDataValue('id_lembaga'),
      });
    });

    return list.sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas));
  }

  public async rekapSantri(data: any) {
    const userContext = getUserContextData();
    const idLembaga = data?.id_lembaga || userContext?.id_lembaga;
    const mode = data?.mode || (data?.id_kelas ? 'santri' : 'kelas');

    let startDate: moment.Moment;
    let endDate: moment.Moment;

    if (data?.tanggal_awal && data?.tanggal_akhir) {
      startDate = moment(data.tanggal_awal, 'YYYY-MM-DD').startOf('day');
      endDate = moment(data.tanggal_akhir, 'YYYY-MM-DD').endOf('day');
    } else if (data?.bulan) {
      startDate = moment(data.bulan, 'YYYY-MM').startOf('month');
      endDate = moment(data.bulan, 'YYYY-MM').endOf('month');
    } else if (data?.tanggal) {
      startDate = moment(data.tanggal).startOf('month');
      endDate = moment(data.tanggal).endOf('month');
    } else {
      startDate = moment().startOf('month');
      endDate = moment().endOf('month');
    }

    const startDateStr = startDate.format('YYYY-MM-DD');
    const endDateStr = endDate.format('YYYY-MM-DD');

    // 1. Fetch Classes (Formal & MDA)
    const formalWhere: any = { status: 'Aktif' };
    const mdaWhere: any = { status: 'Aktif' };
    if (idLembaga) {
      formalWhere.id_lembaga = idLembaga;
      mdaWhere.id_lembaga = idLembaga;
    }
    if (data?.id_kelas) {
      formalWhere.id_kelas = data.id_kelas;
      mdaWhere.id_kelas_mda = data.id_kelas;
    }

    const [formalClasses, mdaClasses] = await Promise.all([
      KelasFormal.findAll({
        where: formalWhere,
        attributes: ['id_kelas', 'nama_kelas', 'id_lembaga'],
      }),
      KelasMda.findAll({
        where: mdaWhere,
        attributes: ['id_kelas_mda', 'nama_kelas_mda', 'id_lembaga'],
      }),
    ]);

    const classMap: Record<
      string,
      { id_kelas: string; nama_kelas: string; id_lembaga: string; type: string }
    > = {};
    formalClasses.forEach((c: any) => {
      const id = c.id_kelas || c.getDataValue('id_kelas');
      const nama = c.nama_kelas || c.getDataValue('nama_kelas');
      const lemb = c.id_lembaga || c.getDataValue('id_lembaga');
      classMap[id] = {
        id_kelas: id,
        nama_kelas: nama,
        id_lembaga: lemb,
        type: 'Formal',
      };
    });
    mdaClasses.forEach((c: any) => {
      const id = c.id_kelas_mda || c.getDataValue('id_kelas_mda');
      const nama = c.nama_kelas_mda || c.getDataValue('nama_kelas_mda');
      const lemb = c.id_lembaga || c.getDataValue('id_lembaga');
      classMap[id] = {
        id_kelas: id,
        nama_kelas: nama,
        id_lembaga: lemb,
        type: 'MDA',
      };
    });

    const targetClassIds = Object.keys(classMap);
    if (targetClassIds.length === 0) {
      return {
        count: 0,
        rows: [],
        all: [],
        rekap_kelas: [],
        rekap_santri: [],
        classes: [],
        meta: {
          startDate: startDateStr,
          endDate: endDateStr,
          bulanLabel: startDate.locale('id').format('MMMM YYYY'),
          mode: mode,
        },
        summary: {
          total_kelas: 0,
          total_siswa: 0,
          total_hadir: 0,
          total_sakit: 0,
          total_izin: 0,
          total_alfa: 0,
          total_absen: 0,
          avg_kehadiran: 0,
        },
      };
    }

    // 2. Fetch Placements (Active Santri in Classes)
    const placements = await PenempatanKelasSantri.findAll({
      where: {
        status: 'Aktif',
        [Op.or]: [
          { id_kelas_formal: { [Op.in]: targetClassIds } },
          { id_kelas_mda: { [Op.in]: targetClassIds } },
        ],
      },
      include: [
        {
          model: AppSantri,
          as: 'santri',
          required: true,
          attributes: ['id_santri', 'fullname', 'nis', 'gender'],
        },
      ],
    });

    // Map santri per class
    const santriMap: Record<string, any> = {};
    const classSantriCount: Record<string, Set<string>> = {};

    for (const p of placements) {
      const row = p.toJSON ? p.toJSON() : p;
      const santri = row.santri;
      if (!santri || !santri.id_santri) continue;

      const cId = row.id_kelas_formal || row.id_kelas_mda;
      if (!cId || !classMap[cId]) continue;

      if (!classSantriCount[cId]) classSantriCount[cId] = new Set<string>();
      classSantriCount[cId].add(santri.id_santri);

      const key = `${santri.id_santri}_${cId}`;
      santriMap[key] = {
        id_santri: santri.id_santri,
        nis: santri.nis || '-',
        nama_santri: santri.fullname || '-',
        nama: santri.fullname || '-',
        id_kelas: cId,
        nama_kelas: classMap[cId].nama_kelas,
        kelas_marhalah: classMap[cId].nama_kelas,
        id_lembaga: classMap[cId].id_lembaga,
        type: classMap[cId].type,
        wajib_hadir: 0,
        hari_efektif: 0,
        sakit: 0,
        izin: 0,
        alfa: 0,
        hadir: 0,
        total_presensi: 0,
        kehadiran_persen: 0,
      };
    }

    // 3. Fetch Attendance records (absen_kelas_santri)
    const absens = await Model.findAll({
      where: {
        id_lokasi: { [Op.in]: targetClassIds },
        tanggal: {
          [Op.between]: [startDateStr, endDateStr],
        },
        is_deleted: false,
      },
      attributes: [
        'id_absen',
        'id_santri',
        'id_lokasi',
        'tanggal',
        'status_kehadiran',
      ],
    });

    const classDates: Record<string, Set<string>> = {};
    const classStats: Record<
      string,
      { sakit: number; izin: number; alfa: number; hadir: number }
    > = {};
    targetClassIds.forEach((cId) => {
      classDates[cId] = new Set<string>();
      classStats[cId] = { sakit: 0, izin: 0, alfa: 0, hadir: 0 };
    });

    for (const ab of absens) {
      const r = ab.toJSON ? ab.toJSON() : ab;
      const cId = r.id_lokasi;
      const sId = r.id_santri;
      const st = r.status_kehadiran;

      if (classDates[cId] && r.tanggal) {
        classDates[cId].add(moment(r.tanggal).format('YYYY-MM-DD'));
      }

      if (classStats[cId]) {
        if (st === 'Hadir') classStats[cId].hadir += 1;
        else if (st === 'Sakit') classStats[cId].sakit += 1;
        else if (st === 'Izin') classStats[cId].izin += 1;
        else if (st === 'Alfa' || st === 'Alpha') classStats[cId].alfa += 1;
      }

      const key = `${sId}_${cId}`;
      if (santriMap[key]) {
        if (st === 'Hadir') santriMap[key].hadir += 1;
        else if (st === 'Sakit') santriMap[key].sakit += 1;
        else if (st === 'Izin') santriMap[key].izin += 1;
        else if (st === 'Alfa' || st === 'Alpha') santriMap[key].alfa += 1;
      }
    }

    // 4. Calculate day occurrences in the date range [startDate, endDate]
    const dayMapName: Record<number, string> = {
      0: 'Ahad',
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
    };

    const dayCounts: Record<string, number> = {
      Senin: 0,
      Selasa: 0,
      Rabu: 0,
      Kamis: 0,
      Jumat: 0,
      Sabtu: 0,
      Ahad: 0,
    };

    const curr = startDate.clone();
    while (curr.isSameOrBefore(endDate, 'day')) {
      const dayName = dayMapName[curr.day()];
      if (dayName && dayCounts[dayName] !== undefined) {
        dayCounts[dayName] += 1;
      }
      curr.add(1, 'day');
    }

    // 5. Fetch active schedule (jadwal_pelajaran) for target classes
    const jadwals = await JadwalPelajaran.findAll({
      where: {
        id_kelas: { [Op.in]: targetClassIds },
        status: 'Aktif',
      },
      attributes: ['id_jadwal', 'id_kelas', 'hari'],
    });

    const classExpectedSessions: Record<string, number> = {};
    targetClassIds.forEach((cId) => {
      classExpectedSessions[cId] = 0;
    });

    for (const j of jadwals) {
      const row = j.toJSON ? j.toJSON() : j;
      const cId = row.id_kelas;
      const hari = row.hari;
      if (classExpectedSessions[cId] !== undefined && hari && dayCounts[hari]) {
        classExpectedSessions[cId] += dayCounts[hari];
      }
    }

    // Calculate effective days and % per class
    const rekapPerKelas = targetClassIds
      .map((cId) => {
        const cls = classMap[cId];
        const stats = classStats[cId] || {
          sakit: 0,
          izin: 0,
          alfa: 0,
          hadir: 0,
        };
        const jmlSiswa = classSantriCount[cId]?.size || 0;
        const hariEfektif = classDates[cId]?.size || 0;
        const sessionsInMonth = classExpectedSessions[cId] || 0;
        const totalPresensi = stats.hadir + stats.sakit + stats.izin + stats.alfa;

        // Wajib hadir per class = jml santri aktif * jumlah sesi jadwal dalam bulan
        const wajibHadir =
          sessionsInMonth > 0 ? jmlSiswa * sessionsInMonth : totalPresensi;

        const basisPembagi = wajibHadir > 0 ? wajibHadir : totalPresensi;
        const totalMasuk = stats.hadir + stats.sakit + stats.izin;
        const kehadiranPersen =
          basisPembagi > 0
            ? Math.min(100, Math.round((totalMasuk / basisPembagi) * 1000) / 10)
            : 0;

        return {
          id_kelas: cId,
          nama_kelas: cls.nama_kelas,
          kelas_marhalah: cls.nama_kelas,
          id_lembaga: cls.id_lembaga,
          type: cls.type,
          jumlah_siswa: jmlSiswa,
          jml_siswa: jmlSiswa,
          sesi_jadwal: sessionsInMonth,
          wajib_hadir: wajibHadir,
          hari_efektif: hariEfektif,
          sakit: stats.sakit,
          izin: stats.izin,
          alfa: stats.alfa,
          hadir: stats.hadir,
          total_presensi: totalPresensi,
          kehadiran_persen: kehadiranPersen,
          persentase_kehadiran: `${kehadiranPersen}%`,
        };
      })
      .filter((k) => k.jumlah_siswa > 0);

    // Calculate % per santri
    const rekapPerSantri = Object.values(santriMap).map((s: any) => {
      const hariEfektif = classDates[s.id_kelas]?.size || 0;
      const sessionsInMonth = classExpectedSessions[s.id_kelas] || 0;
      const totalPresensi = s.hadir + s.sakit + s.izin + s.alfa;
      const wajibHadir = sessionsInMonth > 0 ? sessionsInMonth : totalPresensi;
      const basisPembagi = wajibHadir > 0 ? wajibHadir : totalPresensi;
      const totalMasuk = s.hadir + s.sakit + s.izin;

      const kehadiranPersen =
        basisPembagi > 0
          ? Math.min(100, Math.round((totalMasuk / basisPembagi) * 1000) / 10)
          : totalMasuk > 0
            ? 100
            : 0;

      return {
        ...s,
        sesi_jadwal: sessionsInMonth,
        wajib_hadir: wajibHadir,
        hari_efektif: hariEfektif,
        total_presensi: totalPresensi,
        kehadiran_persen: kehadiranPersen,
        persentase_kehadiran: `${kehadiranPersen}%`,
      };
    });

    let selectedList = mode === 'santri' ? rekapPerSantri : rekapPerKelas;

    if (data?.keyword) {
      const kw = data.keyword.toLowerCase();
      if (mode === 'santri') {
        selectedList = selectedList.filter(
          (item: any) =>
            item.nama_santri.toLowerCase().includes(kw) ||
            item.nis.toLowerCase().includes(kw) ||
            item.nama_kelas.toLowerCase().includes(kw)
        );
      } else {
        selectedList = selectedList.filter((item: any) =>
          item.nama_kelas.toLowerCase().includes(kw)
        );
      }
    }

    if (mode === 'santri') {
      selectedList.sort((a: any, b: any) =>
        a.nama_santri.localeCompare(b.nama_santri)
      );
    } else {
      selectedList.sort((a: any, b: any) =>
        a.nama_kelas.localeCompare(b.nama_kelas)
      );
    }

    const total = selectedList.length;
    let paginatedRows = selectedList;
    if (data?.offset !== undefined && data?.limit !== undefined) {
      paginatedRows = selectedList.slice(data.offset, data.offset + data.limit);
    }

    // Overall Summary
    const totalSiswaAll = Object.values(classSantriCount).reduce(
      (sum, set) => sum + set.size,
      0
    );
    const totalWajibHadirAll = rekapPerKelas.reduce(
      (sum, k) => sum + k.wajib_hadir,
      0
    );
    const totalHadirAll = rekapPerKelas.reduce((sum, k) => sum + k.hadir, 0);
    const totalSakitAll = rekapPerKelas.reduce((sum, k) => sum + k.sakit, 0);
    const totalIzinAll = rekapPerKelas.reduce((sum, k) => sum + k.izin, 0);
    const totalAlfaAll = rekapPerKelas.reduce((sum, k) => sum + k.alfa, 0);
    const totalAbsenAll = totalSakitAll + totalIzinAll + totalAlfaAll;
    const totalAllPresensi = totalHadirAll + totalAbsenAll;
    const totalMasukAll = totalHadirAll + totalSakitAll + totalIzinAll;
    const basisAllPembagi =
      totalWajibHadirAll > 0 ? totalWajibHadirAll : totalAllPresensi;
    const avgKehadiranAll =
      basisAllPembagi > 0
        ? Math.round((totalMasukAll / basisAllPembagi) * 1000) / 10
        : 0;

    return {
      count: total,
      rows: paginatedRows,
      all: selectedList,
      rekap_kelas: rekapPerKelas,
      rekap_santri: rekapPerSantri,
      classes: Object.values(classMap)
        .filter((c) => (classSantriCount[c.id_kelas]?.size || 0) > 0)
        .sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas)),
      meta: {
        startDate: startDateStr,
        endDate: endDateStr,
        bulanLabel: startDate.locale('id').format('MMMM YYYY'),
        mode: mode,
      },
      summary: {
        total_kelas: rekapPerKelas.length,
        total_siswa: totalSiswaAll,
        total_wajib_hadir: totalWajibHadirAll,
        total_hadir: totalHadirAll,
        total_sakit: totalSakitAll,
        total_izin: totalIzinAll,
        total_alfa: totalAlfaAll,
        total_absen: totalAbsenAll,
        avg_kehadiran: avgKehadiranAll,
      },
    };
  }
}

export const repository = new Repository();

