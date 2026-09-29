'use strict';

import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './pelanggaran.remisi.master.variable';
import { response } from '../../../helpers/response';
import { repository } from './pelanggaran.remisi.master.repository';
import { masterPelanggaranRemisiSchema } from './pelanggaran.remisi.master.schema';
import moment from 'moment';
import { z } from 'zod';
import {
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
  TIMEZONE,
} from '../../../utils/constant';
import fs from 'fs/promises';
import ExcelJS from 'exceljs';
import { sequelize } from '../../../database/connection';

const generateDataExcel = (
  sheet: any,
  details: any,
  isTemplate: boolean = false
) => {
  // Susunan teks header
  sheet.addRow([
    'No',
    'Kode',
    'Nama',
    'Jenis (Pelanggaran/Remisi)',
    'Kategori (Ringan/Sedang/Berat/Sangat Berat)',
    'Skor',
    'Keterangan',
    'Status Aktif (1/0)',
  ]);

  // Set property metadata kolom
  sheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Kode', key: 'kode_pelanggaran', width: 15 },
    { header: 'Nama', key: 'nama_pelanggaran', width: 35 },
    { header: 'Jenis', key: 'jenis', width: 25 },
    { header: 'Kategori', key: 'kategori', width: 25 },
    { header: 'Skor', key: 'skor', width: 10 },
    { header: 'Keterangan', key: 'keterangan', width: 40 },
    { header: 'Status Aktif (1/0)', key: 'is_active', width: 18 },
  ];

  // Styling Header Baris Pertama
  sheet.getRow(1).eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Perulangan Data
  for (let i in details) {
    sheet.addRow([
      parseInt(i) + 1,
      details[i]?.kode_pelanggaran || '',
      details[i]?.nama_pelanggaran || '',
      details[i]?.jenis || '',
      details[i]?.kategori || '',
      details[i]?.skor || 0,
      details[i]?.keterangan || '',
      details[i]?.is_active ? 1 : 0,
    ]);
  }

  // Pemberian Border ke seluruh cell
  const columnCount = sheet.columns.length;
  for (let row = 1; row <= (details?.length || 0) + 1; row++) {
    const currentRow = sheet.getRow(row);
    for (let col = 1; col <= columnCount; col++) {
      const cell = currentRow.getCell(col);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    }
  }

  return sheet;
};

const normalizeRow = (row: any) => ({
  kode_pelanggaran: String(row['Kode'] || '').trim(),
  nama_pelanggaran: String(row['Nama'] || '').trim(),
  jenis: String(row['Jenis'] || '').trim(),
  kategori: row['Kategori'] ? String(row['Kategori']).trim() : null,
  skor: Number(row['Skor']) || 0,
  keterangan: String(row['Keterangan'] || '').trim(),
  is_active: row['Status Aktif (1/0)'] == '1' || row['Status Aktif (1/0)'] === 1 ? true : false,
  __row: row.__row,
});

const validateRow = (row: any) => {
  const errors: string[] = [];
  if (!row.kode_pelanggaran) errors.push('Kode wajib diisi');
  if (!row.nama_pelanggaran) errors.push('Nama wajib diisi');
  if (!['Pelanggaran', 'Remisi'].includes(row.jenis)) errors.push('Jenis tidak valid');
  return errors;
};

export default class Controller {
  constructor() {
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
  }

  /**
   * Validasi Logika Bisnis (Cek duplikasi Kode Master)
   */
  private async validateBusinessLogic(item: any, id_pelanggaran_remisi?: string) {
    // Cek Duplikasi Kode
    const checkKode = await repository.checkDuplicateCode(
      item.kode_pelanggaran,
      id_pelanggaran_remisi
    );
    if (checkKode)
      throw new Error(`Kode [${item.kode_pelanggaran}] sudah terdaftar pada master data lain.`);

    return item;
  }

  public async list(req: Request, res: Response) {
    try {
      const is_active: any = req?.query?.is_active ?? '';
      const jenis: any = req?.query?.jenis ?? '';
      const result = await repository.list({ is_active, jenis });
      
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`Master list: ${err?.message}`, 500, res);
    }
  }

  public async index(req: Request, res: Response) {
    try {
      const query = helper.fetchQueryRequest(req);
      const filter = {
        ...query,
        jenis: req.query.jenis || '',
        kategori: req.query.kategori || '',
        is_active: req.query.is_active || '',
      };
      const { count, rows } = await repository.index(filter);
      
      if (rows?.length < 1)
        return response.success(NOT_FOUND, null, res, false);

      return response.success(
        SUCCESS_RETRIEVED,
        { total: count, values: rows },
        res
      );
    } catch (err: any) {
      return helper.catchError(`Master index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const result = await repository.detail({ id_pelanggaran_remisi: id });
      if (!result) return response.success(NOT_FOUND, null, res, false);

      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`Master detail: ${err?.message}`, 500, res);
    }
  }

  public async create(req: Request, res: Response) {
    const trx = await sequelize.transaction();
    try {
      const body = req.body;
      const payloadArray = Array.isArray(body) ? body : [body];
      const validatedData = [];

      for (const item of payloadArray) {
        let validItem = masterPelanggaranRemisiSchema.parse(item);
        let finalItem = await this.validateBusinessLogic(validItem);
        
        validatedData.push(helper.only(variable.fillable(), finalItem));
      }

      await repository.create({
        payload: validatedData,
        rawPayload: payloadArray,
        transaction: trx,
        userId: req?.user?.id,
      });

      if (trx) await trx.commit();
      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      if (trx && !(trx as any).finished) {
        try {
          await trx.rollback();
        } catch (e) {}
      }
      const msg =
        err instanceof z.ZodError
          ? `Validasi Gagal: ${err.issues[0].message}`
          : err.message;
      return helper.catchError(msg, 400, res);
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const check = await repository.detail({ id_pelanggaran_remisi: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      const validData = masterPelanggaranRemisiSchema.parse(req.body);
      const finalUpdate = await this.validateBusinessLogic(
        { ...check.toJSON(), ...validData },
        id
      );

      const payload = helper.only(variable.fillable(), finalUpdate, true);
      await repository.update({
        payload: { ...payload, updated_at: helper.date() },
        condition: { id_pelanggaran_remisi: id },
      });

      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      const msg =
        err instanceof z.ZodError
          ? `Update Gagal: ${err.issues[0].message}`
          : err.message;
      return helper.catchError(msg, 400, res);
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const check = await repository.detail({ id_pelanggaran_remisi: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      await repository.delete({ id_pelanggaran_remisi: id });

      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(`Gagal menghapus: ${err?.message}`, 500, res);
    }
  }

  public async export(req: Request, res: Response) {
    try {
      const { q, template, jenis, is_active } = req?.body;
      const isTemplate: boolean = template && template == '1';

      let result = await repository.listForExport({
        q,
        isTemplate,
        jenis
      });

      const { dir, path } = await helper.checkDirExport('excel');
      const filename = `master_pelanggaran_remisi-${isTemplate ? 'template' : moment().tz(TIMEZONE).format('DDMMYYYY')}.xlsx`;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('DATA MASTER');

      generateDataExcel(sheet, result, isTemplate);
      await workbook.xlsx.writeFile(`${path}/${filename}`);

      return response.success(
        'export excel master',
        `${dir}/${filename}`,
        res
      );
    } catch (err: any) {
      return helper.catchError(`export excel master: ${err?.message}`, 500, res);
    }
  }

  public async import(req: Request, res: Response) {
    const mode: 'preview' | 'commit' = req.body?.mode ?? 'preview';
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

      for (const raw of rows) {
        const row = normalizeRow(raw);
        const errors = validateRow(row);

        const valid = errors.length === 0;
        const payload = {
          kode_pelanggaran: row.kode_pelanggaran,
          nama_pelanggaran: row.nama_pelanggaran,
          jenis: row.jenis,
          kategori: row.kategori,
          skor: row.skor,
          keterangan: row.keterangan,
          is_active: row.is_active,
        };

        results.push({
          row: row.__row,
          valid,
          error: errors.length ? errors.join(', ') : null,
          payload,
        });
      }

      const dataRes = {
        mode,
        total: results.length,
        valid: results.filter((r) => r.valid).length,
        invalid: results.filter((r) => !r.valid).length,
      };

      if (mode === 'commit') {
        const validPayloads = results
          .filter((r) => r.valid)
          .map((r) => r.payload);
        if (validPayloads.length > 0)
          await repository.insertImport(validPayloads);
        return response.success('import master berhasil', dataRes, res);
      }

      return response.success(
        'preview import master',
        { ...dataRes, data: results },
        res
      );
    } catch (err: any) {
      return helper.catchError(`import excel master: ${err?.message}`, 500, res);
    }
  }

  public insert = async (req: Request, res: Response) => {
    const payloads = req.body?.data as any[];
    if (!payloads || payloads.length === 0)
      return response.success('Data kosong', null, res, false);

    try {
      await repository.insertImport(payloads);
      return response.success(
        'Import batch berhasil',
        { count: payloads.length },
        res
      );
    } catch (err: any) {
      return helper.catchError(err.message, 500, res);
    }
  };
}

export const MasterPelanggaranRemisi = new Controller();