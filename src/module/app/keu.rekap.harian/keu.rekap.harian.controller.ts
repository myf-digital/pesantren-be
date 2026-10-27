'use strict';

import {
  validateOperational,
  identityKey,
  saveDailyVersion,
  reconcileDaily,
  OperationalError,
} from '../keu.shared/operasional';

import ExcelJS from 'exceljs';
import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './keu.rekap.harian.variable';
import { response } from '../../../helpers/response';
import { repository } from './keu.rekap.harian.repository';
import {
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
  TIMEZONE,
} from '../../../utils/constant';
import moment from 'moment';
import { keuRekapHarianSchema } from './keu.rekap.harian.schema';
import { sequelize } from '../../../database/connection';
import fs from 'fs/promises';
import KeuRekapHarian from './keu.rekap.harian.model';
import KeuImportBatch from '../keu.import.batch/keu.import.batch.model';
import KeuAkun from '../keu.akun/keu.akun.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';
import { z } from 'zod';

const headers = [
  'ID Rekap',
  'Tanggal',
  'Kode Akun',
  'Tahun Ajaran',
  'Saldo Awal',
  'Masuk',
  'Keluar',
  'Saldo Akhir',
  'ID Batch',
  'Nomor Baris Sumber',
  'Keterangan',
  'Current',
];

const generateDataExcel = (sheet: ExcelJS.Worksheet, details: any[]) => {
  sheet.columns = headers.map((header) => ({
    header,
    width: header.startsWith('ID') ? 40 : 24,
  }));
  sheet.getRow(1).font = { bold: true };
  details.forEach((row) =>
    sheet.addRow([
      row.id_rekap,
      row.tanggal,
      row.akun?.kode_akun ?? '',
      row.tahun_ajaran?.tahun_ajaran ?? '',
      row.saldo_awal,
      row.masuk,
      row.keluar,
      row.saldo_akhir,
      row.id_batch,
      row.nomor_baris_sumber,
      row.keterangan ?? '',
      row.is_current ? 'Ya' : 'Tidak',
    ])
  );
  // Excel numbers cannot represent every NUMERIC(18,2); export nominal values as text.
  for (let column = 5; column <= 8; column++)
    sheet.getColumn(column).numFmt = '@';
};

const importItemSchema = keuRekapHarianSchema.extend({
  id_rekap: z.string().uuid().optional(),
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
  if (payload.id_batch !== undefined) {
    const batch = await KeuImportBatch.findByPk(payload.id_batch);
    if (!batch) errors.push('Batch impor tidak ditemukan');
    else if (batch.jenis_data !== 'RekapHarian')
      errors.push('Jenis data batch harus RekapHarian');
    else if (batch.status_batch === 'Dibatalkan')
      errors.push('Batch impor sudah dibatalkan');
  }
  errors.push(...(await validateOperational('harian', payload, excludeId)));
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
      if (err instanceof OperationalError)
        return response.failed(err.message, 400, res);
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      return helper.catchError(`rekap harian list: ${err?.message}`, 500, res);
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
      if (err instanceof OperationalError)
        return response.failed(err.message, 400, res);
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      return helper.catchError(`rekap harian index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({
        id_rekap: id,
      });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      if (err instanceof OperationalError)
        return response.failed(err.message, 400, res);
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      return helper.catchError(
        `rekap harian detail: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const warnings = reconcileDaily(req.body);
      if (warnings.length)
        req.body.keterangan = [req.body.keterangan, ...warnings]
          .filter(Boolean)
          .join('; ');
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

      return response.success(SUCCESS_SAVED, { warnings }, res);
    } catch (err: any) {
      if (err instanceof OperationalError)
        return response.failed(err.message, 400, res);
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed('Referensi rekap harian tidak valid', 400, res);
      return helper.catchError(
        `rekap harian create: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_rekap: id });
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

      const merged = { ...check.get({ plain: true }), ...data };
      const warnings = reconcileDaily(merged);
      if (warnings.length)
        merged.keterangan = [merged.keterangan, ...warnings]
          .filter(Boolean)
          .join('; ');
      const result = await sequelize.transaction(async (transaction) =>
        saveDailyVersion(merged, transaction, id)
      );

      return response.success(
        SUCCESS_UPDATED,
        { value: result, warnings },
        res
      );
    } catch (err: any) {
      if (err instanceof OperationalError)
        return response.failed(err.message, 400, res);
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed('Referensi rekap harian tidak valid', 400, res);
      return helper.catchError(
        `rekap harian update: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_rekap: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.update({
        payload: { is_current: false },
        condition: { id_rekap: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      if (err instanceof OperationalError)
        return response.failed(err.message, 400, res);
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed('Data masih digunakan oleh data lain', 400, res);
      return helper.catchError(
        `rekap harian delete: ${err?.message}`,
        500,
        res
      );
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

      const name: string = 'keu-rekap-harian';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().tz(TIMEZONE).format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title.slice(0, 31));

      generateDataExcel(sheet, result);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel rekap harian', urlExcel, res);
    } catch (err: any) {
      if (err instanceof OperationalError)
        return response.failed(err.message, 400, res);
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      return helper.catchError(
        `export excel rekap harian: ${err?.message}`,
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
        const tanggal =
          raw['Tanggal'] instanceof Date
            ? raw['Tanggal'].toISOString().slice(0, 10)
            : String(raw['Tanggal'] ?? '').trim();
        const id = String(raw['ID Rekap'] ?? '').trim();
        const rawPayload = {
          ...(id ? { id_rekap: id } : {}),
          tanggal,
          id_akun: akun?.id_akun ?? '',
          id_tahunajaran: tahunAjaran?.id_tahunajaran ?? null,
          saldo_awal: raw['Saldo Awal'],
          masuk: raw['Masuk'],
          keluar: raw['Keluar'],
          saldo_akhir: raw['Saldo Akhir'],
          id_batch:
            String(raw['ID Batch'] ?? '').trim() ||
            String(req.body?.id_batch ?? '').trim(),
          nomor_baris_sumber:
            raw['Nomor Baris Sumber'] === null ||
            raw['Nomor Baris Sumber'] === undefined ||
            raw['Nomor Baris Sumber'] === ''
              ? raw.__row
              : Number(raw['Nomor Baris Sumber']),
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
        if (id && seen.has(id)) errors.push('ID Rekap duplikat dalam file');
        if (id) seen.add(id);
        const key = identityKey('harian', rawPayload);
        if (rawPayload.is_current !== false && identities.has(key))
          errors.push('Identitas data duplikat dalam file');
        if (rawPayload.is_current !== false) identities.add(key);
        results.push({
          warnings: parsed.success ? reconcileDaily(parsed.data) : [],
          row: raw.__row,
          valid: errors.length === 0,
          error: errors.length ? errors.join(', ') : null,
          payload: parsed.success ? parsed.data : rawPayload,
        });
      }
      if (mode === 'commit') {
        await sequelize.transaction(async (transaction) => {
          for (const row of results.filter((item) => item.valid)) {
            await saveDailyVersion(row.payload, transaction);
          }
        });
      }
      return response.success(
        mode === 'commit'
          ? 'import rekap harian berhasil'
          : 'preview import rekap harian',
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
      if (err instanceof OperationalError)
        return response.failed(err.message, 400, res);
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed('Referensi rekap harian tidak valid', 400, res);
      return helper.catchError(`import rekap harian: ${err.message}`, 500, res);
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
      row.id_rekap ? [row.id_rekap] : []
    );
    if (new Set(ids).size !== ids.length)
      return response.failed('ID Rekap duplikat dalam batch', 400, res);
    const keys = parsed.data
      .filter((row) => row.is_current !== false)
      .map((row) => identityKey('harian', row));
    if (new Set(keys).size !== keys.length)
      return response.failed('Identitas data duplikat dalam batch', 400, res);
    try {
      for (const payload of parsed.data) {
        const errors = await validateReferences(payload);
        if (errors.length) return response.failed(errors.join(', '), 400, res);
      }
      await sequelize.transaction(async (transaction) => {
        for (const payload of parsed.data) {
          await saveDailyVersion(payload, transaction);
        }
      });
      return response.success(
        'Import batch rekap harian berhasil',
        { total: parsed.data.length },
        res
      );
    } catch (err: any) {
      if (err instanceof OperationalError)
        return response.failed(err.message, 400, res);
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      if (err?.name === 'SequelizeForeignKeyConstraintError')
        return response.failed('Referensi rekap harian tidak valid', 400, res);
      return helper.catchError(
        `Import batch rekap harian: ${err.message}`,
        500,
        res
      );
    }
  }
}

export const keuRekapHarian = new Controller();
