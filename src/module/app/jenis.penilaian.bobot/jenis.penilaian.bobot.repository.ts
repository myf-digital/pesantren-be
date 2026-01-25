'use strict';

import { Op, QueryTypes, Sequelize } from 'sequelize';
import Model from './jenis.penilaian.bobot.model';
import { rawQuery } from '../../../helpers/rawQuery';

export default class Repository {
  public async list(data: any) {
    const keyword = data?.keyword ? `%${data.keyword}%` : null;

    const whereClause = keyword ? `WHERE jp.singkatan ILIKE :keyword` : '';

    const query = `
		SELECT 
			jpb.id_bobot,
			jp.id_penilaian,
			jp.singkatan as nama_penilaian,
			jpb.lembaga_type,
			CASE 
				WHEN jpb.lembaga_type = 'FORMAL' 
					THEN json_build_object('id_lembaga', lf.id_lembaga, 'nama_lembaga', lf.nama_lembaga)
				WHEN jpb.lembaga_type = 'PESANTREN' 
					THEN json_build_object('id_lembaga', lp.id_lembaga, 'nama_lembaga', lp.nama_lembaga)
			END AS lembaga,
			t.id_tingkat,
			t.tingkat,
			ta.id_tahunajaran,
			ta.tahun_ajaran,
			jpb.bobot,
			jpb.status
		FROM jenis_penilaian_bobot jpb
		LEFT JOIN jenis_penilaian jp ON jpb.id_penilaian = jp.id_penilaian
		LEFT JOIN lembaga_pendidikan_formal lf 
			ON jpb.id_lembaga = lf.id_lembaga AND jpb.lembaga_type = 'FORMAL'
		LEFT JOIN lembaga_pendidikan_kepesantrenan lp 
			ON jpb.id_lembaga = lp.id_lembaga AND jpb.lembaga_type = 'PESANTREN'
		LEFT JOIN tingkat t ON jpb.id_tingkat = t.id_tingkat
		LEFT JOIN tahun_ajaran ta ON jpb.id_tahunajaran = ta.id_tahunajaran
		${whereClause}
		ORDER BY jpb.id_bobot DESC
    `;

    const conn = await rawQuery.getConnection();
    const results = await conn.query(query, {
      type: QueryTypes.SELECT,
      replacements: {
        keyword,
      },
    });

    return results;
  }

  public async index(data: {
    keyword?: string;
    offset?: number;
    limit?: number;
  }) {
    const keyword = data?.keyword ? `%${data.keyword}%` : null;

    // WHERE clause untuk filter keyword
    const whereClause = keyword
      ? `WHERE 
				jp.singkatan ILIKE :keyword OR
				jpb.lembaga_type ILIKE :keyword OR
				t.tingkat ILIKE :keyword OR
				ta.tahun_ajaran ILIKE :keyword OR
				jpb.bobot ILIKE :keyword OR
				jpb.status ILIKE :keyword OR
				lf.nama_lembaga ILIKE :keyword OR
				lp.nama_lembaga ILIKE :keyword`
      : '';

    // LIMIT & OFFSET
    const limitOffset = `
			${data?.limit ? `LIMIT ${data.limit}` : ''}
			${data?.offset ? `OFFSET ${data.offset}` : ''}
		`;

    const queryData = `
			SELECT 
				jpb.id_bobot,
				jp.id_penilaian,
				jp.singkatan as nama_penilaian,
				jpb.lembaga_type,
				CASE 
					WHEN jpb.lembaga_type = 'FORMAL' 
						THEN json_build_object('id_lembaga', lf.id_lembaga, 'nama_lembaga', lf.nama_lembaga)
					WHEN jpb.lembaga_type = 'PESANTREN' 
						THEN json_build_object('id_lembaga', lp.id_lembaga, 'nama_lembaga', lp.nama_lembaga)
				END AS lembaga,
				t.id_tingkat,
				t.tingkat,
				ta.id_tahunajaran,
				ta.tahun_ajaran,
				jpb.bobot,
				jpb.status
			FROM jenis_penilaian_bobot jpb
			LEFT JOIN jenis_penilaian jp ON jpb.id_penilaian = jp.id_penilaian
			LEFT JOIN lembaga_pendidikan_formal lf 
				ON jpb.id_lembaga = lf.id_lembaga AND jpb.lembaga_type = 'FORMAL'
			LEFT JOIN lembaga_pendidikan_kepesantrenan lp 
				ON jpb.id_lembaga = lp.id_lembaga AND jpb.lembaga_type = 'PESANTREN'
			LEFT JOIN tingkat t ON jpb.id_tingkat = t.id_tingkat
			LEFT JOIN tahun_ajaran ta ON jpb.id_tahunajaran = ta.id_tahunajaran
			${whereClause}
			ORDER BY jpb.id_bobot DESC
			${limitOffset}
		`;

    const queryCount = `
			SELECT COUNT(*) AS total
			FROM jenis_penilaian_bobot jpb
			LEFT JOIN jenis_penilaian jp ON jpb.id_penilaian = jp.id_penilaian
			LEFT JOIN lembaga_pendidikan_formal lf 
				ON jpb.id_lembaga = lf.id_lembaga AND jpb.lembaga_type = 'FORMAL'
			LEFT JOIN lembaga_pendidikan_kepesantrenan lp 
				ON jpb.id_lembaga = lp.id_lembaga AND jpb.lembaga_type = 'PESANTREN'
			LEFT JOIN tingkat t ON jpb.id_tingkat = t.id_tingkat
			LEFT JOIN tahun_ajaran ta ON jpb.id_tahunajaran = ta.id_tahunajaran
			${whereClause}
		`;

    const conn = await rawQuery.getConnection();

    // Eksekusi query data dan count secara paralel
    const [dataResult, countResult] = await Promise.all([
      conn.query(queryData, {
        type: QueryTypes.SELECT,
        replacements: { keyword },
      }),
      conn.query<any>(queryCount, {
        type: QueryTypes.SELECT,
        replacements: { keyword },
      }),
    ]);

    const total = parseInt((countResult[0]?.total as string) || '0', 10);

    return {
      rows: dataResult,
      count: total,
    };
  }

  public async detail(condition: { id_bobot?: string }) {
    let whereConditions: string[] = [];

    if (condition.id_bobot) {
      whereConditions.push(`jpb.id_bobot::text = :id_bobot`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    const queryData = `
			SELECT 
				jpb.id_bobot,
				jp.id_penilaian,
				jp.singkatan as nama_penilaian,
				jpb.lembaga_type,
				CASE 
					WHEN jpb.lembaga_type = 'FORMAL' 
						THEN json_build_object('id_lembaga', lf.id_lembaga, 'nama_lembaga', lf.nama_lembaga)
					WHEN jpb.lembaga_type = 'PESANTREN' 
						THEN json_build_object('id_lembaga', lp.id_lembaga, 'nama_lembaga', lp.nama_lembaga)
				END AS lembaga,
				t.id_tingkat,
				t.tingkat,
				ta.id_tahunajaran,
				ta.tahun_ajaran,
				jpb.bobot,
				jpb.status
			FROM jenis_penilaian_bobot jpb
			LEFT JOIN jenis_penilaian jp ON jpb.id_penilaian = jp.id_penilaian
			LEFT JOIN lembaga_pendidikan_formal lf 
				ON jpb.id_lembaga = lf.id_lembaga AND jpb.lembaga_type = 'FORMAL'
			LEFT JOIN lembaga_pendidikan_kepesantrenan lp 
				ON jpb.id_lembaga = lp.id_lembaga AND jpb.lembaga_type = 'PESANTREN'
			LEFT JOIN tingkat t ON jpb.id_tingkat = t.id_tingkat
			LEFT JOIN tahun_ajaran ta ON jpb.id_tahunajaran = ta.id_tahunajaran
			${whereClause}
			ORDER BY jpb.id_bobot DESC
			LIMIT 1
		`;

    const conn = await rawQuery.getConnection();

    const dataResult = await conn.query(queryData, {
      type: QueryTypes.SELECT,
      replacements: condition,
    });

    return dataResult;
  }

  public async create(data: any) {
    return Model.bulkCreate(data.payload);
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
