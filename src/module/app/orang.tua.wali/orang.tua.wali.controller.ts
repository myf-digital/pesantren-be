'use strict';

import ExcelJS from 'exceljs';
import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './orang.tua.wali.variable';
import { response } from '../../../helpers/response';
import { repository } from './orang.tua.wali.repository';
import {
  ALREADY_EXIST,
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
} from '../../../utils/constant';
import moment from 'moment';

const date: string = helper.date();

const generateDataExcel = (sheet: any, details: any) => {
  sheet.addRow([
    'No',
    'Nama Wali',
    'Hubungan',
    'Nik',
    'Pendidikan',
    'Pekerjaan',
    'Penghasilan',
    'No Hp',
    'Alamat',
    'Provinsi',
    'Kabupaten',
    'Kecamatan',
    'Kelurahan',
    'Keterangan',
  ]);

  sheet.getRow(1).eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (let i in details) {
    sheet.addRow([
      parseInt(i) + 1,
      details[i]?.nama_wali || '',
      details[i]?.hubungan || '',
      details[i]?.nik || '',
      details[i]?.pendidikan || '',
      details[i]?.pekerjaan || '',
      details[i]?.penghasilan || '',
      details[i]?.no_hp || '',
      details[i]?.alamat || '',
      details[i]?.province.name || '',
      details[i]?.city.name || '',
      details[i]?.district.name || '',
      details[i]?.sub_district.name || '',
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
      const result = await repository.list({});
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`orang tua wali list: ${err?.message}`, 500, res);
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
      return helper.catchError(
        `orang tua wali index: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({ id_wali: id, is_deleted: false });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(
        `orang tua wali detail: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { id_santri, nik, province_id, city_id, district_id, sub_district_id } = req?.body;
      if (nik) {
        const check = await repository.detail({ nik });
        if (check) return response.failed(ALREADY_EXIST, 400, res);
      }
      
      const data: Object = helper.only(variable.fillable(), req?.body);

      await repository.create({
        payload: { ...data, 
          id_santri: id_santri?.value || null ,
          province_id: province_id?.value || null,
          city_id: city_id?.value || null,
          district_id: district_id?.value || null,
          sub_district_id: sub_district_id?.value || null,
        },
      });
      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `orang tua wali create: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_wali: id, is_deleted: false });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      const { id_santri, nik, province_id, city_id, district_id, sub_district_id } = req?.body;
      if (nik && (nik !== check.nik)) {
        const duplicate = await repository.detail({ nik });

        if (duplicate) {
          return response.failed(ALREADY_EXIST, 400, res);
        }
      }
      const data: Object = helper.only(variable.fillable(), req?.body, true);
      await repository.update({
        payload: {
          ...data,
          id_santri: id_santri?.value || check?.getDataValue('id_santri'),
          province_id: province_id?.value || check?.getDataValue('province_id'),
          city_id: city_id?.value || check?.getDataValue('city_id'),
          district_id: district_id?.value || check?.getDataValue('district_id'),
          sub_district_id: sub_district_id?.value || check?.getDataValue('sub_district_id'),
        },
        condition: { id_wali: id },
      });
      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `orang tua wali update: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_wali: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.update({
        payload: {
          is_deleted: true,
          deleted_at: date,
        },
        condition: { id_wali: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `orang tua wali delete: ${err?.message}`,
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
          result = await repository.list({status: q});
          if (result?.length < 1)
            return response.success(NOT_FOUND, null, res, false);
        }
  
        const { dir, path } = await helper.checkDirExport('excel');
  
        const name: string = 'orang-tua-wali';
        const filename: string = `${name}-${isTemplate ? 'template' : moment().format('DDMMYYYY')}.xlsx`;
        const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
        const urlExcel: string = `${dir}/${filename}`;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(title);
  
        generateDataExcel(sheet, result);
        await workbook.xlsx.writeFile(`${path}/${filename}`);
        return response.success('export excel orang tua wali', urlExcel, res);
      } catch (err: any) {
        return helper.catchError(
          `export excel orang tua wali: ${err?.message}`,
          500,
          res
        );
      }
    }
}

export const orangTuaWali = new Controller();
