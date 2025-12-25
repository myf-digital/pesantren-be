'use strict';

import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './status.awal.santri.variable';
import { response } from '../../../helpers/response';
import { repository } from './status.awal.santri.repository';
import {
  ALREADY_EXIST,
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
} from '../../../utils/constant';

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
      return helper.catchError(
        `status awal santri list: ${err?.message}`,
        500,
        res
      );
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
        `status awal santri index: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({
        id_status_awal_santri: id,
      });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(
        `status awal santri detail: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { kode_status_awal } = req?.body;
      const check = await repository.detail({ kode_status_awal });
      if (check) return response.failed(ALREADY_EXIST, 400, res);
      const data: Object = helper.only(variable.fillable(), req?.body);
      await repository.create({
        payload: { ...data },
      });
      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `status awal santri create: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const { kode_status_awal } = req?.body;
      const check = await repository.detail({ id_status_awal_santri: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);

      if (kode_status_awal !== check.kode_status_awal) {
        const duplicate = await repository.detail({ kode_status_awal });

        if (duplicate) {
          return response.failed(ALREADY_EXIST, 400, res);
        }
      }

      const data: Object = helper.only(variable.fillable(), req?.body, true);
      await repository.update({
        payload: { ...data },
        condition: { id_status_awal_santri: id },
      });
      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `status awal santri update: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_status_awal_santri: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_status_awal_santri: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `status awal santri delete: ${err?.message}`,
        500,
        res
      );
    }
  }
}

export const statusAwalSantri = new Controller();
