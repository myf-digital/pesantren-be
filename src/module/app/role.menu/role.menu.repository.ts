'use strict';

import { Op } from 'sequelize';
import Model from './role.menu.model';
import Role from '../role/role.model';
import Menu from '../menu/menu.model';

export default class Repository {
  public list() {
    return Role.findAll({
      where: {
        status: { [Op.ne]: 9 },
      },
      order: [['role_id', 'DESC']],
      include: [
        {
          model: Model,
          as: 'role_menu',
          required: false,
          include: [
            {
              model: Menu,
              as: 'menu',
              required: true,
              where: {
                status: { [Op.ne]: 9 },
              },
            },
          ],
        },
      ],
    });
  }

  public index(data: any) {
    let query: Object = {
      order: [['role_id', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
      group: 'AppRole.role_id',
      include: [
        {
          model: Model,
          as: 'role_menu',
          required: false,
          include: [
            {
              model: Menu,
              as: 'menu',
              required: true,
              where: {
                status: { [Op.ne]: 9 },
              },
            },
          ],
        },
      ],
    };
    if (data?.keyword && data?.keyword != undefined) {
      query = {
        ...query,
        where: {
          status: { [Op.ne]: 9 },
          role_name: { [Op.like]: `%${data?.keyword}%` },
        },
      };
    }
    return Role.findAndCountAll(query);
  }

  public detail(condition: any) {
    return Model.findOne({
      where: {
        ...condition,
        status: { [Op.ne]: 9 },
      },
    });
  }

  public detailRole(condition: any) {
    const {
      role_name,
      menu_name,
      role_id,
      module_name,
    } = condition;

    const roleWhere = {
      status: { [Op.ne]: 9 },
      ...(role_id && { role_id }),
      ...(role_name && { role_name }),
    };

    const menuWhere = {
      status: { [Op.ne]: 9 },
      ...(menu_name && {
        menu_name: { [Op.like]: `%${menu_name}%` }
      }),
      ...(module_name && { module_name })
    };

    return Role.findOne({
      where: roleWhere,
      include: [
        {
          model: Model,
          as: 'role_menu',
          required: false,
          include: [
            {
              model: Menu,
              as: 'menu',
              required: menu_name || module_name ? true : false,
              where: menuWhere,
            },
          ],
        },
      ],
    });
  }

  public bulkCreate(data: any) {
    return Model.bulkCreate(data?.payload);
  }

  public delete(data: any) {
    return Model.destroy({
      where: data?.condition,
      individualHooks: true,
    });
  }
}

export const repository = new Repository();
