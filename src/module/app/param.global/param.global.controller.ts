'use strict';

import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './param.global.variable';
import { response } from '../../../helpers/response';
import { repository } from './param.global.repository';
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
      const result = await repository.list({
        param_key: req?.query?.param_key || null,
      });
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`param global list: ${err?.message}`, 500, res);
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
      return helper.catchError(`param global index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const key = req?.query?.key || '';
      const result: Object | any = await repository.list({
        param_key: key,
      });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(
        `param global detail: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async detailById(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({ id });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(
        `param global detail: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const check = await repository.detail({
        param_key: req?.body?.param_key,
      });
      if (check) return response.failed(ALREADY_EXIST, 400, res);
      const data: Object = helper.only(variable.fillable(), req?.body);
      await repository.create({
        payload: { ...data, created_by: req?.user?.id },
      });
      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `param global create: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      const data: Object = helper.only(variable.fillable(), req?.body, true);
      await repository.update({
        payload: { ...data, modified_by: req?.user?.id },
        condition: { id: id },
      });
      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `param global update: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.update({
        payload: {
          status: 9,
          modified_by: req?.user?.id,
          modified_date: date,
        },
        condition: { id: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `param global delete: ${err?.message}`,
        500,
        res
      );
    }
  }
}

export const paramGlobal = new Controller();
