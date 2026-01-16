'use strict';

import ExcelJS from 'exceljs';
import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './status.awal.santri.variable';
import { response } from '../../../helpers/response';
import { repository } from './status.awal.santri.repository';
import {
  ALREADY_EXIST,
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
} from '../../../utils/constant';
import moment from 'moment';
import { statusAwalSantriSchema } from './status.awal.santri.schema';
import { sequelize } from '../../../database/connection';
import fs from 'fs/promises';
import StatusAwalSantri from './status.awal.santri.model';

const date: string = helper.date();

const generateDataExcel = (sheet: any, details: any) => {
  sheet.addRow([
    'No',
    'Kode Status Awal',
    'Nama Status Awal',
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
      details[i]?.kode_status_awal || '',
      details[i]?.nama_status_awal || '',
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
  kode_status_awal: String(row['Kode Status Awal'] || '').trim(),
  nama_status_awal: String(row['Nama Status Awal'] || '').trim(),
  status: String(row['Status'] || '').trim(),
  keterangan: String(row['Keterangan'] || '').trim(),
  __row: row.__row,
});

const validateRow = (row: any) => {
  const errors: string[] = [];
  const valid = statusAwalSantriSchema.safeParse(row);

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
      return helper.catchError(
        `status awal santri list: ${err?.message}`,
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
        `status awal santri index: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({
        id_status_awal_santri: id,
      });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(
        `status awal santri detail: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { kode_status_awal } = req?.body;
      const check = await repository.detail({ kode_status_awal });
      if (check) return response.failed(ALREADY_EXIST, 400, res);
      const data: Object = helper.only(variable.fillable(), req?.body);
      await repository.create({
        payload: { ...data },
      });
      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `status awal santri create: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const { kode_status_awal } = req?.body;
      const check = await repository.detail({ id_status_awal_santri: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      if (kode_status_awal !== check.kode_status_awal) {
        const duplicate = await repository.detail({ kode_status_awal });

        if (duplicate) {
          return response.failed(ALREADY_EXIST, 400, res);
        }
      }

      const data: Object = helper.only(variable.fillable(), req?.body, true);
      await repository.update({
        payload: { ...data },
        condition: { id_status_awal_santri: id },
      });
      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `status awal santri update: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_status_awal_santri: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_status_awal_santri: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `status awal santri delete: ${err?.message}`,
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

      const name: string = 'status-awal-santri';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title);

      generateDataExcel(sheet, result);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel status awal santri', urlExcel, res);
    } catch (err: any) {
      return helper.catchError(
        `export excel status awal santri: ${err?.message}`,
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

        const kode_status_awal = row.kode_status_awal;

        const valid = errors.length === 0;

        const payload = {
          kode_status_awal: row.kode_status_awal,
          nama_status_awal: row.nama_status_awal,
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

        const existing = await repository.detail({ kode_status_awal });

        if (existing) {
          await existing.update({
            ...payload,
          }, { transaction: trx! });
        } else {
          let newCreate = await StatusAwalSantri.create({
            ...payload,
          }, { transaction: trx! });
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
          'import status awal santri berhasil',
          dataRes,
          res
        );
      }

      return response.success(
        'preview import status awal santri',
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
        `import excel status awal santri: ${err?.message}`,
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
          kode_status_awal: payload.kode_status_awal
        });

        if (existing) {
          await existing.update({
            ...payload,
          }, { transaction: trx });
        } else {
          let newCreate = await StatusAwalSantri.create({
            ...payload,
          }, { transaction: trx });
        }
      }

      await trx.commit();

      return response.success(
        'Import batch status awal santri berhasil',
        { total: payloads.length },
        res
      );
    } catch (err: any) {
      await trx.rollback();
      return helper.catchError(`Import batch gagal: ${err.message}`, 500, res);
    }
  }
}

export const statusAwalSantri = new Controller();
