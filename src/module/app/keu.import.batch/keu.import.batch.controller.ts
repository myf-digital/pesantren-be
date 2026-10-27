'use strict';

import ExcelJS from 'exceljs';
import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './keu.import.batch.variable';
import { response } from '../../../helpers/response';
import { repository } from './keu.import.batch.repository';
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
import { keuImportBatchSchema } from './keu.import.batch.schema';
import { sequelize } from '../../../database/connection';
import fs from 'fs/promises';
import KeuImportBatch from './keu.import.batch.model';
import { z } from 'zod';
import { Op } from 'sequelize';

const columns: [string, string][] = [
  ['id_batch', 'ID Batch'],
  ['jenis_data', 'Jenis Data'],
  ['nama_file', 'Nama File'],
  ['hash_file', 'Hash File'],
  ['periode_awal', 'Periode Awal'],
  ['periode_akhir', 'Periode Akhir'],
  ['sumber_data', 'Sumber Data'],
  ['status_batch', 'Status Batch'],
  ['jumlah_baris', 'Jumlah Baris'],
  ['jumlah_valid', 'Jumlah Valid'],
  ['jumlah_error', 'Jumlah Error'],
  ['catatan', 'Catatan'],
  ['diimpor_oleh', 'Diimpor Oleh'],
  ['waktu_import', 'Waktu Import'],
  ['dipublikasikan_oleh', 'Dipublikasikan Oleh'],
  ['waktu_publikasi', 'Waktu Publikasi'],
  ['menggantikan_batch_id', 'Menggantikan Batch ID'],
];
const generateDataExcel = (sheet: ExcelJS.Worksheet, details: any[]) => {
  sheet.columns = columns.map(([, header]) => ({ header, width: 30 }));
  sheet.getRow(1).font = { bold: true };
  details.forEach((item) =>
    sheet.addRow(
      columns.map(([key]) => {
        const value = item[key];
        return value instanceof Date ? value.toISOString() : (value ?? '');
      })
    )
  );
};
const importItemSchema = keuImportBatchSchema.safeExtend({
  id_batch: z.string().uuid().optional(),
});

const validateReferences = async (payload: any, id?: string) => {
  const errors: string[] = [];
  if (
    payload.periode_awal &&
    payload.periode_akhir &&
    payload.periode_awal > payload.periode_akhir
  ) {
    errors.push('Periode awal tidak boleh melebihi periode akhir');
  }
  if (payload.menggantikan_batch_id) {
    if (payload.menggantikan_batch_id === id)
      errors.push('Batch tidak boleh menggantikan dirinya sendiri');
    else if (!(await KeuImportBatch.findByPk(payload.menggantikan_batch_id)))
      errors.push('Batch yang digantikan tidak ditemukan');
  }
  if (payload.hash_file && payload.status_batch !== 'Dibatalkan') {
    const duplicate = await KeuImportBatch.findOne({
      where: {
        jenis_data: payload.jenis_data,
        hash_file: payload.hash_file,
        status_batch: { [Op.ne]: 'Dibatalkan' },
        ...(id ? { id_batch: { [Op.ne]: id } } : {}),
      },
    });
    if (duplicate)
      errors.push('Hash file sudah digunakan untuk jenis data ini');
  }
  return errors;
};

export default class Controller {
  public async list(req: Request, res: Response) {
    try {
      const result = await repository.list(req.query);
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`batch impor list: ${err?.message}`, 500, res);
    }
  }

  public async index(req: Request, res: Response) {
    try {
      const query = {
        ...req.query,
        ...helper.fetchQueryRequest(req),
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
      return helper.catchError(`batch impor index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({
        id_batch: id,
      });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`batch impor detail: ${err?.message}`, 500, res);
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const errors = await validateReferences(req.body);
      if (errors.length) return response.failed(errors.join(', '), 400, res);
      const data: Object = Object.fromEntries(
        variable
          .fillable()
          .filter((key) => req.body[key] !== undefined)
          .map((key) => [key, req.body[key]])
      );
      await repository.create({
        payload: {
          ...data,
        },
      });

      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed(
          'Referensi batch impor tidak valid atau batch masih digunakan',
          400,
          res
        );
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(ALREADY_EXIST, 400, res);
      return helper.catchError(`batch impor create: ${err?.message}`, 500, res);
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_batch: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      const errors = await validateReferences(
        { ...check.get({ plain: true }), ...req.body },
        id
      );
      if (errors.length) return response.failed(errors.join(', '), 400, res);

      const data: Object = Object.fromEntries(
        variable
          .fillable()
          .filter((key) => req.body[key] !== undefined)
          .map((key) => [key, req.body[key]])
      );

      await repository.update({
        payload: {
          ...data,
        },
        condition: { id_batch: id },
      });

      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed(
          'Referensi batch impor tidak valid atau batch masih digunakan',
          400,
          res
        );
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(ALREADY_EXIST, 400, res);
      return helper.catchError(`batch impor update: ${err?.message}`, 500, res);
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_batch: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_batch: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed('Data masih digunakan oleh data lain', 400, res);
      return helper.catchError(`batch impor delete: ${err?.message}`, 500, res);
    }
  }

  public async export(req: Request, res: Response) {
    try {
      const { template } = req.body || {};
      const isTemplate: boolean = template && template == '1';

      let result: any = [];
      if (!isTemplate) {
        result = await repository.list(req.body || {});
        if (result?.length < 1)
          return response.success(NOT_FOUND, null, res, false);
      }

      const { dir, path } = await helper.checkDirExport('excel');

      const name: string = 'keu-import-batch';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().tz(TIMEZONE).format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title.slice(0, 31));

      generateDataExcel(sheet, result);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel batch impor', urlExcel, res);
    } catch (err: any) {
      return helper.catchError(
        `export excel batch impor: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async import(req: Request, res: Response) {
    const mode = req.body?.mode ?? 'preview';
    if (!['preview', 'commit'].includes(mode))
      return response.failed('Mode harus preview atau commit', 400, res);
    const uploaded = req.files?.file_import;
    if (!uploaded)
      return response.success('File tidak valid', null, res, false);
    try {
      const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      const buffer = file.tempFilePath
        ? await fs.readFile(file.tempFilePath)
        : file.data;
      const rows = await helper.parseImportFile({
        name: file.name,
        data: buffer,
      });
      const results: any[] = [];
      const ids = new Set<string>();
      const hashes = new Set<string>();
      for (const raw of rows) {
        const payload: any = {};
        for (const [key, header] of columns) {
          let value = raw[header];
          if (value === undefined || value === null || value === '') {
            if (
              ![
                'id_batch',
                'jenis_data',
                'status_batch',
                'jumlah_baris',
                'jumlah_valid',
                'jumlah_error',
                'waktu_import',
              ].includes(key)
            )
              payload[key] = null;
            continue;
          }
          if (['jumlah_baris', 'jumlah_valid', 'jumlah_error'].includes(key))
            value = Number(value);
          else if (value instanceof Date)
            value = key.startsWith('periode_')
              ? value.toISOString().slice(0, 10)
              : value.toISOString();
          else value = String(value).trim();
          payload[key] = value;
        }
        const parsed = importItemSchema.safeParse(payload);
        const errors = parsed.success
          ? await validateReferences(parsed.data, parsed.data.id_batch)
          : parsed.error.issues.map((issue) => issue.message);
        if (payload.id_batch && ids.has(payload.id_batch))
          errors.push('ID Batch duplikat dalam file');
        if (payload.id_batch) ids.add(payload.id_batch);
        if (payload.hash_file && payload.status_batch !== 'Dibatalkan') {
          const key = JSON.stringify([payload.jenis_data, payload.hash_file]);
          if (hashes.has(key))
            errors.push(
              'Hash file duplikat untuk jenis data yang sama dalam file'
            );
          hashes.add(key);
        }
        results.push({
          row: raw.__row,
          valid: errors.length === 0,
          error: errors.length ? errors.join(', ') : null,
          payload: parsed.success ? parsed.data : payload,
        });
      }
      if (mode === 'commit') {
        await sequelize.transaction(async (transaction) => {
          for (const row of results.filter((item) => item.valid)) {
            if (row.payload.id_batch)
              await KeuImportBatch.upsert(row.payload, {
                transaction,
                conflictFields: ['id_batch'],
              });
            else await KeuImportBatch.create(row.payload, { transaction });
          }
        });
      }
      return response.success(
        mode === 'commit'
          ? 'import batch impor berhasil'
          : 'preview import batch impor',
        {
          mode,
          total: results.length,
          valid: results.filter((row) => row.valid).length,
          invalid: results.filter((row) => !row.valid).length,
          ...(mode === 'preview' ? { data: results } : {}),
        },
        res
      );
    } catch (err: any) {
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Hash file sudah digunakan untuk jenis data ini',
          400,
          res
        );
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed('Referensi batch impor tidak valid', 400, res);
      return helper.catchError(`import batch impor: ${err.message}`, 500, res);
    }
  }

  public async insert(req: Request, res: Response) {
    if (!Array.isArray(req.body?.data) || !req.body.data.length)
      return response.success('Data import kosong', null, res, false);
    const parsed = importItemSchema.array().safeParse(req.body.data);
    if (!parsed.success)
      return response.failed(parsed.error.issues[0].message, 400, res);
    const ids = parsed.data.flatMap((row) =>
      row.id_batch ? [row.id_batch] : []
    );
    if (new Set(ids).size !== ids.length)
      return response.failed('ID Batch duplikat dalam batch', 400, res);
    const hashes = parsed.data
      .filter((row) => row.hash_file && row.status_batch !== 'Dibatalkan')
      .map((row) => JSON.stringify([row.jenis_data, row.hash_file]));
    if (new Set(hashes).size !== hashes.length)
      return response.failed(
        'Hash file duplikat untuk jenis data yang sama',
        400,
        res
      );
    try {
      for (const payload of parsed.data) {
        const errors = await validateReferences(payload, payload.id_batch);
        if (errors.length) return response.failed(errors.join(', '), 400, res);
      }
      await sequelize.transaction(async (transaction) => {
        for (const payload of parsed.data) {
          if (payload.id_batch)
            await KeuImportBatch.upsert(payload, {
              transaction,
              conflictFields: ['id_batch'],
            });
          else await KeuImportBatch.create(payload, { transaction });
        }
      });
      return response.success(
        'Import batch metadata berhasil',
        { total: parsed.data.length },
        res
      );
    } catch (err: any) {
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Hash file sudah digunakan untuk jenis data ini',
          400,
          res
        );
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed('Referensi batch impor tidak valid', 400, res);
      return helper.catchError(
        `Import batch metadata: ${err.message}`,
        500,
        res
      );
    }
  }
}
export const keuImportBatch = new Controller();
