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
} from '../../../utils/constant';
import { rawQuery } from '../../../helpers/rawQuery';
import { QueryTypes } from 'sequelize';
import moment from 'moment';

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

export default class Controller {
  public async list(req: Request, res: Response) {
    try {
      const status: any = req?.query?.status || '';
      const result = await repository.list({ status });
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`kelas formal list: ${err?.message}`, 500, res);
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
      const filename: string = `${name}-${isTemplate ? 'template' : moment().format('DDMMYYYY')}.xlsx`;
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
}

export const kelasFormal = new Controller();
