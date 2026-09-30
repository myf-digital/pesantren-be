'use strict';

import ExcelJS from 'exceljs';
import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './kelas.formal.variable';
import { response } from '../../../helpers/response';
import { repository } from './kelas.formal.repository';
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
import { kelasFormalSchema } from './kelas.formal.schema';
import { repository as tahunAjaranRepository } from '../tahun.ajaran/tahun.ajaran.repository';
import { repository as lembagaRepository } from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.repository';
import { repository as pegawaiRepository } from '../pegawai/pegawai.repository';
import { repository as tingkatRepository } from '../tingkat/tingkat.repository';
import { sequelize } from '../../../database/connection';
import fs from 'fs/promises';
import KelasFormal from './kelas.formal.model';

const date: string = helper.date();

const generateDataExcel = (sheet: any, details: any) => {
  sheet.addRow([
    'No',
    'Nama Kelas',
    'Lembaga Formal',
    'Tahun Ajaran',
    'Tingkat',
    'Wali Kelas',
    'Status',
    'Nomor Urut',
    'Keterangan',
  ]);

  sheet.getRow(1).eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (let i in details) {
    sheet.addRow([
      parseInt(i) + 1,
      details[i]?.nama_kelas || '',
      details[i]?.lembaga?.nama_lembaga || '',
      details[i]?.tahun_ajaran?.tahun_ajaran || '',
      details[i]?.tingkat?.tingkat || '',
      details[i]?.pegawai?.nama_lengkap || '',
      details[i]?.status,
      details[i]?.nomor_urut,
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
  nama_kelas: String(row['Nama Kelas'] || '').trim(),
  nama_lembaga: String(row['Lembaga Formal'] || '').trim(),
  tahun_ajaran: String(row['Tahun Ajaran'] || '').trim(),
  tingkat: String(row['Tingkat'] || '').trim(),
  nama_lengkap: String(row['Wali Kelas'] || '').trim(),
  status: String(row['Status'] || '').trim(),
  nomor_urut:
    row['Nomor Urut'] !== undefined ? Number(row['Nomor Urut']) : null,
  keterangan: String(row['Keterangan'] || '').trim(),
  __row: row.__row,
});

const validateRow = (row: any) => {
  const errors: string[] = [];
  const valid = kelasFormalSchema.safeParse(row);

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
      const id_tingkat: any = req?.query?.id_tingkat || '';
      const id_tahunajaran: any = req?.query?.id_tahunajaran || '';
      const result = await repository.list({
        status,
        id_tingkat,
        id_tahunajaran,
      });
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`kelas formal list: ${err?.message}`, 500, res);
    }
  }

  public async index(req: Request, res: Response) {
    try {
      const query = {
        ...helper.fetchQueryRequest(req),
        status: req?.query?.status || '',
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
      return helper.catchError(`kelas formal index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({
        id_kelas: id,
      });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(
        `kelas formal detail: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const {
        nama_kelas,
        id_lembaga,
        id_tahunajaran,
        id_tingkat,
        id_wali_kelas,
      } = req?.body;

      const idLembaga = id_lembaga?.value || null;
      const idTahunajaran = id_tahunajaran?.value || null;
      const idTingkat = id_tingkat?.value || null;
      const idWaliKelas = id_wali_kelas?.value || null;
      const check = await repository.detail({
        nama_kelas,
        id_lembaga: idLembaga,
        id_tahunajaran: idTahunajaran,
      });

      if (check) return response.failed(ALREADY_EXIST, 400, res);
      const data: Object = helper.only(variable.fillable(), req?.body);
      const result = await repository.create({
        payload: {
          ...data,
          id_tingkat: idTingkat,
          id_wali_kelas: idWaliKelas,
          id_lembaga: idLembaga,
          id_tahunajaran: idTahunajaran,
        },
      });

      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `kelas formal create: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const {
        nama_kelas,
        id_lembaga,
        id_tahunajaran,
        status,
        id_tingkat,
        id_wali_kelas,
      } = req?.body;
      const idLembaga = id_lembaga?.value;
      const idTahunajaran = id_tahunajaran?.value;
      const idTingkat = id_tingkat?.value;
      const idWaliKelas = id_wali_kelas?.value;
      const check = await repository.detail({ id_kelas: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      if (
        nama_kelas !== check.nama_kelas ||
        idLembaga !== check.id_lembaga ||
        idTahunajaran !== check.id_tahunajaran
      ) {
        const duplicate = await repository.detail({
          nama_kelas,
          id_lembaga: idLembaga,
          id_tahunajaran: idTahunajaran,
        });

        if (duplicate) {
          return response.failed(ALREADY_EXIST, 400, res);
        }
      }
      const data: Object = helper.only(variable.fillable(), req?.body, true);

      let newData: Object = {};
      if (status === 'Arsip') {
        newData = { archived_at: date, archived_by: req?.user?.id };
      }

      await repository.update({
        payload: {
          ...data,
          ...newData,
          id_tahunajaran:
            idTahunajaran || check?.getDataValue('id_tahunajaran'),
          id_tingkat: idTingkat || check?.getDataValue('id_tingkat'),
          id_wali_kelas: idWaliKelas || check?.getDataValue('id_wali_kelas'),
          id_lembaga: idLembaga || check?.getDataValue('id_lembaga'),
        },
        condition: { id_kelas: id },
      });

      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `kelas formal update: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_kelas: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_kelas: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `kelas formal delete: ${err?.message}`,
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

      const name: string = 'kelas-formal';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().tz(TIMEZONE).format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title);

      generateDataExcel(sheet, result);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel kelas formal', urlExcel, res);
    } catch (err: any) {
      return helper.catchError(
        `export excel kelas formal: ${err?.message}`,
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

        const nama_kelas = row.nama_kelas;
        const tahun_ajaran = row.tahun_ajaran;
        const nama_lembaga = row.nama_lembaga;
        const nama_lengkap = row.nama_lengkap;
        const tingkat = row.tingkat;

        const tahunAjaranExist = await tahunAjaranRepository.detail({
          tahun_ajaran,
        });
        if (!tahunAjaranExist) {
          errors.push(`Tahun Ajaran ${tahun_ajaran} tidak ditemukan`);
        }

        const tingkatExist = await tingkatRepository.detail({ tingkat });
        if (!tingkatExist) {
          errors.push(`Tingkat ${tingkat} tidak ditemukan`);
        }

        const lembagaExist = await lembagaRepository.detail({ nama_lembaga });
        if (!lembagaExist) {
          errors.push(`Lembaga ${nama_lembaga} tidak ditemukan`);
        }

        const pegawaiExist = await pegawaiRepository.detail({ nama_lengkap });
        if (!pegawaiExist) {
          errors.push(`Wali Kelas ${nama_lengkap} tidak ditemukan`);
        }

        const valid = errors.length === 0;

        const payload = {
          id_tahunajaran: tahunAjaranExist?.id_tahunajaran,
          id_lembaga: lembagaExist?.id_lembaga,
          id_tingkat: tingkatExist?.id_tingkat,
          id_wali_kelas: pegawaiExist?.id_pegawai,
          nama_kelas: row.nama_kelas,
          lembaga: row.nama_lembaga,
          tahun_ajaran: row.tahun_ajaran,
          tingkat: row.tingkat,
          wali_kelas: row.nama_lengkap,
          status: row.status,
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

        const existing = await repository.detail({
          nama_kelas,
          id_tahunajaran: tahunAjaranExist?.id_tahunajaran,
          id_lembaga: lembagaExist?.id_lembaga,
        });

        if (existing) {
          await existing.update(
            {
              ...payload,
            },
            { transaction: trx! }
          );
        } else {
          let newCreate = await KelasFormal.create(
            {
              ...payload,
            },
            { transaction: trx! }
          );
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

        return response.success('import kelas formal berhasil', dataRes, res);
      }

      return response.success(
        'preview import kelas formal',
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
        `import excel kelas formal: ${err?.message}`,
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
          nama_kelas: payload.nama_kelas,
          id_tahunajaran: payload.id_tahunajaran,
          id_lembaga: payload.id_lembaga,
        });

        if (existing) {
          await existing.update(
            {
              ...payload,
            },
            { transaction: trx }
          );
        } else {
          let newCreate = await KelasFormal.create(
            {
              ...payload,
            },
            { transaction: trx }
          );
        }
      }

      await trx.commit();

      return response.success(
        'Import batch kelas formal berhasil',
        { total: payloads.length },
        res
      );
    } catch (err: any) {
      await trx.rollback();
      return helper.catchError(`Import batch gagal: ${err.message}`, 500, res);
    }
  }
}

export const kelasFormal = new Controller();
