'use strict';

import ExcelJS from 'exceljs';
import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './tahun.ajaran.variable';
import { response } from '../../../helpers/response';
import { repository } from './tahun.ajaran.repository';
import {
  ALREADY_EXIST,
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
} from '../../../utils/constant';
import { rawQuery } from '../../../helpers/rawQuery';
import { QueryTypes } from 'sequelize';
import moment from 'moment';
import fs from 'fs/promises';
import { tahunAjaranSchema } from './tahun.ajaran.schema';
import { sequelize } from '../../../database/connection';
import TahunAjaran from './tahun.ajaran.model';

const date: string = helper.date();

const generateDataExcel = (sheet: any, details: any) => {
  sheet.addRow(['No', 'Tahun Ajaran', 'Status', 'Keterangan']);

  sheet.getRow(1).eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (let i in details) {
    sheet.addRow([
      parseInt(i) + 1,
      details[i]?.tahun_ajaran || '',
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
  status: String(row['Status'] || '').trim(),
  keterangan: String(row['Keterangan'] || '').trim(),
  __row: row.__row,
});

const validateRow = (row: any) => {
  const errors: string[] = [];
  const valid = tahunAjaranSchema.safeParse(row);

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
      const status: any = req?.query?.status || '';
      const result = await repository.list({ status });
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`tahun ajaran list: ${err?.message}`, 500, res);
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
      return helper.catchError(`tahun ajaran index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({
        id_tahunajaran: id,
      });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(
        `tahun ajaran detail: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { tahun_ajaran } = req?.body;
      const check = await repository.detail({ tahun_ajaran });
      if (check) return response.failed(ALREADY_EXIST, 400, res);
      const data: Object = helper.only(variable.fillable(), req?.body);
      const result = await repository.create({
        payload: { ...data },
      });
      if (result.status === 'Aktif') {
        const query = `UPDATE tahun_ajaran SET status='Nonaktif' WHERE id_tahunajaran != :id_tahunajaran AND status != 'Arsip'`;
        const conn = await rawQuery.getConnection();
        await conn.query(query, {
          type: QueryTypes.UPDATE,
          replacements: {
            id_tahunajaran: result.id_tahunajaran,
          },
        });
      }
      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `tahun ajaran create: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const { tahun_ajaran, status } = req?.body;
      const check = await repository.detail({ id_tahunajaran: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      if (tahun_ajaran && tahun_ajaran !== check.tahun_ajaran) {
        const duplicate = await repository.detail({ tahun_ajaran });

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
        payload: { ...data, ...newData },
        condition: { id_tahunajaran: id },
      });

      if (status === 'Aktif') {
        const query = `UPDATE tahun_ajaran SET status='Nonaktif' WHERE id_tahunajaran != :id_tahunajaran AND status != 'Arsip'`;
        const conn = await rawQuery.getConnection();
        await conn.query(query, {
          type: QueryTypes.UPDATE,
          replacements: {
            id_tahunajaran: id,
          },
        });
      }
      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `tahun ajaran update: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_tahunajaran: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_tahunajaran: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `tahun ajaran delete: ${err?.message}`,
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

      const name: string = 'tahun-ajaran';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title);

      generateDataExcel(sheet, result);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel tahun ajaran', urlExcel, res);
    } catch (err: any) {
      return helper.catchError(
        `export excel tahun ajaran: ${err?.message}`,
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
        const status = row.status;

        const valid = errors.length === 0;

        const payload = {
          tahun_ajaran: row.tahun_ajaran,
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

        const existing = await repository.detail({ tahun_ajaran });

        if (existing) {
          await existing.update(
            {
              ...payload,
            },
            { transaction: trx! }
          );
          if (status === 'Aktif') {
            data = existing;
          }
        } else {
          let newCreate = await TahunAjaran.create(
            {
              ...payload,
            },
            { transaction: trx! }
          );
          if (status === 'Aktif') {
            data = newCreate;
          }
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

        if (data) {
          const query = `UPDATE tahun_ajaran SET status='Nonaktif' WHERE id_tahunajaran != :id_tahunajaran AND status != 'Arsip'`;
          const conn = await rawQuery.getConnection();
          await conn.query(query, {
            type: QueryTypes.UPDATE,
            replacements: {
              id_tahunajaran: data.id_tahunajaran,
            },
          });
        }

        return response.success('import tahun ajaran berhasil', dataRes, res);
      }

      return response.success(
        'preview import tahun ajaran',
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
        `import excel tahun ajaran: ${err?.message}`,
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
          tahun_ajaran: payload.tahun_ajaran,
        });

        if (existing) {
          await existing.update(
            {
              ...payload,
            },
            { transaction: trx }
          );
          if (payload.status === 'Aktif') {
            data = existing;
          }
        } else {
          let newCreate = await TahunAjaran.create(
            {
              ...payload,
            },
            { transaction: trx }
          );
          if (payload.status === 'Aktif') {
            data = newCreate;
          }
        }
      }

      await trx.commit();

      if (data) {
        const query = `UPDATE tahun_ajaran SET status='Nonaktif' WHERE id_tahunajaran != :id_tahunajaran AND status != 'Arsip'`;
        const conn = await rawQuery.getConnection();
        await conn.query(query, {
          type: QueryTypes.UPDATE,
          replacements: {
            id_tahunajaran: data.id_tahunajaran,
          },
        });
      }

      return response.success(
        'Import batch tahun ajaran berhasil',
        { total: payloads.length },
        res
      );
    } catch (err: any) {
      await trx.rollback();
      return helper.catchError(`Import batch gagal: ${err.message}`, 500, res);
    }
  }
}

export const tahunAjaran = new Controller();
