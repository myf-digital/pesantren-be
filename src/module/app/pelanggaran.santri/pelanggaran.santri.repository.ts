'use strict';

import { Op } from 'sequelize';
import { KasusPelanggaranSantri } from './pelanggaran.santri.model';
import { AppSantri } from '../santri/santri.model';
import { Pegawai } from '../pegawai/pegawai.model';
import MasterPelanggaranRemisi from '../pelanggaran.remisi.master/pelanggaran.remisi.master..model';
import Lokasi from '../location/location.model';

const defaultIncludes = [
  { model: AppSantri, as: 'santri', attributes: ['id_santri', 'fullname', 'nis'] },
  { model: MasterPelanggaranRemisi, as: 'master_pelanggaran', attributes: ['id_pelanggaran_remisi', 'nama_pelanggaran', 'jenis', 'kategori'] },
  { model: Lokasi, as: 'lokasi', attributes: ['id_lokasi', 'nama_lokasi'] },
  { model: Pegawai, as: 'pelapor', attributes: ['id_pegawai', 'nama_lengkap'] },
  { model: Pegawai, as: 'penanggung_jawab', attributes: ['id_pegawai', 'nama_lengkap'] },
];

export default class Repository {
  /**
   * Mengambil seluruh data (Dropdown / Unpaginated List)
   */
  public list(data: any) {
    let query: any = {
      order: [['tanggal_kejadian', 'DESC']],
      where: {},
      include: defaultIncludes,
    };

    const keyword = data?.keyword ? `%${data.keyword}%` : null;
    
    if (keyword) {
      query.where[Op.or] = [
        { nomor_kasus: { [Op.iLike]: keyword } },
        { kronologi: { [Op.iLike]: keyword } },
        { '$santri.fullname$': { [Op.iLike]: keyword } },
      ];
    }

    if (data?.status_progress && data?.status_progress !== '') {
      query.where.status_progress = data.status_progress;
    }

    if (data?.level_sp && data?.level_sp !== '') {
      query.where.level_sp = data.level_sp;
    }

    if (data?.id_santri && data?.id_santri !== '') {
      query.where.id_santri = data.id_santri;
    }

    return KasusPelanggaranSantri.findAll(query);
  }

  /**
   * Cek duplikasi nomor_kasus
   */
  public async checkDuplicateNomorKasus(
    nomor_kasus: string,
    excludeId?: string
  ) {
    const where: any = { nomor_kasus };
    if (excludeId) {
      where.id_kasus = { [Op.ne]: excludeId };
    }
    return await KasusPelanggaranSantri.findOne({ where });
  }

  /**
   * Mengambil data dengan Pagination & Filter (Index Page)
   */
  public async index(data: any) {
    const query: any = {
      order: [['tanggal_kejadian', 'DESC']],
      offset: data?.offset,
      limit: data?.limit,
      distinct: true, // Mencegah duplikasi hitungan limit akibat tabel berelasi (Include)
      subQuery: false, 
      where: {},
      include: defaultIncludes,
    };

    if (data?.status_progress && data?.status_progress !== '') {
      query.where.status_progress = data.status_progress;
    }

    if (data?.level_sp && data?.level_sp !== '') {
      query.where.level_sp = data.level_sp;
    }

    if (data?.id_santri && data?.id_santri !== '') {
      query.where.id_santri = data.id_santri;
    }
    
    if (data?.id_pelanggaran_remisi && data?.id_pelanggaran_remisi !== '') {
      query.where.id_pelanggaran_remisi = data.id_pelanggaran_remisi;
    }

    const keyword = data?.keyword ? `%${data.keyword}%` : null;
    
    if (keyword) {
      query.where[Op.or] = [
        { nomor_kasus: { [Op.iLike]: keyword } },
        { kronologi: { [Op.iLike]: keyword } },
        { '$santri.fullname$': { [Op.iLike]: keyword } },
        { '$master_pelanggaran.nama_pelanggaran$': { [Op.iLike]: keyword } },
      ];
    }

    return await KasusPelanggaranSantri.findAndCountAll(query);
  }

  /**
   * Detail data berdasarkan ID / Kondisi tertentu
   */
  public detail(condition: any) {
    return KasusPelanggaranSantri.findOne({
      where: condition,
      include: defaultIncludes,
    });
  }

  /**
   * Create single / bulk data
   */
  public async create(data: any) {
    const trx = data.transaction;

    if (Array.isArray(data.payload)) {
      return await KasusPelanggaranSantri.bulkCreate(data.payload, {
        transaction: trx,
      });
    }

    return await KasusPelanggaranSantri.create(data.payload, {
      transaction: trx,
    });
  }

  /**
   * Update data
   */
  public update(data: any) {
    return KasusPelanggaranSantri.update(data?.payload, {
      where: data?.condition,
    });
  }

  /**
   * Soft Delete data
   */
  public async delete(condition: any) {
    return KasusPelanggaranSantri.destroy({
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
    status_progress?: string;
    level_sp?: string;
    id_santri?: string;
  }) {
    const { q, isTemplate, limit, status_progress, level_sp, id_santri } = params;
    const keyword = q ? `%${q}%` : null;

    const whereClause: any = {};

    if (!isTemplate) {
      if (status_progress && status_progress !== '') {
        whereClause.status_progress = status_progress;
      }

      if (level_sp && level_sp !== '') {
        whereClause.level_sp = level_sp;
      }
      
      if (id_santri && id_santri !== '') {
        whereClause.id_santri = id_santri;
      }

      if (keyword) {
        whereClause[Op.or] = [
          { nomor_kasus: { [Op.iLike]: keyword } },
          { '$santri.fullname$': { [Op.iLike]: keyword } },
          { '$master_pelanggaran.nama_pelanggaran$': { [Op.iLike]: keyword } },
        ];
      }
    }

    return KasusPelanggaranSantri.findAll({
      where: whereClause,
      include: defaultIncludes,
      limit: limit || (isTemplate ? 5 : undefined),
      subQuery: false,
      order: [['tanggal_kejadian', 'DESC']],
    });
  }

  /**
   * Inserter untuk Import Excel/CSV dengan penanganan Upsert berdasarkan `nomor_kasus`
   */
  public async insertImport(payloads: any[]) {
    const trx = await KasusPelanggaranSantri.sequelize?.transaction();
    try {
      for (const item of payloads) {
        const existing = await KasusPelanggaranSantri.findOne({
          where: {
            nomor_kasus: item.nomor_kasus,
          },
          transaction: trx,
        });

        if (existing) {
          await existing.update(item, { transaction: trx });
        } else {
          await KasusPelanggaranSantri.create(item, { transaction: trx });
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