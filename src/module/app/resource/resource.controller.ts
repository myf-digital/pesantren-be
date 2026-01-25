'use strict';

import { Op } from 'sequelize';
import { Request, Response } from 'express';
import { variable } from './resource.variable';
import { helper } from '../../../helpers/helper';
import { repository } from './resource.repository';
import { response } from '../../../helpers/response';
import { transformer } from './resource.transformer';
import { appConfig } from '../../../config/config.app';
import {
  ALREADY_EXIST,
  NOT_FOUND,
  REQUIRED,
  ROLE_ADMIN,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
} from '../../../utils/constant';

const date: string = helper.date();

export default class Controller {
  public async index(req: Request, res: Response) {
    try {
      const { role_name } = req?.user;
      const role: any = req?.query?.role;
      const query = helper.fetchQueryRequest(req);

      let conditionRole: Object = { role_name: { [Op.ne]: '' } };
      if (role_name != ROLE_ADMIN) {
        conditionRole = { role_name: { [Op.ne]: ROLE_ADMIN } };

        if (role && role != undefined && !ROLE_ADMIN.includes(role)) {
          conditionRole = { role_name: { [Op.like]: `%${role}%` } };
        }
      } else if (role && role != undefined) {
        conditionRole = { role_name: { [Op.like]: `%${role}%` } };
      }

      const { count, rows } = await repository.index(query, {}, conditionRole);
      if (rows?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      const users = await transformer.list(rows, false);
      return response.success(
        SUCCESS_RETRIEVED,
        { total: count, values: users },
        res
      );
    } catch (err: any) {
      return helper.catchError(`resource index: ${err?.message}`, 500, res);
    }
  }

  public async check(req: Request, res: Response) {
    try {
      const username: string = req?.params?.username || '';
      const result: Object | any = await repository.detail({
        username: username,
      });
      if (result)
        return response.success('Data already used', null, res, false);
      return response.success('Data can used', null, res);
    } catch (err: any) {
      return helper.catchError(`resource check: ${err?.message}`, 500, res);
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const { role_name } = req?.user;
      const id: string = req?.params?.id || '';
      const admin: string = role_name == ROLE_ADMIN ? '' : ROLE_ADMIN;
      const result: Object | any = await repository.detail(
        { resource_id: id },
        admin
      );
      if (!result) return response.success(NOT_FOUND, null, res, false);
      const getUser: Object = await transformer.detail(result, false);
      return response.success(SUCCESS_RETRIEVED, getUser, res);
    } catch (err: any) {
      return helper.catchError(`resource detail: ${err?.message}`, 500, res);
    }
  }

  public async create(req: Request, res: Response) {
    let confirm_hash: string = '';
    let message: string = '';
    let username: string = req?.body?.username || '';

    try {
      const checkEmail = await repository.check({
        email: { [Op.like]: `%${req?.body?.email}%` },
      });
      if (checkEmail) return response.failed(ALREADY_EXIST, 400, res);
      if (!req?.body?.password)
        return response.failed(`Password ${REQUIRED}`, 422, res);

      if (!username || username == undefined) {
        username = req?.body?.email.split('@')[0];
        const checkUsername = await repository.check({
          username: username,
        });
        if (checkUsername) username = username + helper.random(100, 999);
      }

      let role_id: any = null;
      let image_foto: any = null;
      let regency_id: any = null;
      let province_id: any = null;
      if (req?.body?.role_id) role_id = JSON.parse(req?.body?.role_id);
      if (req?.body?.regency_id) regency_id = JSON.parse(req?.body?.regency_id);
      if (req?.body?.province_id)
        province_id = JSON.parse(req?.body?.province_id);
      if (req?.files && req?.files.image_foto) {
        const file = req?.files?.image_foto;
        let checkFile = helper.checkExtention(file);
        if (checkFile != 'allowed') return response.failed(checkFile, 422, res);

        image_foto = await helper.upload(
          file,
          'resource',
          req?.user?.username,
          appConfig?.assetType
        );
      }

      confirm_hash = await helper.hashIt(username, 6);
      const password: string = await helper.hashIt(req?.body?.password);
      const only: Object = helper.only(variable.fillable(), req?.body);

      await repository.create({
        payload: {
          ...only,
          username: username,
          password: password,
          confirm_hash: confirm_hash,
          image_foto: image_foto,
          role_id: role_id?.value || null,
          status: 'NV',
          area_province_id: province_id?.value || null,
          area_regencies_id: regency_id?.value || null,
          created_by: req?.user?.id || null,
        },
      });

      message = SUCCESS_SAVED;
    } catch (err: any) {
      return helper.catchError(`resource create: ${err?.message}`, 500, res);
    }

    try {
      await helper.sendEmail({
        to: req?.body?.email,
        subject: `Welcome to ${appConfig?.app}`,
        content: `
          <h3>Hi ${req?.body?.full_name},</h3>
          <p>Congratulation to join as a member, below this link to activation your account:</p>
          <a href="${appConfig?.baseUrlFe}/auth/account-verification?confirm_hash=${confirm_hash}" target="_blank">Activation</a>
          <p>This is your username account: <b>${username}</b></p>
        `,
      });
      await helper.sendNotif(
        `Welcome to ${appConfig?.app}. Hi ${req?.body?.full_name}, Congratulation to join as a member, below this link to activation your account: ${appConfig?.baseUrlFe}/auth/account-verification?confirm_hash=${confirm_hash}. This is your username account: ${username}`
      );
    } catch (err: any) {
      message = `<br /> error send email: ${err?.message}`;
    }

    return response.success(message, null, res);
  }

  public async update(req: Request, res: Response) {
    try {
      const { role_name } = req?.user;
      const id: string = req?.params?.id || '';
      const admin: string = role_name == ROLE_ADMIN ? '' : ROLE_ADMIN;
      const check = await repository.check({ resource_id: id }, admin);
      if (!check) return response.success(NOT_FOUND, null, res, false);

      let role_id: any = null;
      let province_id: any = null;
      let regency_id: any = null;
      let image_foto: any = null;
      if (req?.body?.role_id) role_id = JSON.parse(req?.body?.role_id);
      if (req?.body?.province_id)
        province_id = JSON.parse(req?.body?.province_id);
      if (req?.body?.regency_id) regency_id = JSON.parse(req?.body?.regency_id);
      if (req?.files && req?.files.image_foto) {
        const file = req?.files?.image_foto;
        let checkFile = helper.checkExtention(file);
        if (checkFile != 'allowed') return response.failed(checkFile, 422, res);

        image_foto = await helper.upload(
          file,
          'resource',
          req?.user?.username,
          appConfig?.assetType
        );
      }

      let password: any = null;
      if (req?.body?.password) {
        const isMatch: boolean = await helper.compareIt(
          req?.body?.password,
          check?.getDataValue('password')
        );
        if (!isMatch) {
          password = await helper.hashIt(req?.body?.password);
        } else {
          return response.failed('Password does not same old', 500, res);
        }
      }

      const data: any = helper.only(variable.fillable(), req?.body, true);
      delete data?.username;
      await repository.update({
        payload: {
          ...data,
          password: password || check?.getDataValue('password'),
          role_id: role_id?.value || check?.getDataValue('role_id'),
          area_province_id:
            province_id?.value || check?.getDataValue('area_province_id'),
          area_regencies_id:
            regency_id?.value || check?.getDataValue('area_regencies_id'),
          image_foto: image_foto || check?.getDataValue('image_foto'),
          modified_by: req?.user?.id,
        },
        condition: { resource_id: id },
      });

      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(`resource update: ${err?.message}`, 500, res);
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const { role_name } = req?.user;
      const id: string = req?.params?.id || '';
      const admin: string = role_name == ROLE_ADMIN ? '' : ROLE_ADMIN;
      const check = await repository.detail({ resource_id: id }, admin);
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.update({
        payload: {
          status: 'D',
          modified_by: req?.user?.id,
          modified_date: date,
        },
        condition: { resource_id: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(`resource delete: ${err?.message}`, 500, res);
    }
  }
}

export const resource = new Controller();
