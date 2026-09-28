'use strict';

import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './pelanggaran.santri.variable';
import { response } from '../../../helpers/response';
import { repository } from './pelanggaran.santri.repository';
import { kasusPelanggaranSantriSchema } from './pelanggaran.santri.schema';
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
import { appConfig } from '../../../config/config.app';

const generateDataExcel = (
  sheet: any,
  details: any,
  isTemplate: boolean = false
) => {
  // Susunan teks header 
  sheet.addRow([
    'No',
    'Nomor Kasus',
    'Tanggal Kejadian',
    'Santri',
    'Pelanggaran / Remisi',
    'Jenis', 
    'Lokasi',
    'Skor Master',
    'Skor Diberikan',
    'Alasan Penyesuaian',
    'Level SP',
    'Nomor Surat SP',
    'Status',
    'Kronologi',
    'Hukuman',
    'Pelapor',
    'Penanggung Jawab'
  ]);

  // Set property metadata kolom
  sheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Nomor Kasus', key: 'nomor_kasus', width: 20 },
    { header: 'Tanggal Kejadian', key: 'tanggal_kejadian', width: 15 },
    { header: 'Santri', key: 'santri', width: 30 },
    { header: 'Pelanggaran / Remisi', key: 'pelanggaran', width: 35 },
    { header: 'Jenis', key: 'jenis', width: 15 },
    { header: 'Lokasi', key: 'lokasi', width: 20 },
    { header: 'Skor Master', key: 'skor_master', width: 15 },
    { header: 'Skor Diberikan', key: 'skor', width: 15 },
    { header: 'Alasan Penyesuaian', key: 'alasan_penyesuaian', width: 30 },
    { header: 'Level SP', key: 'level_sp', width: 10 },
    { header: 'Nomor Surat SP', key: 'nomor_sp', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Kronologi', key: 'kronologi', width: 40 },
    { header: 'Hukuman', key: 'hukuman', width: 30 },
    { header: 'Pelapor', key: 'pelapor', width: 25 },
    { header: 'Penanggung Jawab', key: 'penanggung_jawab', width: 25 },
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
      details[i]?.nomor_kasus || '',
      details[i]?.tanggal_kejadian ? moment(details[i].tanggal_kejadian).format('YYYY-MM-DD') : '',
      isTemplate ? details[i]?.id_santri : details[i]?.santri?.nama_lengkap || '',
      isTemplate ? details[i]?.id_pelanggaran_remisi : details[i]?.master_pelanggaran?.nama_pelanggaran || '',
      details[i]?.master_pelanggaran?.jenis || '', 
      isTemplate ? details[i]?.id_lokasi : details[i]?.lokasi?.nama_lokasi || '',
      details[i]?.skor_master_snapshot || 0,
      details[i]?.skor_diberikan || 0,
      details[i]?.alasan_penyesuaian_skor || '',
      details[i]?.level_sp || '-',
      details[i]?.nomor_surat_sp || '-',
      details[i]?.status_progress || '',
      details[i]?.kronologi || '',
      details[i]?.punishment_detail || '',
      isTemplate ? details[i]?.id_petugas_pelapor : details[i]?.pelapor?.nama_lengkap || '',
      isTemplate ? details[i]?.id_petugas_penanggung_jawab : details[i]?.penanggung_jawab?.nama_lengkap || '',
    ]);
  }

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

// Normalisasi Pembacaan Baris Excel
const normalizeRow = (row: any) => ({
  nomor_kasus: String(row['Nomor Kasus'] || '').trim(),
  tanggal_kejadian: row['Tanggal Kejadian'] || null,
  id_santri: String(row['Santri'] || '').trim(), 
  id_pelanggaran_remisi: String(row['Pelanggaran / Remisi'] || '').trim(), 
  jenis: String(row['Jenis'] || 'Pelanggaran').trim(), 
  id_lokasi: String(row['Lokasi'] || '').trim(), 
  skor_master_snapshot: Number(row['Skor Master']) || 0,
  skor_diberikan: Number(row['Skor Diberikan']) || 0,
  alasan_penyesuaian_skor: String(row['Alasan Penyesuaian'] || '').trim(),
  level_sp: String(row['Level SP'] || '').trim() !== '-' ? String(row['Level SP']).trim() : null,
  nomor_surat_sp: String(row['Nomor Surat SP'] || '').trim() !== '-' ? String(row['Nomor Surat SP']).trim() : null,
  status_progress: String(row['Status'] || 'Proses').trim(),
  kronologi: String(row['Kronologi'] || '').trim(),
  punishment_detail: String(row['Hukuman'] || '').trim(),
  id_petugas_pelapor: String(row['Pelapor'] || '').trim(), 
  id_petugas_penanggung_jawab: String(row['Penanggung Jawab'] || '').trim(), 
  __row: row.__row,
});

const validateRow = (row: any) => {
  const errors: string[] = [];
  if (!row.id_santri) errors.push('Santri wajib diisi');
  if (!row.id_pelanggaran_remisi) errors.push('Pelanggaran/Remisi wajib diisi');
  if (!row.id_lokasi) errors.push('Lokasi wajib diisi');
  if (!['Pelanggaran', 'Remisi'].includes(row.jenis)) errors.push('Jenis harus diisi "Pelanggaran" atau "Remisi"');
  return errors;
};

export default class Controller {
  constructor() {
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
  }

  /**
   * Helper untuk Generate Nomor Kasus
   */
  private generateNomorKasus(): string {
    const dateStr = moment().format('YYYYMMDD');
    const randomNum = Math.floor(10000 + Math.random() * 90000); // 5 digit random
    return `KS-${dateStr}-${randomNum}`;
  }

  /**
   * Validasi Logika Bisnis (Cek duplikasi Nomor Kasus)
   */
  private async validateBusinessLogic(item: any, id_kasus?: string) {
    if (item.nomor_kasus) {
      const checkKode = await repository.checkDuplicateNomorKasus(item.nomor_kasus, id_kasus);
      if (checkKode) {
        throw new Error(`Nomor Kasus [${item.nomor_kasus}] sudah terdaftar pada kasus lain.`);
      }
    }
    return item;
  }

  /**
   * Handle File Upload untuk Bukti & Dokumen SP
   */
  private async handleFileUploads(item: any, username: string) {
    if (item.foto_bukti && !item.foto_bukti.includes('uploads/')) {
      let checkFile = helper.checkExtentionBase64(item.foto_bukti);
      if (checkFile !== 'allowed') throw new Error(`Foto Bukti / Pendukung: ${checkFile}`);
      item.foto_bukti = await helper.uploadBase64(
        item.foto_bukti,
        `bukti-kasus-${Date.now()}`,
        'kasus-pelanggaran',
        username,
        appConfig?.assetType
      );
    }

    if (item.foto_dokumen_sp && !item.foto_dokumen_sp.includes('uploads/')) {
      let checkFile = helper.checkExtentionBase64(item.foto_dokumen_sp);
      if (checkFile !== 'allowed') throw new Error(`Dokumen SP: ${checkFile}`);
      item.foto_dokumen_sp = await helper.uploadBase64(
        item.foto_dokumen_sp,
        `dokumen-sp-${Date.now()}`,
        'kasus-pelanggaran',
        username,
        appConfig?.assetType
      );
    }

    return item;
  }

  public async list(req: Request, res: Response) {
    try {
      const query = helper.fetchQueryRequest(req);
      const result = await repository.list({
        keyword: query.keyword,
        status_progress: req.query.status_progress || '',
        level_sp: req.query.level_sp || '',
        id_santri: req.query.id_santri || '',
      });
      
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`Kasus list: ${err?.message}`, 500, res);
    }
  }

  public async index(req: Request, res: Response) {
    try {
      const query = helper.fetchQueryRequest(req);
      const filter = {
        ...query,
        status_progress: req.query.status_progress || '',
        level_sp: req.query.level_sp || '',
        id_santri: req.query.id_santri || '',
        id_pelanggaran_remisi: req.query.id_pelanggaran_remisi || '',
      };
      const { count, rows } = await repository.index(filter);
      
      if (rows?.length < 1)
        return response.success(NOT_FOUND, null, res, false);

      return response.success(SUCCESS_RETRIEVED, { total: count, values: rows }, res);
    } catch (err: any) {
      return helper.catchError(`Kasus index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const result = await repository.detail({ id_kasus: id });
      if (!result) return response.success(NOT_FOUND, null, res, false);

      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`Kasus detail: ${err?.message}`, 500, res);
    }
  }

  public async create(req: Request, res: Response) {
    const trx = await sequelize.transaction();
    try {
      const body = req.body;
      const payloadArray = Array.isArray(body) ? body : [body];
      const validatedData = [];

      for (const item of payloadArray) {
        let validItem = kasusPelanggaranSantriSchema.parse(item);

        if (!validItem.nomor_kasus) validItem.nomor_kasus = this.generateNomorKasus();

        let itemWithFiles = await this.handleFileUploads(validItem, req?.user?.username);
        let finalItem = await this.validateBusinessLogic(itemWithFiles);
        
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
      if (trx && !(trx as any).finished) await trx.rollback();
      const msg = err instanceof z.ZodError ? `Validasi Gagal: ${err.issues[0].message}` : err.message;
      return helper.catchError(msg, 400, res);
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const check = await repository.detail({ id_kasus: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      const validData = kasusPelanggaranSantriSchema.parse(req.body);
      
      let itemWithFiles = await this.handleFileUploads(validData, req?.user?.username);
      const finalUpdate = await this.validateBusinessLogic({ ...check.toJSON(), ...itemWithFiles }, id);

      const payload = helper.only(variable.fillable(), finalUpdate, true);
      await repository.update({
        payload: { ...payload, updated_at: helper.date() },
        condition: { id_kasus: id },
      });

      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      const msg = err instanceof z.ZodError ? `Update Gagal: ${err.issues[0].message}` : err.message;
      return helper.catchError(msg, 400, res);
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const check = await repository.detail({ id_kasus: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      await repository.delete({ id_kasus: id });

      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(`Gagal menghapus: ${err?.message}`, 500, res);
    }
  }

  public async export(req: Request, res: Response) {
    try {
      const { q, template, status_progress, level_sp, id_santri } = req?.body;
      const isTemplate: boolean = template && template == '1';

      let result = await repository.listForExport({
        q,
        isTemplate,
        status_progress,
        level_sp,
        id_santri
      });

      const { dir, path } = await helper.checkDirExport('excel');
      const filename = `kasus_pelanggaran_santri-${isTemplate ? 'template' : moment().tz(TIMEZONE).format('DDMMYYYY')}.xlsx`;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('DATA KASUS');

      generateDataExcel(sheet, result, isTemplate);
      await workbook.xlsx.writeFile(`${path}/${filename}`);

      return response.success('export excel kasus berhasil', `${dir}/${filename}`, res);
    } catch (err: any) {
      return helper.catchError(`export excel kasus: ${err?.message}`, 500, res);
    }
  }

  public async import(req: Request, res: Response) {
    const mode: 'preview' | 'commit' = req.body?.mode ?? 'preview';
    const uploaded = req.files?.file_import;
    if (!uploaded) return response.success('File tidak valid', null, res, false);

    try {
      const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      const buffer = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;
      const rows = await helper.parseImportFile({ name: file.name, data: buffer });
      const results: any[] = [];

      for (const raw of rows) {
        const row = normalizeRow(raw);
        const errors = validateRow(row);
        const valid = errors.length === 0;

        const payload = {
          nomor_kasus: row.nomor_kasus || this.generateNomorKasus(),
          tanggal_kejadian: row.tanggal_kejadian,
          id_santri: row.id_santri,
          id_pelanggaran_remisi: row.id_pelanggaran_remisi,
          jenis: row.jenis,
          id_lokasi: row.id_lokasi,
          skor_master_snapshot: row.skor_master_snapshot,
          skor_diberikan: row.skor_diberikan,
          alasan_penyesuaian_skor: row.alasan_penyesuaian_skor,
          level_sp: row.level_sp,
          nomor_surat_sp: row.nomor_surat_sp,
          status_progress: row.status_progress,
          kronologi: row.kronologi,
          punishment_detail: row.punishment_detail,
          id_petugas_pelapor: row.id_petugas_pelapor,
          id_petugas_penanggung_jawab: row.id_petugas_penanggung_jawab,
        };

        results.push({ row: row.__row, valid, error: errors.length ? errors.join(', ') : null, payload });
      }

      const dataRes = {
        mode,
        total: results.length,
        valid: results.filter((r) => r.valid).length,
        invalid: results.filter((r) => !r.valid).length,
      };

      if (mode === 'commit') {
        const validPayloads = results.filter((r) => r.valid).map((r) => r.payload);
        if (validPayloads.length > 0) await repository.insertImport(validPayloads);
        return response.success('import kasus berhasil', dataRes, res);
      }

      return response.success('preview import kasus', { ...dataRes, data: results }, res);
    } catch (err: any) {
      return helper.catchError(`import excel kasus: ${err?.message}`, 500, res);
    }
  }

  public insert = async (req: Request, res: Response) => {
    const payloads = req.body?.data as any[];
    if (!payloads || payloads.length === 0)
      return response.success('Data kosong', null, res, false);

    try {
      const sanitizedPayloads = payloads.map(p => ({
        ...p,
        nomor_kasus: p.nomor_kasus || this.generateNomorKasus(),
      }));

      await repository.insertImport(sanitizedPayloads);
      return response.success('Import batch berhasil', { count: payloads.length }, res);
    } catch (err: any) {
      return helper.catchError(err.message, 500, res);
    }
  };
}

export const KasusPelanggaranSantri = new Controller();