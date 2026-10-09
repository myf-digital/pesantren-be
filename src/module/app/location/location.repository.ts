'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './location.model';
import { helper } from '../../../helpers/helper';
import Cabang from '../cabang/cabang.model';
import { getUserContextData } from '../../../context/userContext';

export default class Repository {
  public list(data: any, limit?: number) {
    let query: any = {
      order: data?.orderWithParent
        ? [
            [Sequelize.col('parent.nama_lokasi'), 'ASC'],
            ['nama_lokasi', 'ASC'],
          ]
        : [['nama_lokasi', 'ASC']],
      include: [
        {
          model: Model,
          as: 'parent',
          attributes: ['id_lokasi', 'nama_lokasi', 'kode_lokasi'],
          required: false,
        },
      ],
    };

    if (limit) {
      query.limit = limit;
    }

    let whereClause: any = {};

    const keyword = data?.keyword ? `%${data.keyword.toLowerCase()}%` : null;
    if (keyword) {
      whereClause.nama_lokasi = Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('Lokasi.nama_lokasi')),
        { [Op.like]: keyword }
      );
    }

    if (data?.jenis_lokasi) {
      if (Array.isArray(data.jenis_lokasi)) {
        whereClause.jenis_lokasi = { [Op.in]: data.jenis_lokasi };
      } else {
        whereClause.jenis_lokasi = data.jenis_lokasi;
      }
    }

    const userContext = getUserContextData();
    if (userContext && userContext?.id_cabang && !data?.all_cabang) {
      whereClause.id_cabang = userContext?.id_cabang;
    }

    if (Object.keys(whereClause).length > 0) {
      query.where = whereClause;
    }

    return Model.findAll(query);
  }

  /**
   * Khusus untuk Export: Mengambil semua data dengan relasi induk dan cabang
   */
  public async listForExport(params: {
    q?: string;
    isTemplate?: boolean;
    limit?: number;
  }) {
    const { q, isTemplate, limit } = params;
    const keyword = q ? `%${q}%` : null;

    let whereClause: any = {};

    const userContext = getUserContextData();
    if (userContext && userContext?.id_cabang) {
      whereClause = {
        ...whereClause,
        id_cabang: userContext?.id_cabang,
      };
    }

    if (!isTemplate && keyword) {
      const keywordLower = keyword.toLowerCase();
      whereClause = {
        ...whereClause,
        [Op.or]: [
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('Lokasi.nama_lokasi')),
            { [Op.like]: keywordLower }
          ),
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.cast(Sequelize.col('Lokasi.kode_lokasi'), 'text')
            ),
            { [Op.like]: keywordLower }
          ),
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.cast(Sequelize.col('Lokasi.keterangan'), 'text')
            ),
            { [Op.like]: keywordLower }
          ),
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.cast(Sequelize.col('Lokasi.jenis_lokasi'), 'text')
            ),
            { [Op.like]: keywordLower }
          ),
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.cast(Sequelize.col('Lokasi.kapasitas'), 'text')
            ),
            { [Op.like]: keywordLower }
          ),
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('parent.nama_lokasi')),
            { [Op.like]: keywordLower }
          ),
        ],
      };
    }

    return Model.findAll({
      where: whereClause,
      limit: limit || (isTemplate ? 5 : undefined),
      subQuery: false,
      include: [
        {
          model: Model,
          as: 'parent',
          attributes: ['id_lokasi', 'nama_lokasi', 'kode_lokasi'],
          required: false,
        },
        {
          model: Model,
          as: 'sub_lokasi',
          attributes: ['id_lokasi', 'nama_lokasi', 'kode_lokasi'],
          required: false,
        },
        {
          model: Cabang,
          as: 'cabang',
          attributes: ['id_cabang', 'nama_cabang'],
          required: false,
        },
      ],
      order: [['id_lokasi', 'ASC']],
    });
  }

  public async index(data: any) {
    let query: any = {
      order: [['id_lokasi', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
      distinct: true,
      subQuery: false,
      include: [
        {
          model: Model,
          as: 'parent',
          attributes: ['id_lokasi', 'nama_lokasi'],
          required: false,
        },
      ],
    };

    const keyword = data?.keyword ? `%${data.keyword.toLowerCase()}%` : null;
    if (keyword) {
      query.where = {
        [Op.or]: [
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('Lokasi.nama_lokasi')),
            { [Op.like]: keyword }
          ),
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.cast(Sequelize.col('Lokasi.jenis_lokasi'), 'text')
            ),
            { [Op.like]: keyword }
          ),
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.cast(Sequelize.col('Lokasi.kode_lokasi'), 'text')
            ),
            { [Op.like]: keyword }
          ),
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.cast(Sequelize.col('Lokasi.kapasitas'), 'text')
            ),
            { [Op.like]: keyword }
          ),
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.cast(Sequelize.col('Lokasi.keterangan'), 'text')
            ),
            { [Op.like]: keyword }
          ),
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('parent.nama_lokasi')),
            { [Op.like]: keyword }
          ),
        ],
      };
    }

    if (data?.jenis_lokasi) {
      query.where = {
        ...query.where,
        jenis_lokasi: Array.isArray(data.jenis_lokasi)
          ? { [Op.in]: data.jenis_lokasi }
          : data.jenis_lokasi,
      };
    }

    const userContext = getUserContextData();
    if (userContext && userContext?.id_cabang) {
      query.where = {
        ...query.where,
        id_cabang: userContext?.id_cabang,
      };
    }

    return Model.findAndCountAll(query);
  }

  public checkDuplicate(payload: any) {
    return Model.findOne({
      where: {
        nama_lokasi: payload.nama_lokasi,
        jenis_lokasi: payload.jenis_lokasi,
        id_cabang: payload.id_cabang || null,
        // Jika kode_lokasi berbeda berarti ini adalah data lain yang duplikat
        kode_lokasi: { [Op.ne]: payload.kode_lokasi },
      },
    });
  }

  public detail(condition: any) {
    return Model.findOne({
      include: [
        {
          model: Model,
          as: 'parent',
          attributes: ['id_lokasi', 'nama_lokasi', 'kode_lokasi', 'parent_id'],
          required: false,
        },
        {
          model: Model,
          as: 'sub_lokasi',
          required: false,
        },
      ],
      where: {
        ...condition,
      },
    });
  }

  /**
   * Mencari lokasi berdasarkan nama secara case-insensitive
   * Digunakan pada proses Import untuk mencari Parent ID / Cabang ID
   */
  public findParentByName(name: string) {
    return Model.findOne({
      where: Model.sequelize?.where(
        Model.sequelize.fn('LOWER', Model.sequelize.col('nama_lokasi')),
        name.toLowerCase().trim()
      ),
      attributes: ['id_lokasi', 'nama_lokasi', 'id_cabang'],
      include: [
        {
          association: 'cabang',
          attributes: ['nama_cabang'],
        },
      ],
    });
  }

  /**
   * Mencari cabang di tabel Cabang
   */
  public findCabangByName(name: string) {
    return Cabang.findOne({
      where: Cabang.sequelize?.where(
        Cabang.sequelize.fn('LOWER', Cabang.sequelize.col('nama_cabang')), // Sesuaikan nama kolom di tabel cabang
        name.toLowerCase().trim()
      ),
      attributes: ['id_cabang', 'nama_cabang'],
    });
  }

  /**
   * Logika Upsert untuk Import:
   * Jika kode_lokasi sudah ada, maka update. Jika tidak, maka create.
   */
  public async upsertImport(payload: any, transaction: any = null) {
    const existing = await Model.findOne({
      where: { kode_lokasi: payload.kode_lokasi },
      transaction,
    });

    if (existing) {
      return await existing.update(
        {
          ...payload,
          updated_at: helper.date(),
        },
        { transaction }
      );
    } else {
      return await Model.create(
        {
          ...payload,
          created_at: helper.date(),
        },
        { transaction }
      );
    }
  }

  public async create(data: any) {
    // payload bisa berupa single object atau array untuk bulkCreate
    return Model.bulkCreate(
      Array.isArray(data.payload) ? data.payload : [data.payload]
    );
  }

  public update(data: any) {
    return Model.update(data?.payload, {
      where: data?.condition,
    });
  }

  public delete(data: any) {
    return Model.destroy({
      where: data?.condition,
    });
  }
}

export const repository = new Repository();
