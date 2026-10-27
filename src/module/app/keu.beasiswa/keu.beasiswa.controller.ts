'use strict';

import { validateOperational, identityKey } from '../keu.shared/operasional';

import ExcelJS from 'exceljs';
import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './keu.beasiswa.variable';
import { response } from '../../../helpers/response';
import { repository } from './keu.beasiswa.repository';
import {
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
  TIMEZONE,
} from '../../../utils/constant';
import moment from 'moment';
import { keuBeasiswaSchema } from './keu.beasiswa.schema';
import { sequelize } from '../../../database/connection';
import fs from 'fs/promises';
import KeuBeasiswa from './keu.beasiswa.model';
import KeuImportBatch from '../keu.import.batch/keu.import.batch.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';
import AppSantri from '../santri/santri.model';
import JenisBeasiswa from '../jenis.beasiswa/jenis.beasiswa.model';
import { z } from 'zod';

const headers = [
  'ID Rekap Beasiswa',
  'Cakupan Data',
  'Tahun Ajaran',
  'ID Santri',
  'Kode Jenis Beasiswa',
  'Jenis Bantuan',
  'Nama Program',
  'Status Final',
  'Tanggal Data',
  'Nilai Diajukan',
  'Nilai Ditetapkan',
  'Nilai Realisasi',
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
      row.id_rekap_beasiswa,
      row.cakupan_data,
      row.tahun_ajaran?.tahun_ajaran ?? '',
      row.id_santri ?? '',
      row.jenis_beasiswa?.kode_beasiswa ?? '',
      row.jenis_bantuan,
      row.nama_program ?? '',
      row.status_final,
      row.tanggal_data,
      row.nilai_diajukan ?? '',
      row.nilai_ditetapkan,
      row.nilai_realisasi ?? '',
      row.id_batch,
      row.is_current ? 'Ya' : 'Tidak',
      row.keterangan ?? '',
    ])
  );
  for (const column of [10, 11, 12]) sheet.getColumn(column).numFmt = '@';
};
const importItemSchema = keuBeasiswaSchema.safeExtend({
  id_rekap_beasiswa: z.string().uuid().optional(),
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
  if (payload.cakupan_data === 'PerPenerima' && !payload.id_santri)
    errors.push('Santri wajib untuk data PerPenerima');
  if (payload.cakupan_data === 'Agregat' && payload.id_santri)
    errors.push('Data Agregat tidak boleh memiliki santri');
  if (
    !payload.id_tahunajaran ||
    !(await TahunAjaran.findByPk(payload.id_tahunajaran))
  )
    errors.push('Tahun Ajaran tidak ditemukan');
  if (payload.id_santri && !(await AppSantri.findByPk(payload.id_santri)))
    errors.push('Santri tidak ditemukan');
  if (
    !payload.id_jenis_beasiswa ||
    !(await JenisBeasiswa.findByPk(payload.id_jenis_beasiswa))
  )
    errors.push('Jenis Beasiswa tidak ditemukan');
  if (!payload.id_batch) errors.push('Batch wajib diisi');
  if (payload.id_batch) {
    const batch = await KeuImportBatch.findByPk(payload.id_batch);
    if (!batch) errors.push('Batch impor tidak ditemukan');
    else if (batch.jenis_data !== 'Beasiswa')
      errors.push('Jenis data batch harus Beasiswa');
    else if (batch.status_batch === 'Dibatalkan')
      errors.push('Batch impor sudah dibatalkan');
  }
  errors.push(...(await validateOperational('beasiswa', payload, excludeId)));
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
      return helper.catchError(`beasiswa list: ${err?.message}`, 500, res);
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
      return helper.catchError(`beasiswa index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({
        id_rekap_beasiswa: id,
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
      return helper.catchError(`beasiswa detail: ${err?.message}`, 500, res);
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
        return response.failed('Referensi beasiswa tidak valid', 400, res);
      return helper.catchError(`beasiswa create: ${err?.message}`, 500, res);
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_rekap_beasiswa: id });
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
        condition: { id_rekap_beasiswa: id },
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
        return response.failed('Referensi beasiswa tidak valid', 400, res);
      return helper.catchError(`beasiswa update: ${err?.message}`, 500, res);
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_rekap_beasiswa: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_rekap_beasiswa: id },
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
      return helper.catchError(`beasiswa delete: ${err?.message}`, 500, res);
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

      const name: string = 'keu-beasiswa';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().tz(TIMEZONE).format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title.slice(0, 31));

      generateDataExcel(sheet, result);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel beasiswa', urlExcel, res);
    } catch (err: any) {
      if (err?.name === 'SequelizeUniqueConstraintError')
        return response.failed(
          'Data aktif dengan identitas yang sama sudah ada',
          400,
          res
        );
      return helper.catchError(
        `export excel beasiswa: ${err?.message}`,
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
        const tahun = String(raw['Tahun Ajaran'] ?? '').trim();
        const tahunAjaran = tahun
          ? await TahunAjaran.findOne({ where: { tahun_ajaran: tahun } })
          : null;
        const kodeJenis = String(raw['Kode Jenis Beasiswa'] ?? '').trim();
        const jenis = kodeJenis
          ? await JenisBeasiswa.findOne({ where: { kode_beasiswa: kodeJenis } })
          : null;
        const id = String(raw['ID Rekap Beasiswa'] ?? '').trim();
        const optionalNominal = (value: any) =>
          value === '' || value === undefined || value === null ? null : value;
        const rawPayload = {
          ...(id ? { id_rekap_beasiswa: id } : {}),
          cakupan_data:
            String(raw['Cakupan Data'] ?? '').trim() || 'PerPenerima',
          id_tahunajaran: tahunAjaran?.id_tahunajaran ?? '',
          id_santri: String(raw['ID Santri'] ?? '').trim() || null,
          id_jenis_beasiswa: jenis?.id_beasiswa ?? '',
          jenis_bantuan: String(raw['Jenis Bantuan'] ?? '').trim(),
          nama_program: String(raw['Nama Program'] ?? '').trim() || null,
          status_final: String(raw['Status Final'] ?? '').trim(),
          tanggal_data:
            raw['Tanggal Data'] instanceof Date
              ? raw['Tanggal Data'].toISOString().slice(0, 10)
              : String(raw['Tanggal Data'] ?? '').trim(),
          nilai_diajukan: optionalNominal(raw['Nilai Diajukan']),
          nilai_ditetapkan: raw['Nilai Ditetapkan'],
          nilai_realisasi: optionalNominal(raw['Nilai Realisasi']),
          id_batch:
            String(raw['ID Batch'] ?? '').trim() ||
            String(req.body?.id_batch ?? '').trim(),
          is_current: parseCurrent(raw['Current']),
          keterangan: String(raw['Keterangan'] ?? '').trim() || null,
        };
        const parsed = importItemSchema.safeParse(rawPayload);
        const errors = parsed.success
          ? []
          : parsed.error.issues.map((issue) => issue.message);
        if (!tahunAjaran) errors.push('Tahun Ajaran tidak ditemukan');
        if (!jenis) errors.push('Kode Jenis Beasiswa tidak ditemukan');
        if (parsed.success)
          errors.push(...(await validateReferences(parsed.data)));
        if (id && seen.has(id))
          errors.push('ID Rekap Beasiswa duplikat dalam file');
        if (id) seen.add(id);
        const key = identityKey('beasiswa', rawPayload);
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
            if (row.payload.id_rekap_beasiswa) {
              await KeuBeasiswa.upsert(
                { ...row.payload, updated_at: new Date() },
                { transaction, conflictFields: ['id_rekap_beasiswa'] }
              );
            } else {
              await KeuBeasiswa.create(row.payload, { transaction });
            }
          }
        });
      }
      return response.success(
        mode === 'commit'
          ? 'import beasiswa berhasil'
          : 'preview import beasiswa',
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
        return response.failed('Referensi beasiswa tidak valid', 400, res);
      return helper.catchError(`import beasiswa: ${err.message}`, 500, res);
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
      row.id_rekap_beasiswa ? [row.id_rekap_beasiswa] : []
    );
    if (new Set(ids).size !== ids.length)
      return response.failed(
        'ID Rekap Beasiswa duplikat dalam batch',
        400,
        res
      );
    const keys = parsed.data
      .filter((row) => row.is_current !== false)
      .map((row) => identityKey('beasiswa', row));
    if (new Set(keys).size !== keys.length)
      return response.failed('Identitas data duplikat dalam batch', 400, res);
    try {
      for (const payload of parsed.data) {
        const errors = await validateReferences(payload);
        if (errors.length) return response.failed(errors.join(', '), 400, res);
      }
      await sequelize.transaction(async (transaction) => {
        for (const payload of parsed.data) {
          if (payload.id_rekap_beasiswa) {
            await KeuBeasiswa.upsert(
              { ...payload, updated_at: new Date() },
              { transaction, conflictFields: ['id_rekap_beasiswa'] }
            );
          } else {
            await KeuBeasiswa.create(payload, { transaction });
          }
        }
      });
      return response.success(
        'Import batch beasiswa berhasil',
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
        return response.failed('Referensi beasiswa tidak valid', 400, res);
      return helper.catchError(
        `Import batch beasiswa: ${err.message}`,
        500,
        res
      );
    }
  }
}

export const keuBeasiswa = new Controller();
