'use strict';

import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './tahun.ajaran.variable';
import { response } from '../../../helpers/response';
import { repository } from './tahun.ajaran.repository';
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
      return helper.catchError(`tahun ajaran list: ${err?.message}`, 500, res);
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
      return helper.catchError(`tahun ajaran index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({
        id_tahunajaran: id,
      });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(
        `tahun ajaran detail: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { tahun_ajaran } = req?.body;
      const check = await repository.detail({ tahun_ajaran });
      if (check) return response.failed(ALREADY_EXIST, 400, res);
      const data: Object = helper.only(variable.fillable(), req?.body);
      const result =await repository.create({
        payload: { ...data },
      });
      if (result.status === 'Aktif') {
        const query = `UPDATE tahun_ajaran SET status='Nonaktif' WHERE id_tahunajaran != :id_tahunajaran AND status != 'Arsip'`
        const conn = await rawQuery.getConnection();
        await conn.query(query, {
          type:QueryTypes.UPDATE,
          replacements: {
            id_tahunajaran: result.id_tahunajaran,
          },
        });
      }
      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `tahun ajaran create: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const { tahun_ajaran, status } = req?.body;
      const check = await repository.detail({ id_tahunajaran: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      if (tahun_ajaran && tahun_ajaran !== check.tahun_ajaran) {
        const duplicate = await repository.detail({ tahun_ajaran });

        if (duplicate) {
          return response.failed(ALREADY_EXIST, 400, res);
        }
      }
      const data: Object = helper.only(variable.fillable(), req?.body, true);
      
      let newData: Object = {};
      if (status === 'Arsip') {
        newData = {archived_at: date, archived_by: req?.user?.id}
      }

      await repository.update({
        payload: { ...data, ...newData },
        condition: { id_tahunajaran: id },
      });

      if (status === 'Aktif') {
        const query = `UPDATE tahun_ajaran SET status='Nonaktif' WHERE id_tahunajaran != :id_tahunajaran AND status != 'Arsip'`
        const conn = await rawQuery.getConnection();
        await conn.query(query, {
          type:QueryTypes.UPDATE,
          replacements: {
            id_tahunajaran: id,
          },
        });
      }
      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `tahun ajaran update: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_tahunajaran: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_tahunajaran: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `tahun ajaran delete: ${err?.message}`,
        500,
        res
      );
    }
  }
}

export const tahunAjaran = new Controller();
