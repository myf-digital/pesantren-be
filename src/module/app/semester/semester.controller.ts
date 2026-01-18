'use strict';

import ExcelJS from 'exceljs';
import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './semester.variable';
import { response } from '../../../helpers/response';
import { repository } from './semester.repository';
import {
  ALREADY_EXIST,
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
} from '../../../utils/constant';
import { rawQuery } from '../../../helpers/rawQuery';
import { QueryTypes } from 'sequelize';
import moment from 'moment';
import fs from 'fs/promises';
import { semesterSchema } from './semester.schema';
import { sequelize } from '../../../database/connection';
import Semester from './semester.model';
import { repository as tahunAjaranRepository } from '../tahun.ajaran/tahun.ajaran.repository';

const date: string = helper.date();

const generateDataExcel = (sheet: any, details: any) => {
  sheet.addRow([
    'No',
    'Tahun Ajaran',
    'Semester',
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
      details[i]?.tahun_ajaran?.tahun_ajaran || '',
      details[i]?.nama_semester || '',
      details[i]?.status,
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
  tahun_ajaran: String(row['Tahun Ajaran'] || '').trim(),
  nama_semester: String(row['Semester'] || '').trim(),
  status: String(row['Status'] || '').trim(),
  nomor_urut:
    row['Nomor Urut'] !== undefined ? Number(row['Nomor Urut']) : null,
  keterangan: String(row['Keterangan'] || '').trim(),
  __row: row.__row,
});

const validateRow = (row: any) => {
  const errors: string[] = [];
  const valid = semesterSchema.safeParse(row);

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
      const result = await repository.list({ status });
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`semester list: ${err?.message}`, 500, res);
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
      return helper.catchError(`semester index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({ id_semester: id });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`semester detail: ${err?.message}`, 500, res);
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { nama_semester, id_tahunajaran, nomor_urut } = req?.body;

      const idTahunajaran = id_tahunajaran?.value || null;
      const check = await repository.detail({
        nama_semester,
        id_tahunajaran: idTahunajaran,
      });
      const nomorIsExist = await repository.detail({
        nomor_urut,
        id_tahunajaran: idTahunajaran,
      });
      if (check || nomorIsExist)
        return response.failed(ALREADY_EXIST, 400, res);
      const data: Object = helper.only(variable.fillable(), req?.body);
      const result = await repository.create({
        payload: { ...data, id_tahunajaran: idTahunajaran },
      });
      if (result.status === 'Aktif') {
        const query = `UPDATE semester SET status='Nonaktif' WHERE id_semester != :id_semester AND status != 'Arsip'`;
        const conn = await rawQuery.getConnection();
        await conn.query(query, {
          type: QueryTypes.UPDATE,
          replacements: {
            id_semester: result.id_semester,
          },
        });
      }
      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(`semester create: ${err?.message}`, 500, res);
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const { nama_semester, id_tahunajaran, nomor_urut, status } = req?.body;
      const idTahunajaran = id_tahunajaran?.value;
      const check = await repository.detail({ id_semester: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      if (
        nama_semester !== check.nama_semester ||
        idTahunajaran !== check.id_tahunajaran
      ) {
        const duplicate = await repository.detail({
          nama_semester,
          id_tahunajaran: idTahunajaran,
        });

        if (duplicate) {
          return response.failed(ALREADY_EXIST, 400, res);
        }
      }

      if (
        nomor_urut !== check.nomor_urut ||
        idTahunajaran !== check.id_tahunajaran
      ) {
        const nomorIsExist = await repository.detail({
          nomor_urut,
          id_tahunajaran: idTahunajaran,
        });

        if (nomorIsExist) {
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
        },
        condition: { id_semester: id },
      });

      if (status === 'Aktif') {
        const query = `UPDATE semester SET status='Nonaktif' WHERE id_semester != :id_semester AND status != 'Arsip'`;
        const conn = await rawQuery.getConnection();
        await conn.query(query, {
          type: QueryTypes.UPDATE,
          replacements: {
            id_semester: id,
          },
        });
      }

      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(`semester update: ${err?.message}`, 500, res);
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_semester: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_semester: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(`semester delete: ${err?.message}`, 500, res);
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

      const name: string = 'semester';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title);

      generateDataExcel(sheet, result);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel semester', urlExcel, res);
    } catch (err: any) {
      return helper.catchError(
        `export excel semester: ${err?.message}`,
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

        const tahun_ajaran = row.tahun_ajaran;
        const nama_semester = row.nama_semester;
        const status = row.status;
        const nomor_urut = row.nomor_urut;

        const tahunAjaranExist = await tahunAjaranRepository.detail({
          tahun_ajaran,
        });
        if (!tahunAjaranExist) {
          errors.push(`Tahun Ajaran ${tahun_ajaran} tidak ditemukan`);
        } else {
          const semesterExist = await repository.detail({
            nama_semester,
            id_tahunajaran: tahunAjaranExist?.id_tahunajaran,
          });
          if (
            semesterExist &&
            semesterExist.getDataValue('nomor_urut') !== nomor_urut
          ) {
            const nomorIsExist = await repository.detail({
              nomor_urut,
              id_tahunajaran: tahunAjaranExist?.id_tahunajaran,
            });

            if (nomorIsExist) {
              errors.push(
                `Tahun Ajaran ${tahunAjaranExist?.tahun_ajaran} dengan Nomor Urut ${nomor_urut} sudah ada`
              );
            }
          }
        }

        const valid = errors.length === 0;

        const payload = {
          id_tahunajaran: tahunAjaranExist?.id_tahunajaran,
          nama_semester: row.nama_semester,
          tahun_ajaran: row.tahun_ajaran,
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
          nama_semester,
          id_tahunajaran: tahunAjaranExist?.id_tahunajaran,
        });

        if (existing) {
          await existing.update(
            {
              ...payload,
            },
            { transaction: trx! }
          );
          if (status === 'Aktif') {
            data = existing;
          }
        } else {
          let newCreate = await Semester.create(
            {
              ...payload,
            },
            { transaction: trx! }
          );
          if (status === 'Aktif') {
            data = newCreate;
          }
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

        if (data) {
          const query = `UPDATE semester SET status='Nonaktif' WHERE id_semester != :id_semester AND status != 'Arsip'`;
          const conn = await rawQuery.getConnection();
          await conn.query(query, {
            type: QueryTypes.UPDATE,
            replacements: {
              id_semester: data.id_semester,
            },
          });
        }

        return response.success('import semester berhasil', dataRes, res);
      }

      return response.success(
        'preview import semester',
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
        `import excel semester: ${err?.message}`,
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
          nama_semester: payload.nama_semester,
          id_tahunajaran: payload.id_tahunajaran,
        });

        if (existing) {
          await existing.update(
            {
              ...payload,
            },
            { transaction: trx }
          );
          if (payload.status === 'Aktif') {
            data = existing;
          }
        } else {
          let newCreate = await Semester.create(
            {
              ...payload,
            },
            { transaction: trx }
          );
          if (payload.status === 'Aktif') {
            data = newCreate;
          }
        }
      }

      await trx.commit();

      if (data) {
        const query = `UPDATE semester SET status='Nonaktif' WHERE id_semester != :id_semester AND status != 'Arsip'`;
        const conn = await rawQuery.getConnection();
        await conn.query(query, {
          type: QueryTypes.UPDATE,
          replacements: {
            id_semester: data.id_semester,
          },
        });
      }

      return response.success(
        'Import batch semester berhasil',
        { total: payloads.length },
        res
      );
    } catch (err: any) {
      await trx.rollback();
      return helper.catchError(`Import batch gagal: ${err.message}`, 500, res);
    }
  }
}

export const semester = new Controller();
