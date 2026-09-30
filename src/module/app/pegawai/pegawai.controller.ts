'use strict';

import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './pegawai.variable';
import { response } from '../../../helpers/response';
import { repository } from './pegawai.repository';
import { repository as orgRepo } from '../organization.unit/organization.unit.repository';
import { repository as jabatanRepo } from '../jabatan/jabatan.repository';
import { pegawaiSchema } from './pegawai.schema';
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
import { appConfig } from '../../../config/config.app';
import { sequelize } from '../../../database/connection';

const generateDataExcel = (
  sheet: any,
  details: any,
  isTemplate: boolean = false
) => {
  // Definisikan susunan teks header persis di baris pertama
  sheet.addRow([
    'No',
    'NIK',
    'NIP',
    'Nama Lengkap',
    'Email',
    'No HP',
    'L/P',
    'Tempat Lahir',
    'Tgl Lahir',
    'Unit Kerja',
    'Jabatan',
    'Pendidikan',
    'Bidang Ilmu',
    'TMT',
    'Status',
    'Provinsi',
    'Kota/Kabupaten',
    'Kecamatan',
    'Kelurahan',
    'Alamat',
  ]);

  // Set property metadata kolom (width disesuaikan agar proporsional)
  sheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'NIK', key: 'nik', width: 20 },
    { header: 'NIP', key: 'nip', width: 25 },
    { header: 'Nama Lengkap', key: 'nama_lengkap', width: 30 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'No HP', key: 'no_hp', width: 18 },
    { header: 'L/P', key: 'jenis_kelamin', width: 8 },
    { header: 'Tempat Lahir', key: 'tempat_lahir', width: 20 },
    { header: 'Tgl Lahir', key: 'tanggal_lahir', width: 15 },
    { header: 'Unit Kerja', key: 'unit', width: 25 },
    { header: 'Jabatan', key: 'jabatan', width: 25 },
    { header: 'Pendidikan', key: 'pendidikan', width: 20 },
    { header: 'Bidang Ilmu', key: 'bidang_ilmu', width: 20 },
    { header: 'TMT', key: 'tmt', width: 15 },
    { header: 'Status', key: 'status_pegawai', width: 15 },
    { header: 'Provinsi', key: 'provinsi', width: 25 },
    { header: 'Kota/Kabupaten', key: 'kota', width: 25 },
    { header: 'Kecamatan', key: 'kecamatan', width: 25 },
    { header: 'Kelurahan', key: 'kelurahan', width: 25 },
    { header: 'Alamat', key: 'alamat', width: 40 },
  ];

  // Styling Header Baris Pertama
  sheet.getRow(1).eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    // Jika ingin mempertahankan warna abu-abu dari kode pertama Anda, buka baris di bawah ini:
    // cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  // Perulangan Data menggunakan gaya indeks array (for...in) & Logika IsTemplate
  for (let i in details) {
    sheet.addRow([
      parseInt(i) + 1,
      details[i]?.nik || '',
      details[i]?.nip || '',
      details[i]?.nama_lengkap || '',
      details[i]?.email || '',
      details[i]?.no_hp || '',
      details[i]?.jenis_kelamin === 'Laki-laki' ? 'L' : 'P',
      details[i]?.tempat_lahir || '',
      details[i]?.tanggal_lahir
        ? moment(details[i].tanggal_lahir).format('YYYY-MM-DD')
        : '',
      isTemplate
        ? details[i]?.organizationUnit?.id_orgunit
        : details[i]?.organizationUnit?.nama_orgunit || '',
      (isTemplate
        ? details[i]?.jabatan?.id_jabatan
        : details[i]?.jabatan?.nama_jabatan) || '',
      details[i]?.pendidikan || '',
      details[i]?.bidang_ilmu || '',
      details[i]?.tmt ? moment(details[i].tmt).format('YYYY-MM-DD') : '',
      details[i]?.status_pegawai || '',
      // Logika Wilayah: Jika template, keluarkan ID wilayah untuk mempermudah import ulang. Jika bukan, keluarkan Nama.
      isTemplate ? details[i]?.province_id : details[i]?.province?.name || '',
      isTemplate ? details[i]?.city_id : details[i]?.city?.name || '',
      isTemplate ? details[i]?.district_id : details[i]?.district?.name || '',
      isTemplate
        ? details[i]?.sub_district_id
        : details[i]?.subDistrict?.name || '',
      details[i]?.alamat || '',
    ]);
  }

  // 5. Pemberian Border secara paksa ke seluruh cell yang aktif
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
  nik: String(row['NIK'] || '').trim(),
  nip: String(row['NIP'] || '').trim(),
  nama_lengkap: String(row['Nama Lengkap'] || '').trim(),
  email: String(row['Email'] || '').trim(),
  no_hp: String(row['No HP'] || '').trim(),
  jenis_kelamin: row['L/P'] === 'P' ? 'Perempuan' : 'Laki-laki',
  tempat_lahir: String(row['Tempat Lahir'] || '').trim(),
  tanggal_lahir: row['Tgl Lahir'] || null,
  pendidikan: String(row['Pendidikan'] || '').trim(),
  bidang_ilmu: String(row['Bidang Ilmu'] || '').trim(),
  tmt: row['TMT'] || null,
  status_pegawai: String(row['Status'] || 'Aktif').trim(),
  // foto: String(row['Foto'] || '').trim(),
  id_orgunit: String(row['Unit Kerja'] || '').trim(),
  id_jabatan: String(row['Jabatan'] || '').trim(),
  provinsi: String(row['Provinsi'] || '').trim(),
  kota_kabupaten: String(row['Kota/Kabupaten'] || '').trim(),
  kecamatan: String(row['Kecamatan'] || '').trim(),
  kelurahan: String(row['Kelurahan'] || '').trim(),
  alamat: String(row['Alamat'] || '').trim(),
  __row: row.__row,
});

const validateRow = (row: any) => {
  const errors: string[] = [];
  if (!row.nama_lengkap) errors.push('Nama Lengkap wajib diisi');
  if (!row.nik && !row.nip) errors.push('NIK atau NIP harus diisi salah satu');
  return errors;
};
export default class Controller {
  constructor() {
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
  }
  /**
   * Validasi Logika Bisnis (NIK/NIP Unique, Umur, & Hierarki Wilayah)
   */
  private async validateBusinessLogic(item: any, id_pegawai?: string) {
    // 1. Cek Duplikasi NIK & NIP
    const checkNik = await repository.checkDuplicate(
      'nik',
      item.nik,
      id_pegawai
    );
    if (checkNik)
      throw new Error(`NIK [${item.nik}] sudah terdaftar pada pegawai lain.`);

    if (item.nip) {
      const checkNip = await repository.checkDuplicate(
        'nip',
        item.nip,
        id_pegawai
      );
      if (checkNip)
        throw new Error(`NIP [${item.nip}] sudah terdaftar pada pegawai lain.`);
    }

    // Hitung Umur Otomatis
    if (item.tanggal_lahir) {
      const birthDate = moment(item.tanggal_lahir);
      if (birthDate.isValid()) {
        item.umur = moment().tz(TIMEZONE).diff(birthDate, 'years');
      }
    }

    // Validasi Hierarki Wilayah
    if (
      item.sub_district_id &&
      (!item.district_id || !item.city_id || !item.province_id)
    ) {
      throw new Error(
        'Data Wilayah Tidak Lengkap: Jika Kelurahan diisi, maka Kecamatan, Kota, dan Provinsi wajib ada.'
      );
    }
    if (item.district_id && (!item.city_id || !item.province_id)) {
      throw new Error(
        'Data Wilayah Tidak Lengkap: Jika Kecamatan diisi, maka Kota dan Provinsi wajib ada.'
      );
    }
    if (item.city_id && !item.province_id) {
      throw new Error(
        'Data Wilayah Tidak Lengkap: Jika Kota diisi, maka Provinsi wajib ada.'
      );
    }

    return item;
  }

  public async list(req: Request, res: Response) {
    try {
      const status_pegawai: any = req?.query?.status_pegawai || '';
      const is_guru: any = req?.query?.is_guru || '';
      const lembaga_type: any = req?.query?.lembaga_type || '';
      const id_lembaga: any = req?.query?.id_lembaga || '';
      const keyword: any = req?.query?.keyword || req?.query?.q || '';
      const result = await repository.list({
        status_pegawai,
        is_guru,
        lembaga_type,
        id_lembaga,
        keyword,
      });
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`Pegawai list: ${err?.message}`, 500, res);
    }
  }

  public async index(req: Request, res: Response) {
    try {
      const query = helper.fetchQueryRequest(req);
      const filter = {
        ...query,
        id_jabatan: req.query.id_jabatan || '',
        status_pegawai: req.query.status_pegawai || '',
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
      return helper.catchError(`Pegawai index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const result = await repository.detail({ id_pegawai: id });
      if (!result) return response.success(NOT_FOUND, null, res, false);

      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`Pegawai detail: ${err?.message}`, 500, res);
    }
  }

  public async create(req: Request, res: Response) {
    const trx = await sequelize.transaction();
    try {
      const body = req.body;
      const payloadArray = Array.isArray(body) ? body : [body];
      const validatedData = [];

      for (const item of payloadArray) {
        let validItem = pegawaiSchema.parse(item);

        let checkFile = helper.checkExtentionBase64(item.foto);
        if (checkFile != 'allowed') {
          if (trx) await trx.rollback();
          return response.failed(checkFile, 422, res);
        }

        validItem.foto = item.foto
          ? await helper.uploadBase64(
              item.foto,
              `foto-pegawai-${Date.now()}`,
              'pegawai',
              req?.user?.username,
              appConfig?.assetType
            )
          : null;
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
      const check = await repository.detail({ id_pegawai: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      // Validasi Schema Zod (Partial agar tidak wajib semua field diisi saat update)
      const validData = pegawaiSchema.partial().parse(req.body);

      if (req.body.foto) {
        let checkFile = helper.checkExtentionBase64(req.body.foto);
        if (checkFile != 'allowed') return response.failed(checkFile, 422, res);

        validData.foto = validData.foto
          ? await helper.uploadBase64(
              validData.foto,
              `foto-pegawai-${Date.now()}`,
              'pegawai',
              req?.user?.username,
              appConfig?.assetType
            )
          : null;
      }
      // Validasi Logika Bisnis & Duplikasi
      const finalUpdate = await this.validateBusinessLogic(
        { ...check.toJSON(), ...validData },
        id
      );

      // C. Filter Fillable & Simpan
      const payload = helper.only(variable.fillable(), finalUpdate, true);
      await repository.update({
        payload: { ...payload, updated_at: helper.date() },
        condition: { id_pegawai: id },
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
      const check = await repository.detail({ id_pegawai: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      // Melakukan Soft Delete (Sequelize paranoid)
      await repository.delete({ id_pegawai: id });

      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(`Gagal menghapus: ${err?.message}`, 500, res);
    }
  }

  public async export(req: Request, res: Response) {
    try {
      let condition: any = {};
      const { q, template, id_jabatan, status_pegawai } = req?.body;
      const isTemplate: boolean = template && template == '1';

      let result = await repository.listForExport({
        q,
        isTemplate,
        id_jabatan,
        status_pegawai,
      });

      const { dir, path } = await helper.checkDirExport('excel');
      const filename = `pegawai-${isTemplate ? 'template' : moment().tz(TIMEZONE).format('DDMMYYYY')}.xlsx`;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('DATA PEGAWAI');

      generateDataExcel(sheet, result, isTemplate);
      await workbook.xlsx.writeFile(`${path}/${filename}`);

      return response.success(
        'export excel pegawai',
        `${dir}/${filename}`,
        res
      );
    } catch (err: any) {
      return helper.catchError(
        `export excel pegawai: ${err?.message}`,
        500,
        res
      );
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

        console.log('Processing Row:', row);

        let id_orgunit = null,
          id_jabatan = null;

        // Resolve Wilayah IDs
        const areas = await repository.resolveAreaIds(row);

        // Resolve Unit Kerja & Jabatan IDs
        if (row.id_orgunit) {
          const unit: any = await orgRepo.detail({
            id_orgunit: row.id_orgunit,
          });
          if (unit) id_orgunit = unit.id_orgunit;
          else
            errors.push(`Unit organisasi "${row.id_orgunit}" tidak ditemukan`);
        }

        if (row.id_jabatan) {
          const jab: any = await jabatanRepo.detail({
            id_jabatan: row.id_jabatan,
          });
          if (jab) id_jabatan = jab.id_jabatan;
          else errors.push(`Jabatan "${row.id_jabatan}" tidak ditemukan`);
        }

        const valid = errors.length === 0;
        const payload = {
          nik: row.nik,
          nip: row.nip,
          nama_lengkap: row.nama_lengkap,
          email: row.email,
          no_hp: row.no_hp,
          jenis_kelamin: row.jenis_kelamin,
          tempat_lahir: row.tempat_lahir,
          tanggal_lahir: row.tanggal_lahir
            ? moment(row.tanggal_lahir).format('YYYY-MM-DD')
            : null,
          pendidikan: row.pendidikan,
          bidang_ilmu: row.bidang_ilmu,
          tmt: row.tmt ? moment(row.tmt).format('YYYY-MM-DD') : null,
          status_pegawai: row.status_pegawai,
          // foto: row.foto,
          alamat: row.alamat,
          id_orgunit,
          id_jabatan,
          ...areas,
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
        return response.success('import pegawai berhasil', dataRes, res);
      }

      return response.success(
        'preview import pegawai',
        { ...dataRes, data: results },
        res
      );
    } catch (err: any) {
      return helper.catchError(
        `import excel pegawai: ${err?.message}`,
        500,
        res
      );
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

export const Pegawai = new Controller();
