'use strict';

import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { variable } from './inventaris.aset.harian.variable';
import { response } from '../../../helpers/response';
import { repository } from './inventaris.aset.harian.repository';
import {
  ALREADY_EXIST,
  NOT_FOUND,
  SUCCESS_DELETED,
  SUCCESS_RETRIEVED,
  SUCCESS_SAVED,
  SUCCESS_UPDATED,
} from '../../../utils/constant';
import { appConfig } from '../../../config/config.app';

const date: string = helper.date();

export default class Controller {
  public async list(req: Request, res: Response) {
    try {
      const result = await repository.list({});
      if (result?.length < 1)
        return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(
        `inventaris aset harian list: ${err?.message}`,
        500,
        res
      );
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
      return helper.catchError(
        `inventaris aset harian index: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async detail(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const result: Object | any = await repository.detail({ id_laporan: id });
      if (!result) return response.success(NOT_FOUND, null, res, false);
      return response.success(SUCCESS_RETRIEVED, result, res);
    } catch (err: any) {
      return helper.catchError(
        `inventaris aset harian detail: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async create(req: Request, res: Response) {
    try {
      const { id_aset, id_asrama, id_kamar, id_biro_aset, id_rumah_tangga } =
        req?.body;

      let foto_dokumentasi: any = null;
      if (req?.files && req?.files.foto_dokumentasi) {
        const file = req?.files?.foto_dokumentasi;
        let checkFile = helper.checkExtention(file);
        if (checkFile != 'allowed') return response.failed(checkFile, 422, res);

        foto_dokumentasi = await helper.upload(
          file,
          'resource',
          req?.user?.username,
          appConfig?.assetType
        );
      }

      const data: Object = helper.only(variable.fillable(), req?.body);
      await repository.create({
        payload: {
          ...data,
          id_aset: JSON.parse(id_aset)?.value || null,
          id_asrama: JSON.parse(id_asrama)?.value || null,
          id_kamar: JSON.parse(id_kamar)?.value || null,
          id_biro_aset: JSON.parse(id_biro_aset)?.value || null,
          id_rumah_tangga: JSON.parse(id_rumah_tangga)?.value || null,
          foto_dokumentasi: foto_dokumentasi || null,
        },
      });
      return response.success(SUCCESS_SAVED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `inventaris aset harian create: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_laporan: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      const { id_aset, id_asrama, id_kamar, id_biro_aset, id_rumah_tangga } =
        req?.body;

      let foto_dokumentasi: any = null;
      if (req?.files && req?.files.foto_dokumentasi) {
        const file = req?.files?.foto_dokumentasi;
        let checkFile = helper.checkExtention(file);
        if (checkFile != 'allowed') return response.failed(checkFile, 422, res);

        foto_dokumentasi = await helper.upload(
          file,
          'resource',
          req?.user?.username,
          appConfig?.assetType
        );
      }

      const data: Object = helper.only(variable.fillable(), req?.body, true);
      await repository.update({
        payload: {
          ...data,
          id_aset: JSON.parse(id_aset)?.value || check?.getDataValue('id_aset'),
          id_asrama:
            JSON.parse(id_asrama)?.value || check?.getDataValue('id_asrama'),
          id_kamar:
            JSON.parse(id_kamar)?.value || check?.getDataValue('id_kamar'),
          id_biro_aset:
            JSON.parse(id_biro_aset)?.value ||
            check?.getDataValue('id_biro_aset'),
          id_rumah_tangga:
            JSON.parse(id_rumah_tangga)?.value ||
            check?.getDataValue('id_rumah_tangga'),
          foto_dokumentasi:
            foto_dokumentasi || check?.getDataValue('foto_dokumentasi'),
        },
        condition: { id_laporan: id },
      });
      return response.success(SUCCESS_UPDATED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `inventaris aset harian update: ${err?.message}`,
        500,
        res
      );
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const id: string = req?.params?.id || '';
      const check = await repository.detail({ id_laporan: id });
      if (!check) return response.success(NOT_FOUND, null, res, false);
      await repository.delete({
        condition: { id_laporan: id },
      });
      return response.success(SUCCESS_DELETED, null, res);
    } catch (err: any) {
      return helper.catchError(
        `inventaris aset harian delete: ${err?.message}`,
        500,
        res
      );
    }
  }
}

export const inventarisAsetHarian = new Controller();
