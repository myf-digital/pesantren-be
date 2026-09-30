'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './pegawai.model';
import OrganizationUnit from '../organization.unit/organization.unit.model';
import Jabatan from '../jabatan/jabatan.model';
import AreaProvince from '../../area/provinces.model';
import AreaRegency from '../../area/regencies.model';
import AreaDistrict from '../../area/districts.model';
import AreaSubDistrict from '../../area/subdistricts.model';
import AppResource from '../resource/resource.model';
import AppResourceRole from '../resource.role/resource.role.model';
import AppRole from '../role/role.model';
import JenisGuru from '../jenis.guru/jenis.guru.model';
import { v4 as uuidv4 } from 'uuid';
import { helper } from '../../../helpers/helper';
import { getUserContextData } from '../../../context/userContext';

export default class Repository {
  public list(data: any) {
    let query: any = {
      order: [['nama_lengkap', 'ASC']],
      where: {},
      include: [
        {
          model: OrganizationUnit,
          as: 'organizationUnit',
          attributes: [
            'id_orgunit',
            'nama_orgunit',
            'id_cabang',
            'id_lembaga',
            'lembaga_type',
          ],
          required: false,
        },
        {
          model: Jabatan,
          as: 'jabatan',
          attributes: ['id_jabatan', 'nama_jabatan'],
          required: false,
        },
      ],
    };

    const keyword = data?.keyword ? `%${data.keyword.toLowerCase()}%` : null;
    if (keyword) {
      query.where.nama_lengkap = Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('Pegawai.nama_lengkap')),
        { [Op.like]: keyword }
      );
    }

    if (data?.status_pegawai && data?.status_pegawai !== '') {
      query.where.status_pegawai = data.status_pegawai;
    }

    if (data?.is_guru || data?.lembaga_type) {
      const jenisGuruWhere: any = {};
      if (data?.lembaga_type) {
        jenisGuruWhere.lembaga_type = data.lembaga_type;
      }
      if (data?.id_lembaga) {
        jenisGuruWhere.id_lembaga = data.id_lembaga;
      }
      query.include.push({
        model: JenisGuru,
        as: 'jenis_guru',
        required: true,
        where: jenisGuruWhere,
        attributes: ['id_jenisguru', 'lembaga_type', 'status'],
      });
      query.distinct = true;
    }

    const userContext = getUserContextData();
    if (userContext && userContext?.id_cabang) {
      query.where['$organizationUnit.id_cabang$'] = userContext?.id_cabang;
    }

    return Model.findAll(query);
  }
  /**
   * Cek duplikasi field tertentu (NIK/NIP/Email)
   */
  public async checkDuplicate(
    field: string,
    value: string,
    excludeId?: string
  ) {
    const where: any = { [field]: value };
    if (excludeId) {
      where.id_pegawai = { [Op.ne]: excludeId };
    }
    return await Model.findOne({ where });
  }

  public async index(data: any) {
    const query: any = {
      order: [['created_at', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
      distinct: true,
      subQuery: false,
      include: [
        {
          model: OrganizationUnit,
          as: 'organizationUnit',
          attributes: ['id_orgunit', 'nama_orgunit'],
          required: false,
        },
        {
          model: Jabatan,
          as: 'jabatan',
          attributes: ['id_jabatan', 'nama_jabatan'],
          required: false,
        },
      ],
      where: {},
    };

    if (data?.id_jabatan && data?.id_jabatan !== '') {
      query.where.id_jabatan = data.id_jabatan;
    }
    if (data?.status_pegawai && data?.status_pegawai !== '') {
      if (data.status_pegawai === 'guru') {
        query.where.id_pegawai = {
          [Op.in]: Sequelize.literal(
            `(SELECT DISTINCT id_guru FROM jenis_guru WHERE id_guru IS NOT NULL)`
          ),
        };
      } else if (data.status_pegawai === 'pegawai') {
        query.where.id_pegawai = {
          [Op.notIn]: Sequelize.literal(
            `(SELECT DISTINCT id_guru FROM jenis_guru WHERE id_guru IS NOT NULL)`
          ),
        };
      } else {
        query.where.status_pegawai = data.status_pegawai;
      }
    }

    const keyword = data?.keyword ? `%${data.keyword.toLowerCase()}%` : null;
    if (keyword) {
      query.where[Op.or] = [
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('Pegawai.nama_lengkap')),
          { [Op.like]: keyword }
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.cast(Sequelize.col('Pegawai.nik'), 'TEXT')
          ),
          { [Op.like]: keyword }
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.cast(Sequelize.col('Pegawai.nip'), 'TEXT')
          ),
          { [Op.like]: keyword }
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.cast(Sequelize.col('Pegawai.email'), 'TEXT')
          ),
          { [Op.like]: keyword }
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.cast(Sequelize.col('Pegawai.status_pegawai'), 'text')
          ),
          { [Op.like]: keyword }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('organizationUnit.nama_orgunit')),
          { [Op.like]: keyword }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('jabatan.nama_jabatan')),
          { [Op.like]: keyword }
        ),
      ];
    }

    const userContext = getUserContextData();
    if (userContext && userContext?.id_cabang) {
      query.where = {
        ...query.where,
        '$organizationUnit.id_cabang$': userContext?.id_cabang,
      };
    }

    return await Model.findAndCountAll(query);
  }

  public detail(condition: any) {
    return Model.findOne({
      include: [
        { model: OrganizationUnit, as: 'organizationUnit' },
        { model: Jabatan, as: 'jabatan' },
        { model: AreaProvince, as: 'province' },
        { model: AreaRegency, as: 'city' },
        { model: AreaDistrict, as: 'district' },
        { model: AreaSubDistrict, as: 'subDistrict' },
      ],
      where: condition,
    });
  }

  public async create(data: any) {
    const trx = data.transaction;

    const pegawais = await Model.bulkCreate(data.payload, { transaction: trx });

    let idx = 0;
    for (const item of data.rawPayload || []) {
      if (item.email) {
        const username = item.email.split('@')[0];

        const existingResource = await AppResource.findOne({
          where: {
            [Op.or]: [{ username }, { email: item.email }],
          },
          transaction: trx,
        });

        if (existingResource) {
          throw new Error(
            `Username [${username}] atau Email [${item.email}] sudah terdaftar pada resource logins.`
          );
        }

        let role = await AppRole.findOne({
          where: { role_name: 'pegawai' },
          transaction: trx,
        });
        if (!role) {
          role = await AppRole.create(
            {
              role_name: 'pegawai',
              status: 1,
              restrict_level_area: 0,
              created_by: data.userId || 'system',
              created_date: new Date(),
            },
            { transaction: trx }
          );
        }

        const rawPassword = item.password || 'sada@123';
        const hashedPassword = await helper.hashIt(rawPassword);
        const confirm_hash = await helper.hashIt(username, 6);

        const resourceId = uuidv4();
        await AppResource.create(
          {
            resource_id: resourceId,
            role_id: role.role_id,
            username,
            email: item.email,
            password: hashedPassword,
            full_name: item.nama_lengkap,
            telepon: item.no_hp || null,
            status: 'A',
            confirm_hash,
            created_by: data.userId || null,
            created_date: new Date(),
            id_eksternal: pegawais[idx].id_pegawai,
          },
          { transaction: trx }
        );

        await AppResourceRole.create(
          {
            id_resource_role: uuidv4(),
            resource_id: resourceId,
            role_id: role.role_id,
            id_pegawai: pegawais[idx].id_pegawai,
            id_orgunit: item.id_orgunit || null,
            id_cabang: item.id_cabang || null,
            id_lembaga: item.id_lembaga || null,
            is_default: 1,
            status: 'ACTIVE',
            created_by: data.userId || null,
          },
          { transaction: trx }
        );
      }

      idx++;
    }

    return pegawais;
  }

  public update(data: any) {
    return Model.update(data?.payload, {
      where: data?.condition,
    });
  }

  /**
   * Soft Delete mengandalkan properti { paranoid: true } di Model.
   */
  public async delete(condition: any) {
    return Model.destroy({
      where: condition,
    });
  }

  public async listForExport(params: {
    q?: string;
    isTemplate?: boolean;
    limit?: number;
    id_jabatan?: string;
    status_pegawai?: string;
  }) {
    const { q, isTemplate, limit, id_jabatan, status_pegawai } = params;
    const keyword = q ? `%${q}%` : null;

    let whereClause: any = {};

    const userContext = getUserContextData();
    if (userContext && userContext?.id_cabang) {
      whereClause = {
        ...whereClause,
        '$organizationUnit.id_cabang$': userContext?.id_cabang,
      };
    }

    if (!isTemplate) {
      if (id_jabatan && id_jabatan !== '') {
        whereClause.id_jabatan = id_jabatan;
      }
      if (status_pegawai && status_pegawai !== '') {
        if (status_pegawai === 'guru') {
          whereClause.id_pegawai = {
            [Op.in]: Sequelize.literal(
              `(SELECT DISTINCT id_guru FROM jenis_guru WHERE id_guru IS NOT NULL)`
            ),
          };
        } else if (status_pegawai === 'pegawai') {
          whereClause.id_pegawai = {
            [Op.notIn]: Sequelize.literal(
              `(SELECT DISTINCT id_guru FROM jenis_guru WHERE id_guru IS NOT NULL)`
            ),
          };
        } else {
          whereClause.status_pegawai = status_pegawai;
        }
      }
    }

    // Jika bukan template dan ada keyword, terapkan filter pencarian
    if (!isTemplate && keyword) {
      const keywordLower = keyword.toLowerCase();
      whereClause[Op.or] = [
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('Pegawai.nama_lengkap')),
          { [Op.like]: keywordLower }
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.cast(Sequelize.col('Pegawai.nik'), 'TEXT')
          ),
          { [Op.like]: keywordLower }
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.cast(Sequelize.col('Pegawai.nip'), 'TEXT')
          ),
          { [Op.like]: keywordLower }
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.cast(Sequelize.col('Pegawai.email'), 'TEXT')
          ),
          { [Op.like]: keywordLower }
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.cast(Sequelize.col('Pegawai.status_pegawai'), 'text')
          ),
          { [Op.like]: keywordLower }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('organizationUnit.nama_orgunit')),
          { [Op.like]: keywordLower }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('jabatan.nama_jabatan')),
          { [Op.like]: keywordLower }
        ),
      ];
    }

    return Model.findAll({
      where: whereClause,
      limit: limit || (isTemplate ? 5 : undefined),
      subQuery: false,
      include: [
        {
          model: OrganizationUnit,
          as: 'organizationUnit',
          attributes: ['id_orgunit', 'nama_orgunit'],
        },
        {
          model: Jabatan,
          as: 'jabatan',
          attributes: ['id_jabatan', 'nama_jabatan'],
        },
        { model: AreaProvince, as: 'province', attributes: ['id', 'name'] },
        { model: AreaRegency, as: 'city', attributes: ['id', 'name'] },
        { model: AreaDistrict, as: 'district', attributes: ['id', 'name'] },
        {
          model: AreaSubDistrict,
          as: 'subDistrict',
          attributes: ['id', 'name'],
        },
      ],
      order: [['nama_lengkap', 'ASC']],
    });
  }

  public async resolveAreaIds(raw: any) {
    const findArea = async (
      model: any,
      id: string,
      parentField?: string,
      parentId?: string
    ) => {
      if (!id) return null;
      const condition: any = {
        id: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('id')),
          id.trim().toLowerCase()
        ),
      };

      if (parentField && parentId) {
        condition[parentField] = parentId;
      }

      const res = await model.findOne({
        where: condition,
        attributes: ['id'],
      });

      return res ? res.id : null;
    };

    const province_id = await findArea(AreaProvince, raw.provinsi);
    const city_id = await findArea(
      AreaRegency,
      raw.kota_kabupaten,
      'area_province_id',
      province_id
    );
    const district_id = await findArea(
      AreaDistrict,
      raw.kecamatan,
      'area_regencies_id',
      city_id
    );
    const sub_district_id = await findArea(
      AreaSubDistrict,
      raw.kelurahan,
      'area_district_id',
      district_id
    );

    return { province_id, city_id, district_id, sub_district_id };
  }

  public async insertImport(payloads: any[]) {
    const trx = await Model.sequelize?.transaction();
    try {
      for (const item of payloads) {
        const existing = await Model.findOne({
          where: {
            [Op.or]: [{ nik: item.nik }, { nip: item.nip }],
          },
        });

        if (existing) {
          await existing.update(item, { transaction: trx });
        } else {
          await Model.create(item, { transaction: trx });
        }

        if (item.email) {
          const username = item.email.split('@')[0];

          const existingResource = await AppResource.findOne({
            where: {
              [Op.or]: [{ username }, { email: item.email }],
            },
            transaction: trx,
          });

          if (!existingResource) {
            let role = await AppRole.findOne({
              where: { role_name: 'pegawai' },
              transaction: trx,
            });
            if (!role) {
              role = await AppRole.create(
                {
                  role_name: 'pegawai',
                  status: 1,
                  restrict_level_area: 0,
                  created_by: 'system',
                  created_date: new Date(),
                },
                { transaction: trx }
              );
            }

            const rawPassword = item.password || 'sada@123';
            const hashedPassword = await helper.hashIt(rawPassword);
            const confirm_hash = await helper.hashIt(username, 6);

            await AppResource.create(
              {
                resource_id: uuidv4(),
                role_id: role.role_id,
                username,
                email: item.email,
                password: hashedPassword,
                full_name: item.nama_lengkap,
                telepon: item.no_hp || null,
                status: 'A',
                confirm_hash,
                created_by: 'system',
                created_date: new Date(),
              },
              { transaction: trx }
            );
          }
        }
      }
      await trx?.commit();
      return true;
    } catch (error) {
      await trx?.rollback();
      throw error;
    }
  }
}

export const repository = new Repository();
