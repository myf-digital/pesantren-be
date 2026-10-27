'use strict';

import ExcelJS from 'exceljs';
import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './keu.akun.variable';
import { response } from '../../../helpers/response';
import { repository } from './keu.akun.repository';
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
import { keuAkunSchema } from './keu.akun.schema';
import { sequelize } from '../../../database/connection';
import fs from 'fs/promises';
import KeuAkun from './keu.akun.model';
import KeuKelompokKas from '../keu.kelompok.kas/keu.kelompok.kas.model';

const generateDataExcel = (sheet: ExcelJS.Worksheet, details: any[]) => {
  sheet.columns = [
    { header: 'No', width: 8 },
    { header: 'Kode Akun', width: 25 },
    { header: 'Nama Akun', width: 40 },
    { header: 'Kode Kelompok', width: 25 },
    { header: 'Periodik Tahun Ajaran', width: 25 },
    { header: 'Urutan', width: 12 },
    { header: 'Aktif', width: 12 },
    { header: 'Keterangan', width: 50 },
  ];
  sheet.getRow(1).font = { bold: true };
  details.forEach((row, index) =>
    sheet.addRow([
      index + 1,
      row.kode_akun,
      row.nama_akun,
      row.kelompok_kas?.kode_kelompok ?? '',
      row.is_periodik_tahun_ajaran ? 'Ya' : 'Tidak',
      row.urutan,
      row.is_active ? 'Ya' : 'Tidak',
      row.keterangan ?? '',
    ])
  );
  sheet.eachRow((row) =>
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    })
  );
};

const parseBoolean = (value: any, fallback: boolean) => {
  const text = String(value ?? '')
    .trim()
    .toLowerCase();
  return text === ''
    ? fallback
    : ['ya', 'true', '1'].includes(text)
      ? true
      : ['tidak', 'false', '0'].includes(text)
        ? false
        : text;
};

const normalizeRow = (row: any) => {
  const active = String(row['Aktif'] ?? '')
    .trim()
    .toLowerCase();
  return {
    kode_akun: String(row['Kode Akun'] ?? '').trim(),
    nama_akun: String(row['Nama Akun'] ?? '').trim(),
    is_periodik_tahun_ajaran: parseBoolean(row['Periodik Tahun Ajaran'], false),
    urutan:
      row['Urutan'] === null ||
      row['Urutan'] === undefined ||
      row['Urutan'] === ''
        ? 0
        : Number(row['Urutan']),
    is_active:
      active === ''
        ? true
        : ['ya', 'true', '1'].includes(active)
          ? true
          : ['tidak', 'false', '0'].includes(active)
            ? false
            : active,
    keterangan: String(row['Keterangan'] ?? '').trim() || null,
    __row: row.__row,
  };
};

export default class Controller {
  public async list(req: Request, res: Response) {
    try {
      const result = await repository.list(req.query);
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed(
          'Referensi kelompok kas tidak valid atau akun masih digunakan',
          400,
          res
        );
      return helper.catchError(`akun list: ${err?.message}`, 500, res);
    }
  }

  public async index(req: Request, res: Response) {
    try {
      const query = {
        ...helper.fetchQueryRequest(req),
        status: req?.query?.status || '',
        is_active: req.query.is_active,
        id_kelompok_kas: req.query.id_kelompok_kas,
        is_periodik_tahun_ajaran: req.query.is_periodik_tahun_ajaran,
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
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed(
          'Referensi kelompok kas tidak valid atau akun masih digunakan',
          400,
          res
        );
      return helper.catchError(`akun index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({
        id_akun: id,
      });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed(
          'Referensi kelompok kas tidak valid atau akun masih digunakan',
          400,
          res
        );
      return helper.catchError(`akun detail: ${err?.message}`, 500, res);
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { kode_akun, id_kelompok_kas } = req.body;
      if (
        id_kelompok_kas !== undefined &&
        !(await KeuKelompokKas.findOne({
          where: { id_kelompok_kas, is_active: true },
        }))
      ) {
        return response.failed(
          'Kelompok Kas tidak ditemukan atau tidak aktif',
          400,
          res
        );
      }

      const check = await repository.detail({ kode_akun });

      if (check) return response.failed(ALREADY_EXIST, 400, res);
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
          'Referensi kelompok kas tidak valid atau akun masih digunakan',
          400,
          res
        );
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(ALREADY_EXIST, 400, res);
      return helper.catchError(`akun create: ${err?.message}`, 500, res);
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const { kode_akun, id_kelompok_kas } = req.body;
      if (
        id_kelompok_kas !== undefined &&
        !(await KeuKelompokKas.findOne({
          where: { id_kelompok_kas, is_active: true },
        }))
      ) {
        return response.failed(
          'Kelompok Kas tidak ditemukan atau tidak aktif',
          400,
          res
        );
      }

      const check = await repository.detail({ id_akun: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      if (kode_akun !== undefined && kode_akun !== check.kode_akun) {
        const duplicate = await repository.detail({ kode_akun });

        if (duplicate) {
          return response.failed(ALREADY_EXIST, 400, res);
        }
      }

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
        condition: { id_akun: id },
      });

      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed(
          'Referensi kelompok kas tidak valid atau akun masih digunakan',
          400,
          res
        );
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(ALREADY_EXIST, 400, res);
      return helper.catchError(`akun update: ${err?.message}`, 500, res);
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_akun: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_akun: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed(
          'Referensi kelompok kas tidak valid atau akun masih digunakan',
          400,
          res
        );
      return helper.catchError(`akun delete: ${err?.message}`, 500, res);
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

      const name: string = 'keu-akun';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().tz(TIMEZONE).format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title);

      generateDataExcel(sheet, result);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel akun', urlExcel, res);
    } catch (err: any) {
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed(
          'Referensi kelompok kas tidak valid atau akun masih digunakan',
          400,
          res
        );
      return helper.catchError(`export excel akun: ${err?.message}`, 500, res);
    }
  }

  public async import(req: Request, res: Response) {
    const mode = req.body?.mode ?? 'preview';
    if (!['preview', 'commit'].includes(mode)) {
      return response.failed('Mode harus preview atau commit', 400, res);
    }
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
      const seen = new Set<string>();
      const results = await Promise.all(
        rows.map(async (raw: any) => {
          const normalized = normalizeRow(raw);
          const kodeKelompok = String(raw['Kode Kelompok'] ?? '').trim();
          const kelompok = kodeKelompok
            ? await KeuKelompokKas.findOne({
                where: { kode_kelompok: kodeKelompok, is_active: true },
              })
            : null;
          const row = {
            ...normalized,
            id_kelompok_kas: kelompok?.id_kelompok_kas ?? '',
          };
          const parsed = keuAkunSchema.safeParse(row);
          const errors = parsed.success
            ? []
            : parsed.error.issues.map((issue) => issue.message);
          if (!kelompok)
            errors.push('Kode Kelompok tidak ditemukan atau tidak aktif');
          if (seen.has(row.kode_akun))
            errors.push('Kode Akun duplikat dalam file');
          seen.add(row.kode_akun);
          return {
            row: row.__row,
            valid: errors.length === 0,
            error: errors.length ? errors.join(', ') : null,
            payload: parsed.success ? parsed.data : row,
          };
        })
      );
      if (mode === 'commit') {
        await sequelize.transaction(async (transaction) => {
          for (const row of results.filter((item: any) => item.valid)) {
            await KeuAkun.upsert(
              { ...row.payload, updated_at: new Date() },
              { transaction, conflictFields: ['kode_akun'] }
            );
          }
        });
      }
      return response.success(
        mode === 'commit' ? 'import akun berhasil' : 'preview import akun',
        {
          mode,
          total: results.length,
          valid: results.filter((row: any) => row.valid).length,
          invalid: results.filter((row: any) => !row.valid).length,
          ...(mode === 'preview' ? { data: results } : {}),
        },
        res
      );
    } catch (err: any) {
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed(
          'Referensi kelompok kas tidak valid atau akun masih digunakan',
          400,
          res
        );
      return helper.catchError(`import akun: ${err.message}`, 500, res);
    }
  }

  public async insert(req: Request, res: Response) {
    const payloads = req.body?.data;
    if (!Array.isArray(payloads) || payloads.length === 0) {
      return response.success('Data import kosong', null, res, false);
    }
    const parsed = keuAkunSchema.array().safeParse(payloads);
    if (!parsed.success)
      return response.failed(parsed.error.issues[0].message, 400, res);
    const codes = parsed.data.map((row) => row.kode_akun);
    if (new Set(codes).size !== codes.length) {
      return response.failed('Kode Akun duplikat dalam batch', 400, res);
    }
    try {
      for (const payload of parsed.data) {
        if (
          !(await KeuKelompokKas.findOne({
            where: {
              id_kelompok_kas: payload.id_kelompok_kas,
              is_active: true,
            },
          }))
        ) {
          return response.failed(
            'Kelompok Kas tidak ditemukan atau tidak aktif',
            400,
            res
          );
        }
      }
      await sequelize.transaction(async (transaction) => {
        for (const payload of parsed.data) {
          await KeuAkun.upsert(
            { ...payload, updated_at: new Date() },
            { transaction, conflictFields: ['kode_akun'] }
          );
        }
      });
      return response.success(
        'Import batch akun berhasil',
        { total: parsed.data.length },
        res
      );
    } catch (err: any) {
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed(
          'Referensi kelompok kas tidak valid atau akun masih digunakan',
          400,
          res
        );
      return helper.catchError(`Import batch akun: ${err.message}`, 500, res);
    }
  }
}

export const keuAkun = new Controller();
