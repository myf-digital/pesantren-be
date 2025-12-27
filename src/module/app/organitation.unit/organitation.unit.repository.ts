'use strict';

import { Op, Sequelize, literal, QueryTypes } from 'sequelize';
import Model, { OrganitationUnit } from './organitation.unit.model';
import Cabang from '../cabang/cabang.model';
import LembagaPendidikan, {
  LembagaPendidikanKepesantrenan,
} from '../lembaga.pendidikan.kepesantrenan/lembaga.pendidikan.kepesantrenan.model';
import LembagaPendidikanFormal from '../lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';
import { sequelize } from '../../../database/connection';
import { rawQuery } from '../../../helpers/rawQuery';

export default class Repository {
  public async list(data: any) {
    const keyword = data?.keyword ? `%${data.keyword}%` : null;

    const whereClause = keyword ? `WHERE o.nama_orgunit ILIKE :keyword` : '';

    const query = `
		  SELECT
			o.id_orgunit,
			o.nama_orgunit,
			o.lembaga_type,
			p.id_orgunit AS parent_id,
			p.nama_orgunit AS parent_nama,
			c.id_cabang,
			c.nama_cabang,
			CASE 
				WHEN o.lembaga_type = 'FORMAL' 
					THEN json_build_object('id_lembaga', lf.id_lembaga, 'nama_lembaga', lf.nama_lembaga)
				WHEN o.lembaga_type = 'PESANTREN' 
					THEN json_build_object('id_lembaga', lp.id_lembaga, 'nama_lembaga', lp.nama_lembaga)
			END AS lembaga
		  FROM orgunit o
		  LEFT JOIN orgunit p ON o.parent_id = p.id_orgunit
		  LEFT JOIN cabang c ON o.id_cabang = c.id_cabang
		  LEFT JOIN lembaga_pendidikan_formal lf 
			ON o.id_lembaga = lf.id_lembaga AND o.lembaga_type = 'FORMAL'
		  LEFT JOIN lembaga_pendidikan_kepesantrenan lp
			ON o.id_lembaga = lp.id_lembaga AND o.lembaga_type = 'PESANTREN'
		  ${whereClause}
		  ORDER BY o.id_orgunit DESC
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
				o.id_orgunit::text ILIKE :keyword OR
				o.nama_orgunit ILIKE :keyword OR
				o.level_orgunit::text ILIKE :keyword OR
				o.jenis_orgunit ILIKE :keyword OR
				o.keterangan ILIKE :keyword OR
				p.nama_orgunit ILIKE :keyword OR
				c.nama_cabang ILIKE :keyword OR
				lf.nama_lembaga ILIKE :keyword OR
				lp.nama_lembaga ILIKE :keyword`
      : '';

    // LIMIT & OFFSET
    const limitOffset = `
			${data?.limit ? `LIMIT ${data.limit}` : ''}
			${data?.offset ? `OFFSET ${data.offset}` : ''}
		`;

    // Query utama untuk mengambil data
    const queryData = `
			SELECT 
				o.id_orgunit,
				o.nama_orgunit,
				o.level_orgunit,
				o.jenis_orgunit,
				o.keterangan,
				p.id_orgunit AS parent_id,
				p.nama_orgunit AS parent_nama,
				c.id_cabang,
				c.nama_cabang,
				CASE 
					WHEN o.lembaga_type = 'FORMAL' 
						THEN json_build_object('id_lembaga', lf.id_lembaga, 'nama_lembaga', lf.nama_lembaga)
					WHEN o.lembaga_type = 'PESANTREN' 
						THEN json_build_object('id_lembaga', lp.id_lembaga, 'nama_lembaga', lp.nama_lembaga)
				END AS lembaga
			FROM orgunit o
			LEFT JOIN orgunit p ON o.parent_id = p.id_orgunit
			LEFT JOIN cabang c ON o.id_cabang = c.id_cabang
			LEFT JOIN lembaga_pendidikan_formal lf 
				ON o.id_lembaga = lf.id_lembaga AND o.lembaga_type = 'FORMAL'
			LEFT JOIN lembaga_pendidikan_kepesantrenan lp 
				ON o.id_lembaga = lp.id_lembaga AND o.lembaga_type = 'PESANTREN'
			${whereClause}
			ORDER BY o.id_orgunit DESC
			${limitOffset}
		`;

    // Query untuk menghitung total row
    const queryCount = `
			SELECT COUNT(*) AS total
			FROM orgunit o
			LEFT JOIN orgunit p ON o.parent_id = p.id_orgunit
			LEFT JOIN cabang c ON o.id_cabang = c.id_cabang
			LEFT JOIN lembaga_pendidikan_formal lf 
				ON o.id_lembaga = lf.id_lembaga AND o.lembaga_type = 'FORMAL'
			LEFT JOIN lembaga_pendidikan_kepesantrenan lp 
				ON o.id_lembaga = lp.id_lembaga AND o.lembaga_type = 'PESANTREN'
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

  public async detail(condition: { id_orgunit?: string }) {
    let whereConditions: string[] = [];

    if (condition.id_orgunit) {
      whereConditions.push(`o.id_orgunit::text = :id_orgunit`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    const queryData = `
			SELECT 
				o.id_orgunit,
				o.nama_orgunit,
				o.level_orgunit,
				o.jenis_orgunit,
				o.keterangan,
				p.id_orgunit AS parent_id,
				p.nama_orgunit AS parent_nama,
				c.id_cabang,
				c.nama_cabang,
				CASE 
					WHEN o.lembaga_type = 'FORMAL' 
						THEN json_build_object('id_lembaga', lf.id_lembaga, 'nama_lembaga', lf.nama_lembaga)
					WHEN o.lembaga_type = 'PESANTREN' 
						THEN json_build_object('id_lembaga', lp.id_lembaga, 'nama_lembaga', lp.nama_lembaga)
				END AS lembaga
			FROM orgunit o
			LEFT JOIN orgunit p ON o.parent_id = p.id_orgunit
			LEFT JOIN cabang c ON o.id_cabang = c.id_cabang
			LEFT JOIN lembaga_pendidikan_formal lf 
				ON o.id_lembaga = lf.id_lembaga AND o.lembaga_type = 'FORMAL'
			LEFT JOIN lembaga_pendidikan_kepesantrenan lp 
				ON o.id_lembaga = lp.id_lembaga AND o.lembaga_type = 'PESANTREN'
			${whereClause}
			ORDER BY o.id_orgunit DESC
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
