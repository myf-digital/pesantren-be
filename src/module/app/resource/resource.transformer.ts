'use strict';

import { repository as repoRoleMenu } from '../role.menu/role.menu.repository';

export default class Transformer {
  public async list(data: any, withAbility: boolean = true) {
    let result: Array<object> = [];
    for (let i in data) {
      let resource: any = data[i]?.dataValues;

      if (withAbility) {
        const role_menu: any = await repoRoleMenu.detailRole({
          role_id: data[i]?.dataValues?.role_id,
        });
        let ability: Array<object> = [];
        if (role_menu?.dataValues?.role_menu?.length > 0) {
          ability = role_menu?.dataValues?.role_menu.map((rm: any) => ({
            menu_id: rm?.menu?.menu_id,
            menu_name: rm?.menu?.menu_name,
            menu_icon: rm?.menu?.menu_icon,
            module_name: rm?.menu?.module_name,
            type_menu: rm?.menu?.type_menu,
            seq_number: rm?.menu?.seq_number,
            parent_id: rm?.menu?.parent_id,
            menu_status: rm?.menu?.status,
            role_menu_status: rm?.status,
            role_menu_view: rm?.view,
            role_menu_create: rm?.create,
            role_menu_edit: rm?.edit,
            role_menu_delete: rm?.delete,
            role_menu_approve: rm?.approve,
            role_menu_import: rm?.import,
            role_menu_export: rm?.export,
          }));
        }

        resource = {
          ...data[i]?.dataValues,
          ability: ability,
        };
      }

      delete resource?.token;
      delete resource?.password;
      delete resource?.confirm_hash;
      delete resource?.role_menu;
      result.push(resource);
    }
    return result;
  }

  public async detail(data: any, withAbility: boolean = true) {
    const resource = data?.dataValues;
    let result: any = resource;

    if (withAbility) {
      const role_menu: any = await repoRoleMenu.detailRole({
        role_id: resource?.role_id,
      });
      let ability: Array<object> = [];
      if (role_menu?.dataValues?.role_menu?.length > 0) {
        ability = role_menu?.dataValues?.role_menu.map((rm: any) => ({
          menu_id: rm?.menu?.menu_id,
          menu_name: rm?.menu?.menu_name,
          menu_icon: rm?.menu?.menu_icon,
          module_name: rm?.menu?.module_name,
          type_menu: rm?.menu?.type_menu,
          seq_number: rm?.menu?.seq_number,
          parent_id: rm?.menu?.parent_id,
          menu_status: rm?.menu?.status,
          role_menu_status: rm?.status,
          role_menu_view: rm?.view,
          role_menu_create: rm?.create,
          role_menu_edit: rm?.edit,
          role_menu_delete: rm?.delete,
          role_menu_approve: rm?.approve,
          role_menu_import: rm?.import,
          role_menu_export: rm?.export,
        }));
      }

      result = {
        ...resource,
        ability: ability,
      };
    }

    delete result?.token;
    delete result?.password;
    delete result?.confirm_hash;
    delete result?.role_menu;
    return result;
  }
}

export const transformer = new Transformer();
