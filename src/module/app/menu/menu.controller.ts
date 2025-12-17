'use strict';

import { variable } from './menu.variable';
import { Request, Response } from 'express';
import { repository } from './menu.repository';
import { helper } from '../../../helpers/helper';
import { response } from '../../../helpers/response';
import {
  ALREADY_EXIST,
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
} from '../../../utils/constant';

export default class Controller {
  public async list(req: Request, res: Response) {
    try {
      const parent: any = req?.query?.parent || '';
      let condition: any = {};
      if (parent && parent == '1') {
        condition = {
          parent_id: '00000000-0000-0000-0000-000000000000'
        }
      }
      const result = await repository.list(condition);
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`menu all-data: ${err?.message}`, 500, res);
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
      return helper.catchError(`menu index: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({ menu_id: id });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(`menu detail: ${err?.message}`, 500, res);
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const check = await repository.detail({
        menu_name: req?.body?.menu_name,
      });
      if (check) return response.failed(ALREADY_EXIST, 400, res);
      const data: Object = helper.only(variable.fillable(), req?.body);

      let parent_id: string = req?.body?.parent_id || '';
      if (!parent_id || parent_id == undefined)
        parent_id = '00000000-0000-0000-0000-000000000000';

      await repository.create({
        payload: {
          ...data,
          module_name: req?.body?.module_name.replace(/ /g, ''),
          parent_id: parent_id,
          created_by: req?.user?.id,
        },
      });
      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(`menu create: ${err?.message}`, 500, res);
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ menu_id: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      const data: Object = helper.only(variable.fillable(), req?.body, true);

      let parent_id: string = req?.body?.parent_id || '';
      if (!parent_id || parent_id == undefined)
        parent_id = '00000000-0000-0000-0000-000000000000';

      await repository.update({
        payload: {
          ...data,
          module_name: req?.body?.module_name.replace(/ /g, ''),
          parent_id: parent_id,
          modified_by: req?.user?.id,
        },
        condition: { menu_id: id },
      });
      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(`menu update: ${err?.message}`, 500, res);
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const date: string = helper.date();
      const check = await repository.detail({ menu_id: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.update({
        payload: {
          status: 9,
          modified_by: req?.user?.id,
          modified_date: date,
        },
        condition: { menu_id: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(`menu delete: ${err?.message}`, 500, res);
    }
  }
}

export const menu = new Controller();
