'use strict';

import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import { response } from '../../../helpers/response';
import { helper } from '../../../helpers/helper';
import { repository } from './role.menu.repository';
import { transformer } from './role.menu.transformer';
import {
  NOT_FOUND,
  REQUIRED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
} from '../../../utils/constant';

export default class Controller {
  public async list(req: Request, res: Response) {
    try {
      const result = await repository.list();
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      const roleMenu = transformer.list(result);
      return response.success(SUCCESS_RETRIEVED, roleMenu, res);
    } catch (err: any) {
      return helper.catchError(`role menu all-data: ${err?.message}`, 500, res);
    }
  }

  public async index(req: Request, res: Response) {
    try {
      const query = helper.fetchQueryRequest(req);
      const { count, rows } = await repository.index(query);
      if (rows?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      const roleMenu = transformer.list(rows);
      const total: any = count;
      return response.success(
        SUCCESS_RETRIEVED,
        { total: total?.length, values: roleMenu },
        res
      );
    } catch (err: any) {
      return helper.catchError(`role menu index: ${err?.message}`, 500, res);
    }
  }

  public async create(req: Request, res: Response) {
    try {
      interface Menu {
        menu_id: string;
        view: number;
        create: number;
        edit: number;
        delete: number;
        approve: number;
        import: number;
        export: number;
        status: string;
      }
      const date: string = helper.date();
      const body: Array<{ role_id: any; menu: Array<Menu> }> = req?.body;
      if (body?.length === 0)
        return response.failed(`request body ${REQUIRED}`, 422, res);

      let insert: Array<object> = [];
      let role_id: Array<number> = [];
      body.forEach(async (item) => {
        role_id.push(item?.role_id?.value);

        item?.menu.forEach((i) => {
          insert.push({
            role_menu_id: uuidv4(),
            role_id: item?.role_id?.value,
            menu_id: i?.menu_id,
            view: i?.view,
            create: i?.create,
            edit: i?.edit,
            delete: i?.delete,
            approve: i?.approve,
            import: i?.import,
            export: i?.export,
            status: i?.status,
            created_by: req?.user?.id,
            created_date: date,
          });
        });
      });
      if (insert?.length > 0) {
        await repository.delete({
          condition: { role_id: { [Op.in]: role_id } },
        });
        await repository.bulkCreate({
          payload: insert,
        });
      }

      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(`role menu create: ${err?.message}`, 500, res);
    }
  }
}

export const roleMenu = new Controller();
