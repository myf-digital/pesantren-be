'use strict';

export default class Transformer {
  public list(data: any) {
    let result: Array<any> = [];
    data.forEach((item: any) => {
      result.push({
        role_id: item?.role_id,
        role_name: item?.role_name,
        role_menu_status: item?.status,
        menu: item?.role_menu.map((m: any) => ({
          menu_id: m?.menu?.menu_id,
          menu_name: m?.menu?.menu_name,
          menu_icon: m?.menu?.menu_icon,
          module_name: m?.menu?.module_name,
          type_menu: m?.menu?.type_menu,
          seq_number: m?.menu?.seq_number,
          parent_id: m?.menu?.parent_id,
          menu_status: m?.menu?.status,
          role_menu_status: m?.status,
          role_menu_view: m?.view,
          role_menu_create: m?.create,
          role_menu_edit: m?.edit,
          role_menu_delete: m?.delete,
          role_menu_approve: m?.approve,
          role_menu_import: m?.import,
          role_menu_export: m?.export,
        })),
      });
    });
    return result;
  }

  public detail(data: any) {
    const role = data?.dataValues;
    return {
      role_id: role?.role_id,
      role_name: role?.role_name,
      role_menu_status: role?.status,
      menu: role?.role_menu.map((m: any) => ({
        menu_id: m?.menu?.menu_id,
        status: m?.status,
        view: m?.view,
        create: m?.create,
        edit: m?.edit,
        delete: m?.delete,
        approve: m?.approve,
        import: m?.import,
        export: m?.export,
      })),
    };
  }
}

export const transformer = new Transformer();
