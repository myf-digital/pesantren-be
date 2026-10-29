'use strict';

import moment from 'moment';
import { Op } from 'sequelize';
import { helper } from '../../helpers/helper';
import { response } from '../../helpers/response';
import { helperauth } from '../../helpers/auth.helper';
import { setUserLogin, setUserContextData } from '../../context/userContext';
import { Request, Response, NextFunction } from 'express';
import { repository } from '../app/resource/resource.repository';
import {
  NOT_FOUND,
  REQUIRED,
  ROLE_ADMIN,
  TIMEZONE,
} from '../../utils/constant';
import { repository as repoRoleMenu } from '../app/role.menu/role.menu.repository';

moment().tz(TIMEZONE).locale('id');
type RequestBody<T> = Request<{}, {}, T>;
interface UserBody {
  username: string;
  password: string;
}

export const checkAccess = async (
  req: Request,
  role_name: string = '',
  prefix: string = ''
) => {
  try {
    const method: string = req?.method;
    const url: string = req?.originalUrl;

    if (!role_name) {
      return {
        code: 401,
        status: false,
        message: 'Unauthorized',
      };
    }

    if (role_name == ROLE_ADMIN) {
      return {
        code: 200,
        status: true,
        message: 'Have access',
      };
    }

    const role: any = await repoRoleMenu.detailRole({
      role_name: role_name,
      module_name: { [Op.like]: `%${prefix}%` },
    });

    if (!role || !role?.dataValues?.role_menu?.length) {
      return {
        code: 403,
        status: false,
        message: `Sorry! You don't have access menu ${prefix}`,
      };
    }

    const hasAccess = role.dataValues.role_menu.some((rm: any) => {
      let moduleName = rm?.menu?.module_name?.toLowerCase() || '';

      if (moduleName.includes('user')) moduleName = 'resource';

      if (!moduleName.includes(prefix)) return false;
      if (rm.view != '1') return false;

      if (
        method === 'POST' &&
        ['/import', '/insert'].some((suffix) =>
          url.split('?')[0].endsWith(suffix)
        )
      )
        return rm.import == '1';
      if (method === 'POST' && url.split('?')[0].endsWith('/export'))
        return rm.export == '1';
      if (method === 'POST') return rm.create == '1';
      if (method === 'PUT') return rm.edit == '1';
      if (method === 'DELETE') return rm.delete == '1';

      return true;
    });

    if (!hasAccess) {
      return {
        code: 403,
        status: false,
        message: `Sorry! You don't have access menu ${prefix}`,
      };
    }

    return {
      code: 200,
      status: true,
      message: 'Have access',
    };
  } catch (err: any) {
    return {
      code: 400,
      status: false,
      message: `check access: ${err?.message}`,
    };
  }
};

export default class Middleware {
  public async checkBearerToken(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const authorization: string = req?.headers['authorization'] || '';
      const token: string = await helperauth.decodeBearerToken(authorization);
      if (token === '')
        return response.failed(`Auth Bearer ${REQUIRED}`, 422, res);

      const auth = helperauth.newDecodeToken(token);
      if (typeof auth == 'string')
        return response.failed('Invalid token', 400, res);

      const admin: string = auth?.role_name == ROLE_ADMIN ? '' : ROLE_ADMIN;
      const user = await repository.detail({ token }, admin);
      if (!user)
        return response.failed(
          'Your account has been logged in another device!',
          401,
          res
        );

      let checkExp = true;
      if (user?.getDataValue('token_expired')) {
        const expired = helper.dateDiff(
          moment(user?.getDataValue('token_expired')),
          'seconds'
        );
        if (expired < 3600) return response.failed('Unauthorized', 401, res);
        if (expired > 475200) checkExp = false;
      }
      if (checkExp) {
        await repository.update({
          payload: {
            token_expired: helper.dateAdd(7, 'days'),
          },
          condition: { resource_id: user?.getDataValue('resource_id') },
        });
      }

      setUserLogin(auth?.username || 'sistem');
      const pegawai: any = user?.getDataValue('pegawai') || null;
      const orgUnit = pegawai?.getDataValue('organizationUnit') || null;

      const idCabang = auth?.id_cabang ?? (orgUnit?.id_cabang || null);
      const idOrgunit = auth?.id_orgunit ?? (orgUnit?.id_orgunit || null);
      const idLembaga = auth?.id_lembaga ?? (orgUnit?.id_lembaga || null);
      const lembagaType = auth?.lembaga_type ?? (orgUnit?.lembaga_type || null);
      const roleId = auth?.role_id || user?.getDataValue('role_id') || null;
      const idResourceRole = auth?.id_resource_role || null;

      setUserContextData({
        id_cabang: idCabang,
        id_orgunit: idOrgunit,
        id_lembaga: idLembaga,
        lembaga_type: lembagaType,
        role_id: roleId,
        id_resource_role: idResourceRole,
      });

      req.user = auth;
      next();
      return;
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError') {
        return response.failed(err?.message, 401, res);
      } else {
        return helper.catchError(
          `check token invalid: ${err?.message}`,
          401,
          res
        );
      }
    }
  }

  public async checkRefreshToken(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const auth = helperauth.newDecodeToken(req?.body?.refresh_token);
      if (typeof auth == 'string')
        return response.failed('Invalid token', 400, res);

      setUserLogin(auth?.username || 'sistem');
      req.user = auth;
      next();
      return;
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError') {
        return response.failed(err?.message, 401, res);
      } else {
        return helper.catchError(
          `check refresh token invalid: ${err?.message}`,
          401,
          res
        );
      }
    }
  }

  public async checkExpiredToken(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const authorization: string = req?.headers['authorization'] || '';
    const token: string = helperauth.decodeBearerToken(authorization);
    if (token === '')
      return response.failed(`Auth Bearer ${REQUIRED}`, 422, res);

    try {
      const user = await repository.detail({ token }, '');
      if (!user) return response.failed('Unauthorized', 401, res);

      const auth = helperauth.newDecodeToken(token);
      if (typeof auth == 'string')
        return response.failed('Invalid token', 400, res);

      setUserLogin(auth?.username || 'sistem');
      req.user = auth;
      next();
      return;
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError') {
        return response.failed(err?.message, 401, res);
      } else {
        return helper.catchError(
          `check expired token invalid: ${err?.message}`,
          401,
          res
        );
      }
    }
  }

  public async checkVerify(
    req: RequestBody<UserBody>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const username: string = req?.body?.username;
      const password: string = req?.body?.password;
      console.log('username', username, 'password', password);
      if (!username || !password)
        return response.failed(`Username or password ${REQUIRED}`, 422, res);

      const result = await repository.detail(
        {
          [Op.or]: [{ email: username }, { username: username }],
        },
        ''
      );

      console.log('result', result?.getDataValue('username'), username);
      if (!result) return response.success(NOT_FOUND, null, res, false);

      if (result?.getDataValue('status') === 'A') {
        setUserLogin(result?.username || 'sistem');
        req.user = result;
        next();
        return;
      } else {
        return response.failed('Your account need verification', 400, res);
      }
    } catch (err: any) {
      console.log('err', err);
      return helper.catchError(`check verify: ${err?.message}`, 400, res);
    }
  }

  public async checkToken(req: Request, res: Response, next: NextFunction) {
    const authorization: string = req?.headers['authorization'] || '';
    const token: string = await helperauth.decodeBearerToken(authorization);

    try {
      const auth: any = helperauth.newDecodeToken(token);

      if (typeof auth == 'string') req.user = null;
      else req.user = auth;

      setUserLogin(auth?.username || 'sistem');
      next();
      return;
    } catch (err) {
      req.user = null;
      next();
    }
  }
}

export const auth = new Middleware();
