'use strict';

import moment from 'moment';
import fs from 'fs/promises';
import ExcelJS from 'exceljs';
import { Op } from 'sequelize';
import JenisGuru from './jenis.guru.model';
import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './jenis.guru.variable';
import { response } from '../../../helpers/response';
import { repository } from './jenis.guru.repository';
import { sequelize } from '../../../database/connection';
import {
  ALREADY_EXIST,
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
} from '../../../utils/constant';
import { repository as repoPegawai } from '../pegawai/pegawai.repository';
import { repository as repoTingkat } from '../tingkat/tingkat.repository';
import { repository as repoMapel } from '../mata.pelajaran/mata.pelajaran.repository';
import { repository as repoLembagaFormal } from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.repository';

const generateDataExcel = (sheet: any, details: any) => {
  sheet.addRow([
    'No',
    'Guru',
    'Mata Pelajaran',
    'Lembaga',
    'Tipe',
    'Tingkat',
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
      details[i]?.pegawai?.nama_lengkap || '',
      details[i]?.mata_pelajaran?.nama_mapel || '',
      details[i]?.lembaga_formal?.nama_lembaga || '',
      details[i]?.lembaga_type || '',
      details[i]?.tingkat?.tingkat || '',
      details[i]?.status == 'A' ? 'Aktif' : 'Tidak Aktif',
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
  nama_guru: String(row['Guru'] || '').trim(),
  nama_mapel: String(row['Mata Pelajaran'] || '').trim(),
  lembaga_type: String(row['Tipe'] || '').trim(),
  nama_lembaga: String(row['Lembaga'] || '').trim(),
  nama_tingkat: String(row['Tingkat'] || '').trim(),
  status: row['Status'] === 'Aktif' ? 'A' : 'N',
  keterangan: String(row['Keterangan'] || '').trim(),
  __row: row.__row,
});

const validateRow = (row: any) => {
  const errors: string[] = [];
  if (!row.nama_guru) {
    errors.push('Nama Guru wajib diisi');
  }
  if (!row.nama_mapel) {
    errors.push('Mata Pelajaran Type wajib diisi');
  }
  if (!row.lembaga_type) {
    errors.push('Lembaga Type wajib diisi');
  }
  if (!row.nama_lembaga) {
    errors.push('Lembaga wajib diisi');
  }
  if (!row.nama_tingkat) {
    errors.push('Tingkat wajib diisi');
  }
  return errors;
};

export default class Controller {
  public async list(req: Request, res: Response) {
    try {
      const result = await repository.list({});
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`jenis guru mata pelajaran list: ${err?.message}`, 500, res);
    }
  }

  public async index(req: Request, res: Response) {
    try {
      const query = helper.fetchQueryRequest(req);
      const { count, rows } = await repository.index(query);
      if (rows?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(
        SUCCESS_RETRIEVED,
        { total: count, values: rows },
        res
      );
    } catch (err: any) {
      return helper.catchError(`jenis guru mata pelajaran index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({
        id_jenisguru: id,
      });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`jenis guru mata pelajaran detail: ${err?.message}`, 500, res);
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { nama_jenis_guru, id_guru, id_lembaga, id_mapel, id_tingkat } = req?.body;
      const check = await repository.detail({ nama_jenis_guru });
      if (check) return response.failed(ALREADY_EXIST, 400, res);
      const data: Object = helper.only(variable.fillable(), req?.body);
      await repository.create({
        payload: {
          ...data,
          id_guru: id_guru?.value || null, 
          id_lembaga: id_lembaga?.value || null, 
          id_mapel: id_mapel?.value || null, 
          id_tingkat: id_tingkat?.value || null, 
        },
      });
      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(`jenis guru mata pelajaran create: ${err?.message}`, 500, res);
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const { id_guru, id_lembaga, id_mapel, id_tingkat } = req?.body;
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_jenisguru: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      const data: Object = helper.only(variable.fillable(), req?.body, true);
      await repository.update({
        payload: {
          ...data,
          id_guru: id_guru?.value || null, 
          id_lembaga: id_lembaga?.value || null, 
          id_mapel: id_mapel?.value || null, 
          id_tingkat: id_tingkat?.value || null, 
        },
        condition: { id_jenisguru: id },
      });
      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(`jenis guru mata pelajaran update: ${err?.message}`, 500, res);
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_jenisguru: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_jenisguru: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(`jenis guru mata pelajaran delete: ${err?.message}`, 500, res);
    }
  }
  
  public async export(req: Request, res: Response) {
    try {
      let condition: any = {};
      const { q, template } = req?.body;
      const isTemplate: boolean = template && template == '1';
      if (q) {
        condition = {
          ...condition,
          nama_mapel: { [Op.like]: `%${q}%` },
        };
      }

      let result: any = [];
      if (!isTemplate) {
        result = await repository.list(condition);
        if (result?.length < 1)
          return response.success(NOT_FOUND, null, res, false);
      }

      const { dir, path } = await helper.checkDirExport('excel');

      const name: string = 'guru-mata-pelajaran';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title);

      generateDataExcel(sheet, result);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel guru mata pelajaran', urlExcel, res);
    } catch (err: any) {
      return helper.catchError(
        `export excel guru mata pelajaran: ${err?.message}`,
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

      for (const raw of rows) {
        const row = normalizeRow(raw);
        const errors = validateRow(row);

        let id_lembaga: string | null = null;
        let nama_lembaga: string | null = null;
        if (row.nama_lembaga) {
          const lembaga = await repoLembagaFormal.detail({
            nama_lembaga: row.nama_lembaga,
          });

          if (!lembaga) {
            errors.push(`Lembaga "${row.nama_lembaga}" tidak ditemukan`);
          } else {
            id_lembaga = lembaga.id_lembaga;
            nama_lembaga = lembaga.getDataValue('nama_lembaga');
          }
        }

        let id_guru: string | null = null;
        let nama_guru: string | null = null;
        if (row.nama_guru) {
          const pegawai = await repoPegawai.detail({
            nama_lengkap: row.nama_guru,
          });

          if (!pegawai) {
            errors.push(`Guru "${row.nama_guru}" tidak ditemukan`);
          } else {
            id_guru = pegawai.id_pegawai;
            nama_guru = pegawai.getDataValue('nama_lengkap');
          }
        }

        let id_mapel: string | null = null;
        let nama_mapel: string | null = null;
        if (row.nama_mapel) {
          const mapel = await repoMapel.detail({
            nama_mapel: row.nama_mapel,
          });

          if (!mapel) {
            errors.push(`Mata Pelajaran "${row.nama_mapel}" tidak ditemukan`);
          } else {
            id_mapel = mapel.id_mapel;
            nama_mapel = mapel.getDataValue('nama_mapel');
          }
        }

        let id_tingkat: string | null = null;
        let nama_tingkat: string | null = null;
        if (row.nama_tingkat) {
          const tingkat = await repoTingkat.detail({
            tingkat: row.nama_tingkat,
          });

          if (!tingkat) {
            errors.push(`Tingkat "${row.nama_tingkat}" tidak ditemukan`);
          } else {
            id_tingkat = tingkat.id_tingkat;
            nama_tingkat = tingkat.getDataValue('tingkat');
          }
        }
        const valid = errors.length === 0;

        const payload = {
          nama_jenis_guru: nama_guru,
          keterangan: row.keterangan ?? null,
          status: row.status ?? 'A',
          lembaga_type: row.lembaga_type,
          id_tingkat,
          id_lembaga,
          id_guru,
          id_mapel,
        };

        results.push({
          row: row.__row,
          valid,
          error: errors.length ? errors.join(', ') : null,
          payload: {
            ...payload,
            nama_guru,
            nama_lembaga,
            nama_mapel,
            nama_tingkat,
          },
        });
        if (mode === 'preview' || !valid) continue;

        const existing = await repository.detail({
          nama_jenis_guru: row.nama_guru,
        });

        if (existing) {
          await existing.update(
            {
              ...payload,
              updated_at: helper.date(),
            },
            { transaction: trx! }
          );
        } else {
          await JenisGuru.create(
            {
              ...payload,
              created_at: helper.date(),
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
        return response.success('import guru mata pelajaran berhasil', dataRes, res);
      }

      return response.success(
        'preview import guru mata pelajaran',
        {
          ...dataRes,
          data: results,
        },
        res
      );
    } catch (err: any) {
      if (trx) await trx.rollback();

      console.error(err);
      return helper.catchError(
        `import excel guru mata pelajaran: ${err?.message}`,
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
      for (const payload of payloads) {
        const existing = await repository.detail({
          nama_jenis_guru: payload.nama_jenis_guru,
        });

        if (existing) {
          await existing.update(
            {
              ...payload,
              updated_at: helper.date(),
            },
            { transaction: trx }
          );
        } else {
          await JenisGuru.create(
            {
              ...payload,
              created_at: helper.date(),
            },
            { transaction: trx }
          );
        }
      }
      await trx.commit();

      return response.success(
        'Import batch guru mata pelajaran berhasil',
        { total: payloads.length },
        res
      );
    } catch (err: any) {
      await trx.rollback();
      return helper.catchError(`Import batch gagal: ${err.message}`, 500, res);
    }
  }
}

export const guruMapel = new Controller();
