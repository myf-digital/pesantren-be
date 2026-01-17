'use strict';

import moment from 'moment';
import fs from 'fs/promises';
import ExcelJS from 'exceljs';
import { Op } from 'sequelize';
import AppMenu from './menu.model';
import { variable } from './menu.variable';
import { Request, Response } from 'express';
import { repository } from './menu.repository';
import { helper } from '../../../helpers/helper';
import { response } from '../../../helpers/response';
import { sequelize } from '../../../database/connection';
import {
  ALREADY_EXIST,
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
} from '../../../utils/constant';

const PARENT = '00000000-0000-0000-0000-000000000000'

const generateDataExcel = (sheet: any, details: any) => {
  sheet.addRow([
    'No',
    'Nama Menu',
    'Nama Induk',
    'Icon',
    'Url',
    'Nomor Urut',
    'Status',
  ]);

  sheet.getRow(1).eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (let i in details) {
    let spacing: string = details[i].__level ? '    ' : '';

    sheet.addRow([
      parseInt(i) + 1,
      spacing + (details[i]?.menu_name || ''),
      details[i]?.parent?.menu_name || '',
      details[i]?.menu_icon || '',
      details[i]?.module_name || '',
      details[i]?.seq_number || 1,
      details[i]?.status == 1 ? 'Aktif' : 'Nonaktif',
    ]);
  }

  for (let row = 1; row <= details?.length + 1; row++) {
    sheet.getRow(row).eachCell((cell: any) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });
  }

  return sheet;
};

const normalizeRow = (row: any) => ({
  menu_name: String(row['Nama Menu'] || '').trim(),
  menu_parent: String(row['Nama Induk'] || '').trim(),
  status: row['Status'] === 'Aktif' ? 1 : 0,
  seq_number:
    row['Nomor Urut'] !== undefined ? Number(row['Nomor Urut']) : 1,
  menu_icon: String(row['Icon'] || '').trim(),
  module_name: String(row['Url'] || '').trim(),
  __row: row.__row,
});

const validateRow = (row: any) => {
  const errors: string[] = [];
  if (!row.menu_name) {
    errors.push('Nama Menu wajib diisi');
  }
  if (!row.module_name) {
    errors.push('Url Menu wajib diisi');
  }
  if (row.seq_number !== null && Number.isNaN(row.nomor_urut)) {
    errors.push('Nomor Urut harus angka');
  }
  return errors;
};

interface Menu {
  menu_id: string;
  parent_id: string;
  seq_number: number;
  [key: string]: any;
}

interface MenuTree extends Menu {
  children: MenuTree[];
}

const buildMenuTree = (data: Menu[]): MenuTree[] => {
  const map = new Map<string, MenuTree>();

  data.forEach(item => {
    map.set(item.menu_id, { ...item, children: [] });
  });

  const tree: MenuTree[] = [];

  map.forEach(item => {
    if (item.parent_id === PARENT) {
      tree.push(item);
    } else {
      const parent = map.get(item.parent_id);
      if (parent) parent.children.push(item);
    }
  });

  const sortRecursive = (nodes: MenuTree[]) => {
    nodes.sort((a, b) => a.seq_number - b.seq_number);
    nodes.forEach(n => {
      if (n.children.length > 0) {
        sortRecursive(n.children);
      }
    });
  };

  sortRecursive(tree);

  return tree;
};

const flattenMenuTree = (datas: any[], level = 0): any[] => {
  let result: any[] = []

  datas.forEach(data => {
    result.push({
      ...data,
      __level: level
    })

    if (data.children?.length) {
      result = result.concat(
        flattenMenuTree(data.children, level + 1)
      )
    }
  })

  return result
};

export default class Controller {
  public async list(req: Request, res: Response) {
    try {
      const parent: any = req?.query?.parent || '';
      let condition: any = {};
      if (parent && parent == '1') {
        condition = {
          parent_id: PARENT,
        };
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
        parent_id = PARENT;

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
        parent_id = PARENT;

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

  public async export(req: Request, res: Response) {
    try {
      let condition: any = {};
      const { q, parent, template } = req?.body;
      const isTemplate: boolean = template && template == '1';
      if (q) {
        condition = {
          ...condition,
          menu_name: { [Op.like]: `%${q}%` },
        };
      }
      if (parent && parent == '1') {
        condition = {
          ...condition,
          parent_id: PARENT,
        };
      }

      let result: any = [];
      if (!isTemplate) {
        result = await repository.list(condition, true);
        if (result?.length < 1)
          return response.success(NOT_FOUND, null, res, false);
      }

      const rawMenus = result.map((d: any) => d.get({ plain: true }));
      const tree = buildMenuTree(rawMenus)
      const flatValues = flattenMenuTree(tree)

      const { dir, path } = await helper.checkDirExport('excel');

      const name: string = 'menu';
      const filename: string = `${name}-${isTemplate ? 'template' : moment().format('DDMMYYYY')}.xlsx`;
      const title: string = `${name.replace(/-/g, ' ').toUpperCase()}`;
      const urlExcel: string = `${dir}/${filename}`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title);

      generateDataExcel(sheet, flatValues);
      await workbook.xlsx.writeFile(`${path}/${filename}`);
      return response.success('export excel menu', urlExcel, res);
    } catch (err: any) {
      return helper.catchError(
        `export excel menu: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async import(req: Request, res: Response) {
    const mode: 'preview' | 'commit' = req.body?.mode ?? 'preview';
    const uploaded = req.files?.file_import;

    if (!uploaded) {
      return response.success('File tidak valid', null, res, false);
    }

    const trx = mode === 'commit' ? await sequelize.transaction() : null;

    try {
      let buffer: Buffer;
      const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      if (file.tempFilePath) {
        buffer = await fs.readFile(file.tempFilePath);
      } else if (file.data) {
        buffer = file.data;
      } else {
        return response.success(
          'File kosong atau gagal dibaca',
          null,
          res,
          false
        );
      }

      const results: any[] = [];
      const rows = await helper.parseImportFile({
        name: file.name,
        data: buffer,
      });

      for (const raw of rows) {
        const row = normalizeRow(raw);
        const errors = validateRow(row);

        let parent_id: string | null = PARENT;
        let parent_nama: string | null = null;
        if (row.menu_parent) {
          const parent = await repository.detail({
            menu_name: row.menu_parent,
          });

          if (!parent) {
            errors.push(`Induk "${row.menu_parent}" tidak ditemukan`);
          } else {
            parent_id = parent.menu_id;
            parent_nama = parent.getDataValue('menu_name');
          }
        }
        const valid = errors.length === 0;

        const payload = {
          menu_name: row.menu_name,
          seq_number: row.seq_number,
          menu_icon: row.menu_icon ?? null,
          module_name: row.module_name ?? null,
          status: row.status ?? 1,
          parent_id,
        };

        results.push({
          row: row.__row,
          valid,
          error: errors.length ? errors.join(', ') : null,
          payload: {
            ...payload,
            parent_nama,
          },
        });
        if (mode === 'preview' || !valid) continue;

        const existing = await repository.detail({
          menu_name: row.menu_name,
        });

        if (existing) {
          await existing.update({
            ...payload,
            parent_id: payload?.parent_id || PARENT,
            modified_by: req?.user?.id,
            modified_date: helper.date(),
          }, { transaction: trx! });
        } else {
          await AppMenu.create({
            ...payload,
            parent_id: payload?.parent_id || PARENT,
            created_by: req?.user?.id,
            created_date: helper.date(),
          }, { transaction: trx! });
        }
      }

      let dataRes = {
        mode,
        total: results.length,
        valid: results.filter((r) => r.valid).length,
        invalid: results.filter((r) => !r.valid).length,
      };

      if (trx) {
        await trx.commit();
        return response.success(
          'import menu berhasil',
          dataRes,
          res
        );
      }

      return response.success(
        'preview import menu',
        {
          ...dataRes,
          data: results,
        },
        res
      );
    } catch (err: any) {
      if (trx) await trx.rollback();

      console.error(err);
      return helper.catchError(
        `import excel menu: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async insert(req: Request, res: Response) {
    const payloads = req.body?.data as any[];

    if (!Array.isArray(payloads) || payloads.length === 0) {
      return response.success('Data import kosong', null, res, false);
    }

    const trx = await sequelize.transaction();
    try {
      for (const payload of payloads) {
        const existing = await repository.detail({
          menu_name: payload.menu_name,
        });

        if (existing) {
          await existing.update({
            ...payload,
            parent_id: payload?.parent_id || PARENT,
            modified_by: req?.user?.id,
            modified_date: helper.date(),
          }, { transaction: trx });
        } else {
          await AppMenu.create({
            ...payload,
            parent_id: payload?.parent_id || PARENT,
            created_by: req?.user?.id,
            created_date: helper.date(),
          }, { transaction: trx });
        }
      }
      await trx.commit();

      return response.success(
        'Import batch menu berhasil',
        { total: payloads.length },
        res
      );
    } catch (err: any) {
      await trx.rollback();
      return helper.catchError(`Import batch gagal: ${err.message}`, 500, res);
    }
  }
}

export const menu = new Controller();
