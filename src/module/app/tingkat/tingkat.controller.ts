'use strict';

import ExcelJS from 'exceljs';
import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './tingkat.variable';
import { response } from '../../../helpers/response';
import { repository } from './tingkat.repository';
import {
  ALREADY_EXIST,
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
} from '../../../utils/constant';
import moment from 'moment';
import { sequelize } from '../../../database/connection';
import Tingkat from './tingkat.model';
import fs from 'fs/promises';

const date: string = helper.date();

const generateDataExcel = (sheet: any, details: any) => {
  sheet.addRow(['No', 'Tingkat', 'Tipe', 'Nomor Urut', 'Keterangan']);

  sheet.getRow(1).eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (let i in details) {
    sheet.addRow([
      parseInt(i) + 1,
      details[i]?.tingkat || '',
      details[i]?.tingkat_type || '',
      details[i]?.nomor_urut || '',
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
  tingkat: String(row['Tingkat'] || '').trim(),
  tingkat_type: String(row['Tipe'] || '').trim(),
  nomor_urut:
    row['Nomor Urut'] !== undefined ? Number(row['Nomor Urut']) : null,
  keterangan: String(row['Keterangan'] || '').trim(),
  __row: row.__row,
});

const validateRow = (row: any) => {
  const errors: string[] = [];
  if (!row.tingkat) {
    errors.push('Tingkat wajib diisi');
  }
  if (!row.tingkat_type) {
    errors.push('Tipe wajib diisi');
  }
  if (!['FORMAL', 'PESANTREN'].includes(row.tingkat_type)) {
    errors.push('Tipe wajib FORMAL/PESANTREN');
  }
  if (row.nomor_urut !== null && Number.isNaN(row.nomor_urut)) {
    errors.push('Nomor Urut harus angka');
  }
  return errors;
};

export default class Controller {
  public async list(req: Request, res: Response) {
    try {
      const type: any = req?.query?.type || '';
      const result = await repository.list({ type });
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`tingkat list: ${err?.message}`, 500, res);
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
      return helper.catchError(`tingkat index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({ id_tingkat: id });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`tingkat detail: ${err?.message}`, 500, res);
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { tingkat, tingkat_type, nomor_urut } = req?.body;
      const check = await repository.detail({ tingkat, tingkat_type });
      const nomorIsExist = await repository.detail({ nomor_urut });
      if (check || nomorIsExist)
        return response.failed(ALREADY_EXIST, 400, res);
      const data: Object = helper.only(variable.fillable(), req?.body);
      await repository.create({
        payload: { ...data },
      });
      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(`tingkat create: ${err?.message}`, 500, res);
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const { tingkat, tingkat_type, nomor_urut } = req?.body;
      const check = await repository.detail({ id_tingkat: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      if (tingkat !== check.tingkat || tingkat_type !== check.tingkat_type) {
        const duplicate = await repository.detail({ tingkat, tingkat_type });

        if (duplicate) {
          return response.failed(ALREADY_EXIST, 400, res);
        }
      }

      if (nomor_urut !== check.nomor_urut) {
        const nomorIsExist = await repository.detail({ nomor_urut });

        if (nomorIsExist) {
          return response.failed(ALREADY_EXIST, 400, res);
        }
      }
      const data: Object = helper.only(variable.fillable(), req?.body, true);
      await repository.update({
        payload: { ...data },
        condition: { id_tingkat: id },
      });
      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(`tingkat update: ${err?.message}`, 500, res);
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_tingkat: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_tingkat: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(`tingkat delete: ${err?.message}`, 500, res);
    }
  }

  public async export(req: Request, res: Response) {
    try {
      let condition: any = {};
      const { q, template } = req?.body;
      const isTemplate: boolean = template && template == '1';

      let result: any = [];
      if (!isTemplate) {
        result = await repository.list({ type: q });
        if (result?.length < 1)
          return response.success(NOT_FOUND, null, res, false);
      }

      const { dir, path } = await helper.checkDirExport('excel');

      const name: string = 'tingkat';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title);

      generateDataExcel(sheet, result);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel tingkat', urlExcel, res);
    } catch (err: any) {
      return helper.catchError(
        `export excel tingkat: ${err?.message}`,
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

        const tingkat = row.tingkat;
        const tingkat_type = row.tingkat_type;
        const nomor_urut = row.nomor_urut;

        if (!errors.find(e => e.split(' ').includes('Tipe'))) {
          const tingkatExist = await repository.detail({ tingkat, tingkat_type });
          if (tingkatExist && tingkatExist.getDataValue('nomor_urut') !== nomor_urut) {
            const nomorIsExist = await repository.detail({ nomor_urut });

            if (nomorIsExist) {
              errors.push(`Nomor Urut ${nomor_urut} sudah ada`);
            }
          }
        }

        const valid = errors.length === 0;

        const payload = {
          tingkat: row.tingkat,
          tingkat_type: row.tingkat_type,
          nomor_urut: row.nomor_urut,
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

        const existing = await repository.detail({ tingkat, tingkat_type });

        if (existing) {
          await existing.update({
            ...payload,
          }, { transaction: trx! });
        } else {
          await Tingkat.create({
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
          'import tingkat berhasil',
          dataRes,
          res
        );
      }

      return response.success(
        'preview import tingkat',
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
        `import excel tingkat: ${err?.message}`,
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
          tingkat: payload.tingkat,
          tingkat_type: payload.tingkat_type,
        });

        if (existing) {
          await existing.update({
            ...payload,
          }, { transaction: trx });
        } else {
          await Tingkat.create({
            ...payload,
          }, { transaction: trx });
        }
      }
      await trx.commit();

      return response.success(
        'Import batch tingkat berhasil',
        { total: payloads.length },
        res
      );
    } catch (err: any) {
      await trx.rollback();
      return helper.catchError(`Import batch gagal: ${err.message}`, 500, res);
    }
  }
}

export const tingkat = new Controller();
