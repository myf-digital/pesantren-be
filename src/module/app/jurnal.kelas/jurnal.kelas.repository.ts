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
import KesehatanSantri from '../kesehatan.santri/kesehatan.santri.model';
import PerizinanSantri from '../perizinan.santri/perizinan.santri.model';

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

    const dayDates: Record<string, string[]> = {
      Senin: [],
      Selasa: [],
      Rabu: [],
      Kamis: [],
      Jumat: [],
      Sabtu: [],
      Ahad: [],
    };
    const dayMap: Record<number, string> = {
      0: 'Ahad',
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
    };

    let cur = startDate.clone();
    while (cur.isSameOrBefore(endDate, 'day')) {
      const dayName = dayMap[cur.day()];
      if (dayName) {
        dayDates[dayName].push(cur.format('YYYY-MM-DD'));
      }
      cur.add(1, 'day');
    }

    const jadwalWhere: any = {
      status: 'Aktif',
    };

    if (data?.id_tahunajaran) {
      jadwalWhere.id_tahunajaran = data.id_tahunajaran;
    }
    if (data?.id_semester) {
      jadwalWhere.id_semester = data.id_semester;
    }

    const jadwalList = await JadwalPelajaran.findAll({
      where: jadwalWhere,
      include: [
        {
          model: JenisGuru,
          as: 'jenis_guru',
          required: true,
          include: [
            {
              model: Pegawai,
              as: 'pegawai',
              required: true,
              attributes: ['id_pegawai', 'nama_lengkap', 'nip', 'nik'],
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
          attributes: ['id_kelas', 'nama_kelas', 'id_lembaga'],
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
          attributes: ['id_kelas_mda', 'nama_kelas_mda', 'id_lembaga'],
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
          attributes: [
            'id_jampel',
            'nama_jampel',
            'mulai',
            'selesai',
            'id_lembaga',
          ],
        },
      ],
    });

    const teacherMap: { [key: string]: any } = {};
    const teacherScheduledSessions: {
      [key: string]: Array<{
        date: string;
        id_jadwal: string;
        id_jam_pelajaran: string;
        id_lokasi: string;
      }>;
    } = {};

    for (const j of jadwalList) {
      const row = j.toJSON ? j.toJSON() : j;
      const pegawai = row.jenis_guru?.pegawai;
      if (!pegawai || !pegawai.id_pegawai) continue;

      const jadwalLembagaId =
        row.kelas_formal?.id_lembaga ||
        row.kelas_mda?.id_lembaga ||
        row.jam_pelajaran?.id_lembaga ||
        row.kelas_formal?.lembaga?.id_lembaga ||
        row.kelas_mda?.lembaga?.id_lembaga;

      if (
        idLembaga &&
        jadwalLembagaId &&
        String(jadwalLembagaId) !== String(idLembaga)
      ) {
        continue;
      }

      const pId = pegawai.id_pegawai;
      if (!teacherMap[pId]) {
        teacherMap[pId] = {
          id_pegawai: pId,
          nip: pegawai.nip || '-',
          nama: pegawai.nama_lengkap || 'Guru',
          nama_guru: pegawai.nama_lengkap || 'Guru',
          wajib_hadir: 0,
          jadwal_mingguan: 0,
          hadir: 0,
          sakit: 0,
          izin: 0,
          alfa: 0,
          jml_absen: 0,
          lembaga_nama:
            row.kelas_formal?.lembaga?.nama_lembaga ||
            row.kelas_mda?.lembaga?.nama_lembaga ||
            '-',
        };
        teacherScheduledSessions[pId] = [];
      }

      const hari = row.hari;
      const dates = dayDates[hari] || [];
      teacherMap[pId].jadwal_mingguan += 1;

      const idLokasi =
        row.id_kelas ||
        row.kelas_formal?.id_kelas ||
        row.kelas_mda?.id_kelas_mda;

      for (const d of dates) {
        teacherMap[pId].wajib_hadir += 1;
        teacherScheduledSessions[pId].push({
          date: d,
          id_jadwal: row.id_jadwal,
          id_jam_pelajaran: row.id_jam_pelajaran,
          id_lokasi: idLokasi,
        });
      }
    }

    const teacherIds = Object.keys(teacherMap);
    const teacherMinutes: Record<string, number> = {};

    if (teacherIds.length > 0) {
      try {
        const resources = await AppResource.findAll({
          where: {
            id_eksternal: { [Op.in]: teacherIds },
          },
          attributes: ['resource_id', 'id_eksternal'],
        });

        const resourceToPegawaiMap: Record<string, string> = {};
        for (const res of resources) {
          const r = res.toJSON ? res.toJSON() : res;
          if (r.resource_id && r.id_eksternal) {
            resourceToPegawaiMap[r.resource_id] = r.id_eksternal;
          }
        }

        const allResourceIds = Object.keys(resourceToPegawaiMap);

        let jurnals: any[] = [];
        if (allResourceIds.length > 0) {
          jurnals = await Model.findAll({
            where: {
              id_petugas: { [Op.in]: allResourceIds },
              tanggal: {
                [Op.between]: [startDateStr, endDateStr],
              },
            },
            attributes: [
              'id_jurnal',
              'id_petugas',
              'tanggal',
              'jam_mulai',
              'jam_selesai',
              'id_jam_pelajaran',
              'id_lokasi',
              'id_jadwal',
            ],
          });
        }

        const jurnalSlots = new Set<string>();
        const jurnalDateCount: Record<string, number> = {};

        for (const jn of jurnals) {
          const r = jn.toJSON ? jn.toJSON() : jn;
          const pId = resourceToPegawaiMap[r.id_petugas];
          if (pId && r.tanggal) {
            const dStr = moment(r.tanggal).format('YYYY-MM-DD');
            if (r.id_jadwal) {
              jurnalSlots.add(`${pId}_${dStr}_${r.id_jadwal}`);
            }
            if (r.id_jam_pelajaran && r.id_lokasi) {
              jurnalSlots.add(
                `${pId}_${dStr}_${r.id_jam_pelajaran}_${r.id_lokasi}`
              );
            }
            const dateKey = `${pId}_${dStr}`;
            jurnalDateCount[dateKey] = (jurnalDateCount[dateKey] || 0) + 1;

            if (r.jam_mulai && r.jam_selesai) {
              const [h1, m1] = String(r.jam_mulai).split(':').map(Number);
              const [h2, m2] = String(r.jam_selesai).split(':').map(Number);
              const diff = h2 * 60 + (m2 || 0) - (h1 * 60 + (m1 || 0));
              if (diff > 0) {
                teacherMinutes[pId] = (teacherMinutes[pId] || 0) + diff;
              }
            }
          }
        }

        const sakitRecords = await KesehatanSantri.findAll({
          where: {
            id_pegawai: { [Op.in]: teacherIds },
            is_deleted: false,
            [Op.or]: [
              {
                tanggal_event: {
                  [Op.between]: [
                    moment(startDateStr).startOf('day').toDate(),
                    moment(endDateStr).endOf('day').toDate(),
                  ],
                },
              },
              {
                tanggal_mulai_rawat: {
                  [Op.between]: [
                    moment(startDateStr).startOf('day').toDate(),
                    moment(endDateStr).endOf('day').toDate(),
                  ],
                },
              },
            ],
          },
          attributes: [
            'id_kesehatan',
            'id_pegawai',
            'tanggal_event',
            'tanggal_mulai_rawat',
            'estimasi_hari',
          ],
        });

        const sickDatesPerPegawai: Record<string, Set<string>> = {};
        for (const sk of sakitRecords) {
          const r = sk.toJSON ? sk.toJSON() : sk;
          const pId = r.id_pegawai;
          if (pId) {
            if (!sickDatesPerPegawai[pId])
              sickDatesPerPegawai[pId] = new Set<string>();

            if (r.tanggal_event) {
              sickDatesPerPegawai[pId].add(
                moment(r.tanggal_event).format('YYYY-MM-DD')
              );
            }
            if (r.tanggal_mulai_rawat) {
              const startRawat = moment(r.tanggal_mulai_rawat);
              const days = Math.max(1, r.estimasi_hari || 1);
              for (let i = 0; i < days; i++) {
                sickDatesPerPegawai[pId].add(
                  startRawat.clone().add(i, 'days').format('YYYY-MM-DD')
                );
              }
            }
          }
        }

        const izinRecords = await PerizinanSantri.findAll({
          where: {
            id_pegawai: { [Op.in]: teacherIds },
            deleted_at: null,
            is_canceled: false,
            status_approval: { [Op.ne]: 'Ditolak' },
            [Op.and]: [
              { status_approval: { [Op.ne]: 'Dibatalkan' } },
              {
                [Op.or]: [
                  {
                    tanggal_mulai: { [Op.lte]: endDateStr },
                    tanggal_selesai: { [Op.gte]: startDateStr },
                  },
                  {
                    tanggal_pengajuan: {
                      [Op.between]: [
                        moment(startDateStr).startOf('day').toDate(),
                        moment(endDateStr).endOf('day').toDate(),
                      ],
                    },
                  },
                ],
              },
            ],
          },
          attributes: [
            'id_izin',
            'id_pegawai',
            'jenis_izin',
            'tanggal_mulai',
            'tanggal_selesai',
            'tanggal_pengajuan',
            'status_approval',
          ],
        });

        const izinDatesPerPegawai: Record<string, Set<string>> = {};
        for (const iz of izinRecords) {
          const r = iz.toJSON ? iz.toJSON() : iz;
          const pId = r.id_pegawai;
          if (pId) {
            if (!izinDatesPerPegawai[pId])
              izinDatesPerPegawai[pId] = new Set<string>();

            const tglMulai = r.tanggal_mulai
              ? moment(r.tanggal_mulai)
              : r.tanggal_pengajuan
                ? moment(r.tanggal_pengajuan)
                : null;
            const tglSelesai = r.tanggal_selesai
              ? moment(r.tanggal_selesai)
              : tglMulai;

            if (tglMulai) {
              let cDate = tglMulai.clone();
              const endD = tglSelesai || tglMulai;
              while (cDate.isSameOrBefore(endD, 'day')) {
                const dStr = cDate.format('YYYY-MM-DD');
                if (r.jenis_izin === 'Sakit') {
                  if (!sickDatesPerPegawai[pId])
                    sickDatesPerPegawai[pId] = new Set<string>();
                  sickDatesPerPegawai[pId].add(dStr);
                } else {
                  izinDatesPerPegawai[pId].add(dStr);
                }
                cDate.add(1, 'day');
              }
            }
          }
        }

        for (const pId of teacherIds) {
          const sessions = teacherScheduledSessions[pId] || [];
          const availableJurnalCount = { ...jurnalDateCount };

          for (const ses of sessions) {
            const dStr = ses.date;
            const slotKey1 = `${pId}_${dStr}_${ses.id_jadwal}`;
            const slotKey2 = `${pId}_${dStr}_${ses.id_jam_pelajaran}_${ses.id_lokasi}`;
            const dateKey = `${pId}_${dStr}`;

            const hasSlotJurnal =
              jurnalSlots.has(slotKey1) ||
              (ses.id_jam_pelajaran &&
                ses.id_lokasi &&
                jurnalSlots.has(slotKey2));
            const hasGeneralJurnal = (availableJurnalCount[dateKey] || 0) > 0;

            if (hasSlotJurnal || hasGeneralJurnal) {
              teacherMap[pId].hadir += 1;
              if (!hasSlotJurnal && availableJurnalCount[dateKey] > 0) {
                availableJurnalCount[dateKey] -= 1;
              }
            } else if (sickDatesPerPegawai[pId]?.has(dStr)) {
              teacherMap[pId].sakit += 1;
            } else if (izinDatesPerPegawai[pId]?.has(dStr)) {
              teacherMap[pId].izin += 1;
            } else {
              teacherMap[pId].alfa += 1;
            }
          }
        }
      } catch (err) {
        console.error('Error computing rekapGuru attendance:', err);
      }
    }

    let result = Object.values(teacherMap).map((g: any) => {
      const jmlAbsen = g.sakit + g.izin + g.alfa;
      const wajibHadir = g.wajib_hadir || 0;
      const hadirCount =
        g.hadir !== undefined ? g.hadir : Math.max(0, wajibHadir - jmlAbsen);
      let kehadiranPersen = 0;

      if (wajibHadir > 0) {
        kehadiranPersen = Math.min(
          100,
          Math.max(0, Math.round((hadirCount / wajibHadir) * 1000) / 10)
        );
      } else if (jmlAbsen === 0) {
        kehadiranPersen = 100;
      }

      const totalMin = teacherMinutes[g.id_pegawai] || 0;
      const totalJamHours = Math.floor(totalMin / 60);
      const totalJamMins = totalMin % 60;
      const totalJamDecimal = Math.round((totalMin / 60) * 10) / 10;
      const totalJamLabel =
        totalMin > 0
          ? totalJamMins > 0
            ? `${totalJamHours} Jam ${totalJamMins} Menit`
            : `${totalJamHours} Jam`
          : '0 Jam';

      return {
        id_pegawai: g.id_pegawai,
        nip: g.nip,
        nama: g.nama,
        nama_guru: g.nama_guru,
        wajib_hadir: wajibHadir,
        hadir: hadirCount,
        total_hadir: hadirCount,
        sakit: g.sakit,
        izin: g.izin,
        alfa: g.alfa,
        jml_absen: jmlAbsen,
        jml: hadirCount,
        total: hadirCount,
        total_menit: totalMin,
        total_jam: totalJamDecimal,
        total_jam_label: totalJamLabel,
        total_jam_display: totalJamLabel,
        kehadiran_persen: kehadiranPersen,
        persentase_kehadiran: `${kehadiranPersen}%`,
        jadwal_mingguan: g.jadwal_mingguan,
        lembaga_nama: g.lembaga_nama,
      };
    });

    if (data?.keyword) {
      const kw = data.keyword.toLowerCase();
      result = result.filter(
        (item) =>
          item.nama.toLowerCase().includes(kw) ||
          item.nip.toLowerCase().includes(kw)
      );
    }

    result.sort((a, b) => a.nama.localeCompare(b.nama));

    const total = result.length;
    let paginatedRows = result;
    if (data?.offset !== undefined && data?.limit !== undefined) {
      paginatedRows = result.slice(data.offset, data.offset + data.limit);
    }

    return {
      count: total,
      rows: paginatedRows,
      all: result,
      meta: {
        startDate: startDateStr,
        endDate: endDateStr,
        bulanLabel: startDate.locale('id').format('MMMM YYYY'),
      },
    };
  }
}

export const repository = new Repository();
