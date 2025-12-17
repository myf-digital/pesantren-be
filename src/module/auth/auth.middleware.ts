'use strict';

import moment from 'moment';
import { Op } from 'sequelize';
import { helper } from '../../helpers/helper';
import { response } from '../../helpers/response';
import { helperauth } from '../../helpers/auth.helper';
import { setUserLogin } from '../../context/userContext';
import { Request, Response, NextFunction } from 'express';
import { repository } from '../app/resource/resource.repository';
import { INVALID, NOT_FOUND, REQUIRED, ROLE_ADMIN } from '../../utils/constant';
import { repository as repoRoleMenu } from '../app/role.menu/role.menu.repository';

moment().locale('id');
type RequestBody<T> = Request<{}, {}, T>;
interface UserBody {
  username: string;
  password: string;
}

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

      const id: string = req?.params?.id;
      if (id && id != undefined) {
        if (!helper.isValidUUID(id))
          return response.failed(`id: ${id} ${INVALID}`, 400, res);
      }

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
      if (!username || !password)
        return response.failed(`Username or password ${REQUIRED}`, 422, res);

      const result = await repository.detail(
        {
          [Op.or]: [{ email: username }, { username: username }],
        },
        ''
      );
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

  public checkAccess(prefix: string = '') {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { role_name } = req?.user;
        if (role_name == ROLE_ADMIN) {
          next();
          return;
        }

        const role_menu: any = await repoRoleMenu.detailRole({
          role_name: { [Op.like]: `%${role_name}%` },
          menu_name: prefix.replace('-','_')
        });

        if (role_menu) {
          const ability = role_menu?.dataValues?.role_menu.find((rm: any) => {
            let moduleName: string = rm?.menu?.module_name.toLowerCase();
            if (moduleName.includes('user')) moduleName = 'resource';
            return req?.originalUrl.split('?')[0].includes(moduleName);
          });

          if (!ability)
            return response.failed(`Sorry! You don't have access.`, 400, res);
        } else {
          return response.failed(`Sorry! You don't have access menu ${prefix}`, 400, res);
        }

        next();
        return;
      } catch (err: any) {
        return helper.catchError(`check access: ${err?.message}`, 400, res);
      }
    };
  }
}

export const auth = new Middleware();
