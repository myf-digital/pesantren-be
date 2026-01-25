'use strict';

import moment from 'moment';
import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import { Op } from 'sequelize';
import AppRole from './role.model';
import { variable } from './role.variable';
import { Request, Response } from 'express';
import { repository } from './role.repository';
import { helper } from '../../../helpers/helper';
import { response } from '../../../helpers/response';
import { sequelize } from '../../../database/connection';
import {
  ALREADY_EXIST,
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
} from '../../../utils/constant';

const date: string = helper.date();

const generateDataExcel = (sheet: any, details: any) => {
  sheet.addRow(['No', 'Nama Role', 'Status']);

  sheet.getRow(1).eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (let i in details) {
    sheet.addRow([
      parseInt(i) + 1,
      details[i]?.role_name || '',
      details[i]?.status == 1 ? 'Aktif' : 'Nonaktif',
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
  role_name: String(row['Nama Role'] || '').trim(),
  status: row['Status'] == 'Aktif' ? 1 : 0,
  __row: row.__row,
});

const validateRow = (row: any) => {
  const errors: string[] = [];
  if (!row.role_name) {
    errors.push('Nama Role wajib diisi');
  }
  return errors;
};
export default class Controller {
  public async list(req: Request, res: Response) {
    try {
      const result = await repository.list();
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`role all-data: ${err?.message}`, 500, res);
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
      return helper.catchError(`role index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({ role_id: id });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`role detail: ${err?.message}`, 500, res);
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { role_name } = req?.body;
      const check = await repository.detail({ role_name });
      if (check) return response.failed(ALREADY_EXIST, 400, res);
      const data: Object = helper.only(variable.fillable(), req?.body);
      await repository.create({
        payload: { ...data, created_by: req?.user?.id },
      });
      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(`role create: ${err?.message}`, 500, res);
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ role_id: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      const data: Object = helper.only(variable.fillable(), req?.body, true);
      await repository.update({
        payload: { ...data, modified_by: req?.user?.id },
        condition: { role_id: id },
      });
      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(`role update: ${err?.message}`, 500, res);
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ role_id: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.update({
        payload: {
          status: 9,
          modified_by: req?.user?.id,
          modified_date: date,
        },
        condition: { role_id: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(`role delete: ${err?.message}`, 500, res);
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
          role_name: { [Op.like]: `%${q}%` },
        };
      }

      let result: any = [];
      if (!isTemplate) {
        result = await repository.list(condition);
        if (result?.length < 1)
          return response.success(NOT_FOUND, null, res, false);
      }

      const { dir, path } = await helper.checkDirExport('excel');

      const name: string = 'role';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title);

      generateDataExcel(sheet, result);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel role', urlExcel, res);
    } catch (err: any) {
      return helper.catchError(`export excel role: ${err?.message}`, 500, res);
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
        const valid = errors.length === 0;

        const payload = {
          role_name: row.role_name,
          status: row.status ?? 1,
        };

        results.push({
          row: row.__row,
          valid,
          error: errors.length ? errors.join(', ') : null,
          payload: payload,
        });
        if (mode === 'preview' || !valid) continue;

        const existing = await repository.detail({
          role_name: row.role_name.toLowerCase(),
        });

        if (existing) {
          await existing.update(
            {
              ...payload,
              modified_by: req?.user?.id,
              modified_date: helper.date(),
            },
            { transaction: trx! }
          );
        } else {
          await AppRole.create(
            {
              ...payload,
              created_by: req?.user?.id,
              created_date: helper.date(),
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
        return response.success('import role berhasil', dataRes, res);
      }

      return response.success(
        'preview import role',
        {
          ...dataRes,
          data: results,
        },
        res
      );
    } catch (err: any) {
      if (trx) await trx.rollback();

      console.error(err);
      return helper.catchError(`import excel role: ${err?.message}`, 500, res);
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
          role_name: payload.role_name.toLowerCase(),
        });

        if (existing) {
          await existing.update(
            {
              ...payload,
              modified_by: req?.user?.id,
              modified_date: helper.date(),
            },
            { transaction: trx }
          );
        } else {
          await AppRole.create(
            {
              ...payload,
              created_by: req?.user?.id,
              created_date: helper.date(),
            },
            { transaction: trx }
          );
        }
      }
      await trx.commit();

      return response.success(
        'Import batch role berhasil',
        { total: payloads.length },
        res
      );
    } catch (err: any) {
      await trx.rollback();
      return helper.catchError(`Import batch gagal: ${err.message}`, 500, res);
    }
  }
}

export const role = new Controller();
