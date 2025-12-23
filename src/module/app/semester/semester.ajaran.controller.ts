'use strict';

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

const date: string = helper.date();

export default class Controller {
  public async list(req: Request, res: Response) {
    try {
      const status: any = req?.query?.status || '';
      const result = await repository.list({status});
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
      const check = await repository.detail({ nama_semester, id_tahunajaran: idTahunajaran });
      const nomorIsExist = await repository.detail({ nomor_urut, id_tahunajaran: idTahunajaran });
      if (check || nomorIsExist) return response.failed(ALREADY_EXIST, 400, res);
      const data: Object = helper.only(variable.fillable(), req?.body);
      const result = await repository.create({
        payload: { ...data, id_tahunajaran: idTahunajaran },
      });
      if (result.status === 'Aktif') {
        const query = `UPDATE semester SET status='Nonaktif' WHERE id_semester != :id_semester AND status != 'Arsip'`
        const conn = await rawQuery.getConnection();
        await conn.query(query, {
          type:QueryTypes.UPDATE,
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
       
      if (nama_semester !== check.nama_semester || idTahunajaran !== check.id_tahunajaran) {
        const duplicate = await repository.detail({ nama_semester, id_tahunajaran: idTahunajaran });

        if (duplicate) {
          return response.failed(ALREADY_EXIST, 400, res);
        }
      }

      if (nomor_urut !== check.nomor_urut || idTahunajaran !== check.id_tahunajaran) {
        const nomorIsExist = await repository.detail({ nomor_urut, id_tahunajaran: idTahunajaran });

        if (nomorIsExist) {
          return response.failed(ALREADY_EXIST, 400, res);
        }
      }

      const data: Object = helper.only(variable.fillable(), req?.body, true);

      let newData: Object = {};
      if (status === 'Arsip') {
        newData = {archived_at: date, archived_by: req?.user?.id}
      }

      await repository.update({
        payload: {
          ...data,
          ...newData,
          id_tahunajaran: idTahunajaran || check?.getDataValue('id_tahunajaran'),
        },
        condition: { id_semester: id },
      });

      if (status === 'Aktif') {
        const query = `UPDATE semester SET status='Nonaktif' WHERE id_semester != :id_semester AND status != 'Arsip'`
        const conn = await rawQuery.getConnection();
        await conn.query(query, {
          type:QueryTypes.UPDATE,
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
}

export const semester = new Controller();
