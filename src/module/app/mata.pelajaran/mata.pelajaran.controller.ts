'use strict';

import moment from 'moment';
import fs from 'fs/promises';
import ExcelJS from 'exceljs';
import { Op } from 'sequelize';
import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import MataPelajaran from './mata.pelajaran.model';
import { variable } from './mata.pelajaran.variable';
import { response } from '../../../helpers/response';
import { repository } from './mata.pelajaran.repository';
import { sequelize } from '../../../database/connection';
import {
  ALREADY_EXIST,
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
} from '../../../utils/constant';
import { repository as repoKelPelajaran } from '../kelompok.pelajaran/kelompok.pelajaran.repository';
import { repository as repoLembagaFormal } from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.repository';

const generateDataExcel = (sheet: any, details: any) => {
  sheet.addRow([
    'No',
    'Kode',
    'Nama',
    'Tipe',
    'Lembaga',
    'Kelompok',
    'KKM',
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
      details[i]?.kode_mapel || '',
      details[i]?.nama_mapel || '',
      details[i]?.lembaga_type || '',
      details[i]?.lembaga_formal?.nama_lembaga || '',
      details[i]?.kelompok_pelajaran?.nama_kelpelajaran || '',
      details[i]?.kkm || '',
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
  kode_mapel: String(row['Kode'] || '').trim(),
  nama_mapel: String(row['Nama'] || '').trim(),
  lembaga_type: String(row['Tipe'] || '').trim(),
  nama_lembaga: String(row['Lembaga'] || '').trim(),
  nama_kelpelajaran: String(row['Kelompok'] || '').trim(),
  kkm: String(row['KKM'] || '').trim(),
  status: row['Status'] === 'Aktif' ? 'A' : 'N',
  keterangan: String(row['Keterangan'] || '').trim(),
  __row: row.__row,
});

const validateRow = (row: any) => {
  const errors: string[] = [];
  if (!row.kode_mapel) {
    errors.push('Kode Mata Pelajaran wajib diisi');
  }
  if (!row.nama_mapel) {
    errors.push('Nama Mata Pelajaran wajib diisi');
  }
  if (!row.lembaga_type) {
    errors.push('Lembaga Type wajib diisi');
  }
  if (!row.nama_lembaga) {
    errors.push('Lembaga wajib diisi');
  }
  if (!row.nama_kelpelajaran) {
    errors.push('Kelompok Pelajaran wajib diisi');
  }
  if (row.kkm !== null && Number.isNaN(row.kkm)) {
    errors.push('KKM harus angka');
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
      return helper.catchError(
        `mata pelajaran list: ${err?.message}`,
        500,
        res
      );
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
      return helper.catchError(
        `mata pelajaran index: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({ id_mapel: id });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(
        `mata pelajaran detail: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { id_kelpelajaran, id_lembaga, kode_mapel } = req?.body;
      const check = await repository.detail({ kode_mapel });
      if (check) return response.failed(ALREADY_EXIST, 400, res);
      const data: Object = helper.only(variable.fillable(), req?.body);
      await repository.create({
        payload: {
          ...data,
          id_kelpelajaran: id_kelpelajaran?.value || null,
          id_lembaga: id_lembaga?.value || null,
        },
      });
      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `mata pelajaran create: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_mapel: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      const { id_kelpelajaran, id_lembaga } = req?.body;
      const data: Object = helper.only(variable.fillable(), req?.body, true);
      await repository.update({
        payload: {
          ...data,
          id_kelpelajaran:
            id_kelpelajaran?.value || check?.getDataValue('id_kelpelajaran'),
          id_lembaga: id_lembaga?.value || check?.getDataValue('id_lembaga'),
        },
        condition: { id_mapel: id },
      });
      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `mata pelajaran update: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_mapel: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_mapel: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `mata pelajaran delete: ${err?.message}`,
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

      const name: string = 'mata-pelajaran';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title);

      generateDataExcel(sheet, result);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel mata pelajaran', urlExcel, res);
    } catch (err: any) {
      return helper.catchError(
        `export excel mata pelajaran: ${err?.message}`,
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

        let id_kelpelajaran: string | null = null;
        let nama_kelpelajaran: string | null = null;
        if (row.nama_kelpelajaran) {
          const kelPelajaran = await repoKelPelajaran.detail({
            nama_kelpelajaran: row.nama_kelpelajaran,
          });

          if (!kelPelajaran) {
            errors.push(`Kelompok Pelajaran "${row.nama_kelpelajaran}" tidak ditemukan`);
          } else {
            id_kelpelajaran = kelPelajaran.id_kelpelajaran;
            nama_kelpelajaran = kelPelajaran.getDataValue('nama_kelpelajaran');
          }
        }
        const valid = errors.length === 0;

        const payload = {
          kode_mapel: row.kode_mapel,
          nama_mapel: row.nama_mapel,
          kkm: row.kkm,
          keterangan: row.keterangan ?? null,
          status: row.status ?? 'A',
          lembaga_type: row.lembaga_type,
          id_kelpelajaran,
          id_lembaga,
        };

        results.push({
          row: row.__row,
          valid,
          error: errors.length ? errors.join(', ') : null,
          payload: {
            ...payload,
            nama_lembaga,
            nama_kelpelajaran,
          },
        });
        if (mode === 'preview' || !valid) continue;

        const existing = await repository.detail({
          kode_mapel: row.kode_mapel,
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
          await MataPelajaran.create(
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
        return response.success('import mata pelajaran berhasil', dataRes, res);
      }

      return response.success(
        'preview import mata pelajaran',
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
        `import excel mata pelajaran: ${err?.message}`,
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
          kode_mapel: payload.kode_mapel,
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
          await MataPelajaran.create(
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
        'Import batch mata pelajaran berhasil',
        { total: payloads.length },
        res
      );
    } catch (err: any) {
      await trx.rollback();
      return helper.catchError(`Import batch gagal: ${err.message}`, 500, res);
    }
  }
}

export const mataPelajaran = new Controller();
