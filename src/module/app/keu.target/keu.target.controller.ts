'use strict';

import { validateOperational, identityKey } from '../keu.shared/operasional';

import ExcelJS from 'exceljs';
import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './keu.target.variable';
import { response } from '../../../helpers/response';
import { repository } from './keu.target.repository';
import {
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
  TIMEZONE,
} from '../../../utils/constant';
import moment from 'moment';
import { keuTargetSchema } from './keu.target.schema';
import { sequelize } from '../../../database/connection';
import fs from 'fs/promises';
import KeuTarget from './keu.target.model';
import KeuImportBatch from '../keu.import.batch/keu.import.batch.model';
import KeuAkun from '../keu.akun/keu.akun.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';
import { z } from 'zod';

const headers = [
  'ID Target',
  'Nama Target',
  'Jenis Target',
  'Periode Mulai',
  'Periode Selesai',
  'Kode Akun',
  'Tahun Ajaran',
  'Nilai Target',
  'ID Batch',
  'Current',
  'Keterangan',
];
const generateDataExcel = (sheet: ExcelJS.Worksheet, details: any[]) => {
  sheet.columns = headers.map((header) => ({
    header,
    width: header.startsWith('ID') ? 40 : 25,
  }));
  sheet.getRow(1).font = { bold: true };
  details.forEach((row) =>
    sheet.addRow([
      row.id_target,
      row.nama_target,
      row.jenis_target,
      row.periode_mulai,
      row.periode_selesai,
      row.akun?.kode_akun ?? '',
      row.tahun_ajaran?.tahun_ajaran ?? '',
      row.nilai_target,
      row.id_batch ?? '',
      row.is_current ? 'Ya' : 'Tidak',
      row.keterangan ?? '',
    ])
  );
  sheet.getColumn(8).numFmt = '@';
};
const importItemSchema = keuTargetSchema.safeExtend({
  id_target: z.string().uuid().optional(),
});
const parseCurrent = (value: any) => {
  const text = String(value ?? '')
    .trim()
    .toLowerCase();
  return text === ''
    ? true
    : ['ya', 'true', '1'].includes(text)
      ? true
      : ['tidak', 'false', '0'].includes(text)
        ? false
        : text;
};

const validateReferences = async (payload: any, excludeId?: string) => {
  const errors: string[] = [];
  if (
    payload.id_akun !== undefined &&
    !(await KeuAkun.findByPk(payload.id_akun))
  ) {
    errors.push('Akun tidak ditemukan');
  }
  if (
    payload.id_tahunajaran &&
    !(await TahunAjaran.findByPk(payload.id_tahunajaran))
  ) {
    errors.push('Tahun Ajaran tidak ditemukan');
  }
  if (payload.id_batch) {
    const batch = await KeuImportBatch.findByPk(payload.id_batch);
    if (!batch) errors.push('Batch impor tidak ditemukan');
    else if (batch.jenis_data !== 'Target')
      errors.push('Jenis data batch harus Target');
    else if (batch.status_batch === 'Dibatalkan')
      errors.push('Batch impor sudah dibatalkan');
  }
  if (
    payload.periode_mulai &&
    payload.periode_selesai &&
    payload.periode_mulai > payload.periode_selesai
  )
    errors.push('Periode mulai tidak boleh melebihi periode selesai');
  errors.push(...(await validateOperational('target', payload, excludeId)));
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
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      return helper.catchError(`target list: ${err?.message}`, 500, res);
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
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      return helper.catchError(`target index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({
        id_target: id,
      });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      return helper.catchError(`target detail: ${err?.message}`, 500, res);
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
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed('Referensi target tidak valid', 400, res);
      return helper.catchError(`target create: ${err?.message}`, 500, res);
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_target: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      const errors = await validateReferences(
        {
          ...check.get({ plain: true }),
          ...req.body,
        },
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
        condition: { id_target: id },
      });

      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed('Referensi target tidak valid', 400, res);
      return helper.catchError(`target update: ${err?.message}`, 500, res);
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_target: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_target: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed('Data masih digunakan oleh data lain', 400, res);
      return helper.catchError(`target delete: ${err?.message}`, 500, res);
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

      const name: string = 'keu-target';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().tz(TIMEZONE).format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title.slice(0, 31));

      generateDataExcel(sheet, result);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel target', urlExcel, res);
    } catch (err: any) {
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      return helper.catchError(
        `export excel target: ${err?.message}`,
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
      const seen = new Set<string>();
      const identities = new Set<string>();
      for (const raw of rows) {
        const kodeAkun = String(raw['Kode Akun'] ?? '').trim();
        const akun = kodeAkun
          ? await KeuAkun.findOne({ where: { kode_akun: kodeAkun } })
          : null;
        const tahun = String(raw['Tahun Ajaran'] ?? '').trim();
        const tahunAjaran = tahun
          ? await TahunAjaran.findOne({ where: { tahun_ajaran: tahun } })
          : null;
        const dateValue = (value: any) =>
          value instanceof Date
            ? value.toISOString().slice(0, 10)
            : String(value ?? '').trim();
        const id = String(raw['ID Target'] ?? '').trim();
        const rawPayload = {
          ...(id ? { id_target: id } : {}),
          nama_target: String(raw['Nama Target'] ?? '').trim(),
          jenis_target: String(raw['Jenis Target'] ?? '').trim(),
          periode_mulai: dateValue(raw['Periode Mulai']),
          periode_selesai: dateValue(raw['Periode Selesai']),
          id_akun: akun?.id_akun ?? '',
          id_tahunajaran: tahunAjaran?.id_tahunajaran ?? null,
          nilai_target: raw['Nilai Target'],
          id_batch:
            String(raw['ID Batch'] ?? '').trim() ||
            String(req.body?.id_batch ?? '').trim() ||
            null,
          keterangan: String(raw['Keterangan'] ?? '').trim() || null,
          is_current: parseCurrent(raw['Current']),
        };
        const parsed = importItemSchema.safeParse(rawPayload);
        const errors = parsed.success
          ? []
          : parsed.error.issues.map((issue) => issue.message);
        if (!akun) errors.push('Kode Akun tidak ditemukan');
        if (parsed.success)
          errors.push(...(await validateReferences(parsed.data)));
        if (tahun && !tahunAjaran) errors.push('Tahun Ajaran tidak ditemukan');
        if (id && seen.has(id)) errors.push('ID Target duplikat dalam file');
        if (id) seen.add(id);
        const key = identityKey('target', rawPayload);
        if (rawPayload.is_current !== false && identities.has(key))
          errors.push('Identitas data duplikat dalam file');
        if (rawPayload.is_current !== false) identities.add(key);
        results.push({
          row: raw.__row,
          valid: errors.length === 0,
          error: errors.length ? errors.join(', ') : null,
          payload: parsed.success ? parsed.data : rawPayload,
        });
      }
      if (mode === 'commit') {
        await sequelize.transaction(async (transaction) => {
          for (const row of results.filter((item) => item.valid)) {
            if (row.payload.id_target) {
              await KeuTarget.upsert(
                { ...row.payload, updated_at: new Date() },
                { transaction, conflictFields: ['id_target'] }
              );
            } else {
              await KeuTarget.create(row.payload, { transaction });
            }
          }
        });
      }
      return response.success(
        mode === 'commit' ? 'import target berhasil' : 'preview import target',
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
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed('Referensi target tidak valid', 400, res);
      return helper.catchError(`import target: ${err.message}`, 500, res);
    }
  }

  public async insert(req: Request, res: Response) {
    const payloads = req.body?.data;
    if (!Array.isArray(payloads) || !payloads.length)
      return response.success('Data import kosong', null, res, false);
    const parsed = importItemSchema.array().safeParse(payloads);
    if (!parsed.success)
      return response.failed(parsed.error.issues[0].message, 400, res);
    const ids = parsed.data.flatMap((row) =>
      row.id_target ? [row.id_target] : []
    );
    if (new Set(ids).size !== ids.length)
      return response.failed('ID Target duplikat dalam batch', 400, res);
    const keys = parsed.data
      .filter((row) => row.is_current !== false)
      .map((row) => identityKey('target', row));
    if (new Set(keys).size !== keys.length)
      return response.failed('Identitas data duplikat dalam batch', 400, res);
    try {
      for (const payload of parsed.data) {
        const errors = await validateReferences(payload);
        if (errors.length) return response.failed(errors.join(', '), 400, res);
      }
      await sequelize.transaction(async (transaction) => {
        for (const payload of parsed.data) {
          if (payload.id_target) {
            await KeuTarget.upsert(
              { ...payload, updated_at: new Date() },
              { transaction, conflictFields: ['id_target'] }
            );
          } else {
            await KeuTarget.create(payload, { transaction });
          }
        }
      });
      return response.success(
        'Import batch target berhasil',
        { total: parsed.data.length },
        res
      );
    } catch (err: any) {
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed('Referensi target tidak valid', 400, res);
      return helper.catchError(`Import batch target: ${err.message}`, 500, res);
    }
  }
}

export const keuTarget = new Controller();
