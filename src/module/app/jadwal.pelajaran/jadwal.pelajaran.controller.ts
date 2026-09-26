'use strict';

import ExcelJS from 'exceljs';
import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './jadwal.pelajaran.variable';
import { response } from '../../../helpers/response';
import { repository } from './jadwal.pelajaran.repository';
import {
  ALREADY_EXIST,
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
  TIMEZONE,
} from '../../../utils/constant';
import moment from 'moment';
import { jadwalPelajaranSchema } from './jadwal.pelajaran.schema';
import { repository as jamPelajaranRepository } from '../jam.pelajaran/jam.pelajaran.repository';
import { repository as lembagaFormalRepository } from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.repository';
import { repository as lembagaKepesantrenanRepository } from '../lembaga.pendidikan.kepesantrenan/lembaga.pendidikan.kepesantrenan.repository';
import { repository as mapelRepository } from '../mata.pelajaran/mata.pelajaran.repository';
import { repository as guruRepository } from '../pegawai/pegawai.repository';
import { repository as lokasiRepository } from '../location/location.repository';
import { repository as guruMapelRepository } from '../jenis.guru/jenis.guru.repository';
import { repository as kelasFormalRepository } from '../kelas.formal/kelas.formal.repository';
import { repository as kelasMdaRepository } from '../kelas.mda/kelas.mda.repository';
import { repository as tahunAjaranRepository } from '../tahun.ajaran/tahun.ajaran.repository';
import { repository as semesterRepository } from '../semester/semester.repository';
import { sequelize } from '../../../database/connection';
import fs from 'fs/promises';
import JadwalPelajaran from './jadwal.pelajaran.model';

const date: string = helper.date();

const generateDataExcel = (sheet: any, details: any) => {
  sheet.addRow([
    'No',
    'Tahun Ajaran',
    'Semester',
    'Hari',
    'Jam',
    'Kelas/Lembaga',
    'Mata Pelajaran',
    'Guru',
    'Lokasi',
    'Status',
    'Keterangan',
  ]);

  sheet.getRow(1).eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (let i in details) {
    sheet.addRow([
      parseInt(i) + 1,
      details[i]?.tahun_ajaran?.tahun_ajaran || '',
      details[i]?.semester?.nama_semester || '',
      details[i]?.hari || '',
      details[i]?.jam_pelajaran
        ? `${details[i]?.jam_pelajaran?.mulai.slice(0, -3)} - ${details[i]?.jam_pelajaran?.selesai.slice(0, -3)}`
        : '',
      `${details[i]?.kelas_formal ? details[i]?.kelas_formal?.nama_kelas : details[i]?.kelas_mda?.nama_kelas_mda} (${details[i]?.kelas_formal ? details[i]?.kelas_formal?.lembaga?.nama_lembaga : details[i]?.kelas_mda?.lembaga?.nama_lembaga})`,
      details[i]?.jenis_guru?.mata_pelajaran?.nama_mapel || '',
      details[i]?.jenis_guru?.pegawai?.nama_lengkap || '',
      details[i]?.lokasi?.nama_lokasi || '',
      details[i]?.status,
      details[i]?.keterangan || '',
    ]);
  }

  for (let row = 1; row <= details?.length + 1; row++) {
    sheet.getRow(row).eachCell((cell: any) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });
  }

  return sheet;
};

const normalizeRow = (row: any) => ({
  tahun_ajaran: String(row['Tahun Ajaran'] || '').trim(),
  semester: String(row['Semester'] || '').trim(),
  hari: String(row['Hari'] || '').trim(),
  jam: String(row['Jam'] || '').trim(),
  kelas: String(row['Kelas/Lembaga'] || '').trim(),
  mapel: String(row['Mata Pelajaran'] || '').trim(),
  guru: String(row['Guru'] || '').trim(),
  lokasi: String(row['Lokasi'] || '').trim(),
  status: String(row['Status'] || '').trim(),
  keterangan: String(row['Keterangan'] || '').trim(),
  __row: row.__row,
});

const validateRow = (row: any) => {
  const errors: string[] = [];
  const valid = jadwalPelajaranSchema.safeParse(row);

  if (!valid.success) {
    for (const e of valid.error.issues) {
      errors.push(e.message);
    }
  }

  return errors;
};

export default class Controller {
  public async list(req: Request, res: Response) {
    try {
      const query = {
        status: req?.query?.status || '',
        id_lokasi: req?.query?.id_lokasi || '',
        id_kelas: req?.query?.id_kelas || '',
        id_kelas_mda: req?.query?.id_kelas_mda || '',
        hari: req?.query?.hari || '',
        id_pegawai: req?.query?.id_pegawai || '',
        id_lokasi_parent: req?.query?.id_lokasi_parent || '',
        id_tahunajaran: req?.query?.id_tahunajaran || '',
        id_semester: req?.query?.id_semester || '',
      };
      const result = await repository.list(query);
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(
        `jadwal pelajaran list: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async index(req: Request, res: Response) {
    try {
      const query = {
        ...helper.fetchQueryRequest(req),
        status: req?.query?.status || '',
        id_lokasi: req?.query?.id_lokasi || '',
        id_kelas: req?.query?.id_kelas || '',
        id_kelas_mda: req?.query?.id_kelas_mda || '',
        hari: req?.query?.hari || '',
        id_pegawai: req?.query?.id_pegawai || '',
        id_lokasi_parent: req?.query?.id_lokasi_parent || '',
      };

      const { count, rows } = await repository.index(query);
      if (rows?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(
        SUCCESS_RETRIEVED,
        { total: count, values: rows },
        res
      );
    } catch (err: any) {
      return helper.catchError(
        `jadwal pelajaran index: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({
        id_jadwal: id,
      });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(
        `jadwal pelajaran detail: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const {
        hari,
        id_kelas,
        id_tahunajaran,
        id_gmapel,
        id_jam_pelajaran,
        id_semester,
        id_lokasi,
      } = req?.body;

      const idKelas = id_kelas?.value || null;
      const idTahunajaran = id_tahunajaran?.value || null;
      const idGmapel = id_gmapel?.value || null;
      const idJamPelajaran = id_jam_pelajaran?.value || null;
      const idSemester = id_semester?.value || null;
      const idLokasi = id_lokasi?.value || null;

      const check = await repository.detail({
        hari,
        id_kelas: idKelas,
        id_jam_pelajaran: idJamPelajaran,
      });

      if (check) return response.failed(ALREADY_EXIST, 400, res);
      const data: Object = helper.only(variable.fillable(), req?.body);
      const result = await repository.create({
        payload: {
          ...data,
          id_gmapel: idGmapel,
          id_jam_pelajaran: idJamPelajaran,
          id_kelas: idKelas,
          id_tahunajaran: idTahunajaran,
          id_semester: idSemester,
          id_lokasi: idLokasi,
        },
      });

      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `jadwal pelajaran create: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const {
        hari,
        id_kelas,
        id_tahunajaran,
        status,
        id_gmapel,
        id_jam_pelajaran,
        id_semester,
        id_lokasi,
      } = req?.body;
      const idKelas = id_kelas?.value;
      const idTahunajaran = id_tahunajaran?.value;
      const idGmapel = id_gmapel?.value;
      const idJamPelajaran = id_jam_pelajaran?.value;
      const idSemester = id_semester?.value;
      const idLokasi = id_lokasi?.value;
      const check = await repository.detail({ id_jadwal: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      if (
        hari !== check.hari ||
        idKelas !== check.id_kelas ||
        idJamPelajaran !== check.id_jam_pelajaran
      ) {
        const duplicate = await repository.detail({
          hari,
          id_kelas: idKelas,
          id_jam_pelajaran: idJamPelajaran,
        });

        if (duplicate) {
          return response.failed(ALREADY_EXIST, 400, res);
        }
      }
      const data: Object = helper.only(variable.fillable(), req?.body, true);

      let newData: Object = {};
      if (status === 'Arsip') {
        newData = { archived_at: date, archived_by: req?.user?.id };
      }

      await repository.update({
        payload: {
          ...data,
          ...newData,
          id_tahunajaran:
            idTahunajaran || check?.getDataValue('id_tahunajaran'),
          id_gmapel: idGmapel || check?.getDataValue('id_gmapel'),
          id_jam_pelajaran:
            idJamPelajaran || check?.getDataValue('id_jam_pelajaran'),
          id_kelas: idKelas || check?.getDataValue('id_kelas'),
          id_semester: idSemester || check?.getDataValue('id_semester'),
          id_lokasi: idLokasi || check?.getDataValue('id_lokasi'),
        },
        condition: { id_jadwal: id },
      });

      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `jadwal pelajaran update: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_jadwal: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_jadwal: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `jadwal pelajaran delete: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async export(req: Request, res: Response) {
    try {
      let condition: any = {};
      const { q, template } = req?.body;
      const isTemplate: boolean = template && template == '1';

      let result: any = [];
      if (!isTemplate) {
        result = await repository.list({ status: q });
        if (result?.length < 1)
          return response.success(NOT_FOUND, null, res, false);
      }

      const { dir, path } = await helper.checkDirExport('excel');

      const name: string = 'jadwal-pelajaran';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().tz(TIMEZONE).format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title);

      generateDataExcel(sheet, result);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel jadwal pelajaran', urlExcel, res);
    } catch (err: any) {
      return helper.catchError(
        `export excel jadwal pelajaran: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async import(req: Request, res: Response) {
    const mode: 'preview' | 'commit' = req.body?.mode ?? 'preview';
    const uploaded = req.files?.file_import;

    if (!uploaded) {
      return response.success('File tidak valid', null, res, false);
    }

    const trx = mode === 'commit' ? await sequelize.transaction() : null;

    try {
      let buffer: Buffer;
      const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      if (file.tempFilePath) {
        buffer = await fs.readFile(file.tempFilePath);
      } else if (file.data) {
        buffer = file.data;
      } else {
        return response.success(
          'File kosong atau gagal dibaca',
          null,
          res,
          false
        );
      }

      const results: any[] = [];
      const rows = await helper.parseImportFile({
        name: file.name,
        data: buffer,
      });

      let data = null;
      for (const raw of rows) {
        const row = normalizeRow(raw);
        const errors = validateRow(row);

        const tahun_ajaran = row.tahun_ajaran;
        const semester = row.semester;
        const hari = row.hari;
        const jam = row.jam.split(' - ');
        const kelas = row.kelas.split('(');
        const jamMulai = jam[0];
        const jamSelesai = jam[1];
        const kelasName = kelas[0].trim();
        const nama_lembaga = kelas[1].replace(')', '');
        const nama_mapel = row.mapel;
        const nama_lengkap = row.guru;
        const nama_lokasi = row.lokasi;

        const tahunAjaranExist = await tahunAjaranRepository.detail({
          tahun_ajaran,
        });
        if (!tahunAjaranExist) {
          errors.push(`Tahun Ajaran ${tahun_ajaran} tidak ditemukan`);
        }

        const semesterExist = await semesterRepository.detail({
          nama_semester: semester,
          id_tahunajaran: tahunAjaranExist?.id_tahunajaran || '',
        });
        if (!semesterExist) {
          errors.push(`Semester ${semester} tidak ditemukan`);
        }

        let idLembaga = null;
        let typeLembaga = null;
        const lembagaFormalExist = await lembagaFormalRepository.detail({
          nama_lembaga,
        });

        if (!lembagaFormalExist) {
          const lembagaKepesantrenanExist =
            await lembagaKepesantrenanRepository.detail({ nama_lembaga });

          if (!lembagaKepesantrenanExist) {
            errors.push(`Lembaga ${nama_lembaga} tidak ditemukan`);
          } else {
            idLembaga = lembagaKepesantrenanExist?.id_lembaga;
            typeLembaga = 'PESANTREN';
          }
        } else {
          idLembaga = lembagaFormalExist?.id_lembaga;
          typeLembaga = 'FORMAL';
        }

        const jamPelajaranExist = await jamPelajaranRepository.detail({
          mulai: jamMulai,
          selesai: jamSelesai,
          id_lembaga: idLembaga || '',
        });
        if (!jamPelajaranExist) {
          errors.push(
            `Jam Pelajaran ${jamMulai} - ${jamSelesai} tidak ditemukan`
          );
        }

        const lokasiExist = await lokasiRepository.detail({ nama_lokasi });
        if (!lokasiExist) {
          errors.push(`Lokasi ${nama_lokasi} tidak ditemukan`);
        }

        const mapelExist = await mapelRepository.detail({
          nama_mapel,
          id_lembaga: idLembaga || '',
        });
        const guruExist = await guruRepository.detail({ nama_lengkap });

        const guruMapelExist = await guruMapelRepository.detail({
          id_guru: guruExist?.id_pegawai || '',
          id_mapel: mapelExist?.id_mapel || '',
          id_lembaga: idLembaga || '',
        });
        if (!guruMapelExist) {
          errors.push(`Guru & Mata Pelajaran tidak ditemukan`);
        }

        let idKelas = null;
        if (typeLembaga == 'FORMAL') {
          const kelasFormalExist = await kelasFormalRepository.detail({
            nama_kelas: kelasName,
            id_tingkat: guruMapelExist?.id_tingkat || '',
          });

          if (!kelasFormalExist) {
            errors.push(`Kelas ${kelasName} tidak ditemukan`);
          } else {
            idKelas = kelasFormalExist?.id_kelas;
          }
        } else {
          const kelasMdaExist = await kelasMdaRepository.detail({
            nama_kelas_mda: kelasName,
            id_tingkat: guruMapelExist?.id_tingkat || '',
          });
          if (!kelasMdaExist) {
            errors.push(`Kelas ${kelasName} tidak ditemukan`);
          } else {
            idKelas = kelasMdaExist?.id_kelas_mda;
          }
        }

        const valid = errors.length === 0;

        const payload = {
          id_tahunajaran: tahunAjaranExist?.id_tahunajaran,
          id_kelas: idKelas,
          id_semester: semesterExist?.id_semester,
          id_lokasi: lokasiExist?.id_lokasi,
          id_gmapel: guruMapelExist?.id_jenisguru,
          id_jam_pelajaran: jamPelajaranExist?.id_jampel,
          tahun_ajaran: row.tahun_ajaran,
          semester: row.semester,
          jam: row.jam,
          kelas: row.kelas,
          mapel: row.mapel,
          guru: row.guru,
          lokasi: row.lokasi,
          hari: row.hari,
          status: row.status,
          keterangan: row.keterangan ?? null,
        };

        results.push({
          row: row.__row,
          valid,
          error: errors.length ? errors.join(', ') : null,
          payload: {
            ...payload,
          },
        });

        if (mode === 'preview' || !valid) continue;

        const existing = await repository.detail({
          hari,
          id_kelas: idKelas,
          id_jam_pelajaran: jamPelajaranExist?.id_jampel,
        });

        if (existing) {
          await existing.update(
            {
              ...payload,
            },
            { transaction: trx! }
          );
        } else {
          let newCreate = await JadwalPelajaran.create(
            {
              ...payload,
            },
            { transaction: trx! }
          );
        }
      }

      let dataRes = {
        mode,
        total: results.length,
        valid: results.filter((r) => r.valid).length,
        invalid: results.filter((r) => !r.valid).length,
      };

      if (trx) {
        await trx.commit();

        return response.success(
          'import jadwal pelajaran berhasil',
          dataRes,
          res
        );
      }

      return response.success(
        'preview import jadwal pelajaran',
        {
          ...dataRes,
          data: results,
        },
        res
      );
    } catch (err: any) {
      if (trx) await trx.rollback();

      //console.error(err);
      return helper.catchError(
        `import excel jadwal pelajaran: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async insert(req: Request, res: Response) {
    const payloads = req.body?.data as any[];

    if (!Array.isArray(payloads) || payloads.length === 0) {
      return response.success('Data import kosong', null, res, false);
    }

    const trx = await sequelize.transaction();
    try {
      let data = null;
      for (const payload of payloads) {
        const existing = await repository.detail({
          hari: payload.hari,
          id_tahunajaran: payload.id_tahunajaran,
          id_kelas: payload.id_kelas,
        });

        if (existing) {
          await existing.update(
            {
              ...payload,
            },
            { transaction: trx }
          );
        } else {
          let newCreate = await JadwalPelajaran.create(
            {
              ...payload,
            },
            { transaction: trx }
          );
        }
      }

      await trx.commit();

      return response.success(
        'Import batch jadwal pelajaran berhasil',
        { total: payloads.length },
        res
      );
    } catch (err: any) {
      await trx.rollback();
      return helper.catchError(`Import batch gagal: ${err.message}`, 500, res);
    }
  }
}

export const jadwalPelajaran = new Controller();
