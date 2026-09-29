'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './santri.model';
import Cabang from '../cabang/cabang.model';
import OrangTuaWali from '../orang.tua.wali/orang.tua.wali.model';
import AreaDistrict from '../../area/districts.model';
import AreaProvince from '../../area/provinces.model';
import AreaRegency from '../../area/regencies.model';
import AreaSubDistrict from '../../area/subdistricts.model';
import PenempatanKamarSantri from '../penempatan.kamar.santri/penempatan.kamar.santri.model';
import { getUserContextData } from '../../../context/userContext';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';
import LembagaPendidikanKepesantrenan from '../lembaga.pendidikan.kepesantrenan/lembaga.pendidikan.kepesantrenan.model';

export default class Repository {
  public list(data: any) {
    let query: any = {
      where: {
        status: { [Op.ne]: 9 },
      },
      order: [['fullname', 'ASC']],
    };
    if (data?.status != '') {
      query = {
        ...query,
        where: {
          status: {
            [Op.eq]: data?.status,
          },
        },
      };
    }

    const userContext = getUserContextData();
    if (data?.id_cabang && data?.id_cabang != '') {
      query.where = {
        ...query.where,
        id_cabang: data.id_cabang,
      };
    } else if (userContext && userContext?.id_cabang) {
      query.where = {
        ...query.where,
        id_cabang: userContext.id_cabang,
      };
    }

    return Model.findAll(query);
  }

  public index(data: any) {
    let query: any = {
      where: {
        status: { [Op.ne]: 9 },
      },
      order: [['updated_at', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
      distinct: true,
      subQuery: false,
    };
    if (data?.keyword && data?.keyword != undefined) {
      const keyword = `%${data.keyword.toLowerCase()}%`;
      query = {
        ...query,
        where: {
          status: { [Op.ne]: 9 },
          [Op.or]: [
            { fullname: { [Op.iLike]: keyword } },
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('AppSantri.fullname')),
              {
                [Op.like]: keyword,
              }
            ),
            Sequelize.where(
              Sequelize.fn(
                'LOWER',
                Sequelize.cast(Sequelize.col('AppSantri.nis'), 'TEXT')
              ),
              {
                [Op.like]: keyword,
              }
            ),
            Sequelize.where(
              Sequelize.fn(
                'LOWER',
                Sequelize.cast(Sequelize.col('AppSantri.nik'), 'TEXT')
              ),
              {
                [Op.like]: keyword,
              }
            ),
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('wali.nama_wali')),
              {
                [Op.like]: keyword,
              }
            ),
            Sequelize.where(
              Sequelize.fn(
                'LOWER',
                Sequelize.cast(Sequelize.col('wali.no_hp'), 'TEXT')
              ),
              {
                [Op.like]: keyword,
              }
            ),
          ],
        },
      };
    }
    if (data?.parent) {
      query.where = {
        ...query.where,
        id_wali: data?.parent,
      };
    }
    if (data?.status && data?.status != '') {
      query.where = {
        ...query.where,
        status: data?.status,
      };
    }
    const userContext = getUserContextData();
    if (data?.id_cabang && data?.id_cabang != '') {
      query.where = {
        ...query.where,
        id_cabang: data?.id_cabang,
      };
    } else if (userContext && userContext?.id_cabang) {
      query.where = {
        ...query.where,
        id_cabang: userContext.id_cabang,
      };
    }
    if (data?.id_lembaga_formal && data?.id_lembaga_formal != '') {
      query.where = {
        ...query.where,
        id_lembaga_formal: data.id_lembaga_formal,
      };
    }
    if (data?.id_lembaga_mda && data?.id_lembaga_mda != '') {
      query.where = {
        ...query.where,
        id_lembaga_mda: data.id_lembaga_mda,
      };
    }

    if (
      !data?.id_lembaga_mda &&
      !data?.id_lembaga_formal &&
      userContext &&
      userContext?.id_lembaga
    ) {
      query.where = {
        ...query.where,
        [Op.or]: [
          { id_lembaga_formal: userContext.id_lembaga },
          { id_lembaga_mda: userContext.id_lembaga },
        ],
      };
    }

    // Add attributes to include skor_akhir in the result
    query.attributes = {
      include: [
        [
          Sequelize.literal(`(
            SELECT COALESCE(SUM(skor_diberikan), 0)
            FROM kasus_pelanggaran_santri
            WHERE kasus_pelanggaran_santri.id_santri = "AppSantri"."id_santri"
            AND kasus_pelanggaran_santri.deleted_at IS NULL
            AND kasus_pelanggaran_santri.status_progress != 'Batal'
          )`),
          'skor_akhir',
        ],
      ],
    };

    return Model.findAndCountAll({
      ...query,
      include: [
        {
          model: Cabang,
          as: 'cabang',
          required: false,
          attributes: [
            'id_cabang',
            'institution_id_sitrendi',
            'nama_cabang',
            'email',
          ],
        },
        {
          model: LembagaPendidikanFormal,
          as: 'lembagaFormal',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
        },
        {
          model: LembagaPendidikanKepesantrenan,
          as: 'lembagaMda',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
        },
        {
          model: OrangTuaWali,
          as: 'wali',
          required: false,
          attributes: ['id_wali', 'nama_wali', 'id_wali_sitrendi', 'no_hp'],
        },
        {
          model: PenempatanKamarSantri,
          as: 'penempatanKamar',
          required: false,
          // attributes: ['id_penempatan_kamar', 'status'],
        },
      ],
    });
  }

  public detail(condition: any) {
    return Model.findOne({
      where: {
        ...condition,
        status: { [Op.ne]: 9 },
      },
      include: [
        {
          model: Cabang,
          as: 'cabang',
          required: false,
          include: [
            {
              model: AreaProvince,
              as: 'province',
              attributes: ['id', 'name'],
              required: false,
            },
            {
              model: AreaRegency,
              as: 'city',
              attributes: ['id', 'name'],
              required: false,
            },
            {
              model: AreaDistrict,
              as: 'district',
              attributes: ['id', 'name'],
              required: false,
            },
            {
              model: AreaSubDistrict,
              as: 'subDistrict',
              attributes: ['id', 'name'],
              required: false,
            },
          ],
        },
        {
          model: OrangTuaWali,
          as: 'wali',
          required: false,
          include: [
            {
              model: AreaProvince,
              as: 'province',
              required: false,
              attributes: ['name'],
            },
            {
              model: AreaRegency,
              as: 'city',
              required: false,
              attributes: ['name'],
            },
            {
              model: AreaDistrict,
              as: 'district',
              required: false,
              attributes: ['name'],
            },
            {
              model: AreaSubDistrict,
              as: 'sub_district',
              required: false,
              attributes: ['name'],
            },
          ],
        },
        {
          model: LembagaPendidikanFormal,
          as: 'lembagaFormal',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
        },
        {
          model: LembagaPendidikanKepesantrenan,
          as: 'lembagaMda',
          required: false,
          attributes: ['id_lembaga', 'nama_lembaga'],
        },
      ],
    });
  }

  public create(data: any) {
    return Model.create(data?.payload);
  }

  public update(data: any) {
    return Model.update(data?.payload, {
      where: data?.condition,
      individualHooks: true,
    });
  }

  public async upsert(data: any) {
    const [result] = await Model.findOrCreate({
      where: {
        id_santri_sitrendi: data.id_santri_sitrendi,
      },
      defaults: data,
    });
    return result;
  }

  public async bulkUpsert(data: any) {
    await Model.bulkCreate(data, {
      conflictAttributes: ['id_santri_sitrendi', 'institution_id_sitrendi'],
      updateOnDuplicate: [
        'id_wali',
        'id_wali_sitrendi',

        'fullname',
        'nis',
        'nik',
        'gender',
        'birth_place',
        'birth_date',
        'phone',

        'id_cabang',
        'nama_cabang',

        'id_institution',
        'institution_name',

        'group_code_1',
        'group_code_2',
        'group_code_3',

        'nomor_nasabah',
        'kartu_santri_nomor',
        'kartu_santri',

        'status',
        'id_lembaga_formal',
        'updated_at',
      ],
    });
  }
}

export const repository = new Repository();
