'use strict';

import { Op, Sequelize } from 'sequelize';
import MasterPelanggaranRemisi from './pelanggaran.remisi.master..model';

export default class Repository {
  /**
   * Mengambil seluruh data (Dropdown / Unpaginated List)
   */
  public list(data: any) {
    let query: any = {
      order: [
        ['jenis', 'ASC'],
        ['kode_pelanggaran', 'ASC'],
      ],
      where: {},
    };

    const keyword = data?.keyword ? `%${data.keyword.toLowerCase()}%` : null;
    if (keyword) {
      query.where[Op.or] = [
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('MasterPelanggaranRemisi.nama_pelanggaran')),
          { [Op.like]: keyword }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('MasterPelanggaranRemisi.kode_pelanggaran')),
          { [Op.like]: keyword }
        ),
      ];
    }

    if (data?.jenis && data?.jenis !== '') {
      query.where.jenis = data.jenis;
    }

    if (data?.kategori && data?.kategori !== '') {
      query.where.kategori = data.kategori;
    }

    if (typeof data?.is_active !== 'undefined' && data?.is_active !== '') {
      query.where.is_active = data.is_active;
    }

    return MasterPelanggaranRemisi.findAll(query);
  }

  /**
   * Cek duplikasi kode_pelanggaran
   */
  public async checkDuplicateCode(
    kode_pelanggaran: string,
    excludeId?: string
  ) {
    const where: any = { kode_pelanggaran };
    if (excludeId) {
      where.id_pelanggaran_remisi = { [Op.ne]: excludeId };
    }
    return await MasterPelanggaranRemisi.findOne({ where });
  }

  /**
   * Mengambil data dengan Pagination & Filter (Index Page)
   */
  public async index(data: any) {
    const query: any = {
      order: [['created_at', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
      distinct: true,
      subQuery: false,
      where: {},
    };

    if (data?.jenis && data?.jenis !== '') {
      query.where.jenis = data.jenis;
    }

    if (data?.kategori && data?.kategori !== '') {
      query.where.kategori = data.kategori;
    }

    if (typeof data?.is_active !== 'undefined' && data?.is_active !== '') {
      query.where.is_active = data.is_active;
    }

    const keyword = data?.keyword ? `%${data.keyword.toLowerCase()}%` : null;
    if (keyword) {
      query.where[Op.or] = [
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('MasterPelanggaranRemisi.kode_pelanggaran')),
          { [Op.like]: keyword }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('MasterPelanggaranRemisi.nama_pelanggaran')),
          { [Op.like]: keyword }
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.cast(Sequelize.col('MasterPelanggaranRemisi.jenis'), 'TEXT')
          ),
          { [Op.like]: keyword }
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.cast(Sequelize.col('MasterPelanggaranRemisi.kategori'), 'TEXT')
          ),
          { [Op.like]: keyword }
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('MasterPelanggaranRemisi.keterangan')),
          { [Op.like]: keyword }
        ),
      ];
    }

    return await MasterPelanggaranRemisi.findAndCountAll(query);
  }

  /**
   * Detail data berdasarkan ID / Kondisi tertentu
   */
  public detail(condition: any) {
    return MasterPelanggaranRemisi.findOne({
      where: condition,
    });
  }

  /**
   * Create single / bulk data
   */
  public async create(data: any) {
    const trx = data.transaction;

    if (Array.isArray(data.payload)) {
      return await MasterPelanggaranRemisi.bulkCreate(data.payload, {
        transaction: trx,
      });
    }

    return await MasterPelanggaranRemisi.create(data.payload, {
      transaction: trx,
    });
  }

  /**
   * Update data
   */
  public update(data: any) {
    return MasterPelanggaranRemisi.update(data?.payload, {
      where: data?.condition,
    });
  }

  /**
   * Soft Delete data
   */
  public async delete(condition: any) {
    return MasterPelanggaranRemisi.destroy({
      where: condition,
    });
  }

  /**
   * Mengambil data untuk kebutuhan Export / Template
   */
  public async listForExport(params: {
    q?: string;
    isTemplate?: boolean;
    limit?: number;
    jenis?: string;
    kategori?: string;
    isActive?: boolean;
  }) {
    const { q, isTemplate, limit, jenis, kategori, isActive } = params;
    const keyword = q ? `%${q}%` : null;

    const whereClause: any = {};

    if (!isTemplate) {
      if (jenis && jenis !== '') {
        whereClause.jenis = jenis;
      }

      if (kategori && kategori !== '') {
        whereClause.kategori = kategori;
      }

      if (isActive !== undefined) {
        whereClause.is_active = isActive;
      }

      if (keyword) {
        const keywordLower = keyword.toLowerCase();
        whereClause[Op.or] = [
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('MasterPelanggaranRemisi.kode_pelanggaran')),
            { [Op.like]: keywordLower }
          ),
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('MasterPelanggaranRemisi.nama_pelanggaran')),
            { [Op.like]: keywordLower }
          ),
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.cast(Sequelize.col('MasterPelanggaranRemisi.jenis'), 'TEXT')
            ),
            { [Op.like]: keywordLower }
          ),
          Sequelize.where(
            Sequelize.fn(
              'LOWER',
              Sequelize.cast(Sequelize.col('MasterPelanggaranRemisi.kategori'), 'TEXT')
            ),
            { [Op.like]: keywordLower }
          ),
        ];
      }
    }

    return MasterPelanggaranRemisi.findAll({
      where: whereClause,
      limit: limit || (isTemplate ? 5 : undefined),
      subQuery: false,
      order: [
        ['jenis', 'ASC'],
        ['kode_pelanggaran', 'ASC'],
      ],
    });
  }

  /**
   * Inserter untuk Import Excel/CSV dengan penanganan Upsert berdasarkan `kode_pelanggaran`
   */
  public async insertImport(payloads: any[]) {
    const trx = await MasterPelanggaranRemisi.sequelize?.transaction();
    try {
      for (const item of payloads) {
        const existing = await MasterPelanggaranRemisi.findOne({
          where: {
            kode_pelanggaran: item.kode_pelanggaran,
          },
          transaction: trx,
        });

        if (existing) {
          await existing.update(item, { transaction: trx });
        } else {
          await MasterPelanggaranRemisi.create(item, { transaction: trx });
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