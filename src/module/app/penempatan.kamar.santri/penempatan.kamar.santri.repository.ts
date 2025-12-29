'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './penempatan.kamar.santri.model';
import Asrama from '../asrama/asrama.model';
import TahunAjaran from '../tahun.ajaran/tahun.ajaran.model';
import Kamar from '../kamar/kamar.model';

export default class Repository {
	public list(data: any) {
		let query: Object = {
			order: [['id_penempatan', 'DESC']],
			include: [
				// {
				// 	model: Santri,
				// 	as: 'santri',
				// 	attributes: ['id_santri', 'nama_santri'],
				// 	required: false,
				// },
				{
					model: Asrama,
					as: 'asrama',
					attributes: ['id_asrama', 'nama_asrama'],
					required: false,
				},
				{
					model: Kamar,
					as: 'kamar',
					attributes: ['id_kamar', 'nama_kamar'],
					required: false,
				},
				{
					model: TahunAjaran,
					as: 'tahunAjaran',
					attributes: ['id_tahunajaran', 'tahun_ajaran'],
					required: false,
				}
			],
		};

		const keyword = data?.keyword ? `%${data.keyword}%` : null;

		if (keyword) {
			query = {
				...query,
				where: {
					nama_kamar: { [Op.like]: keyword },
				},
			};
		}

		return Model.findAll(query);
	}

	public async index(data: any) {
		let query: Object = {
			order: [['id_kamar', 'DESC']],
			offset: data?.offset,
			limit: data?.limit,
			distinct: true,
			subQuery: false,
			include: [
				// {
				// 	model: Santri,
				// 	as: 'santri',
				// 	attributes: ['id_santri', 'nama_santri'],
				// 	required: false,
				// },
				{
					model: Asrama,
					as: 'asrama',
					attributes: ['id_asrama', 'nama_asrama'],
					required: false,
				},
				{
					model: Kamar,
					as: 'kamar',
					attributes: ['id_kamar', 'nama_kamar'],
					required: false,
				},
				{
					model: TahunAjaran,
					as: 'tahunAjaran',
					attributes: ['id_tahunajaran', 'tahun_ajaran'],
					required: false,
				},
			],
		};

		const keyword = data?.keyword ? `%${data.keyword}%` : null;

		if (keyword) {
			query = {
				...query,
				where: {
					[Op.or]: [
						{ status: { [Op.like]: keyword } },
						{ keterangan: { [Op.like]: keyword } },
						{ tanggal_masuk: { [Op.like]: keyword } },
						{ tanggal_keluar: { [Op.like]: keyword } },
						{ '$asrama.nama_asrama$': { [Op.like]: keyword } },
						{ '$kamar.nama_kamar$': { [Op.like]: keyword } },
						{ '$santri.nama_kamar$': { [Op.like]: keyword } },
						{ '$tahunAjaran.tahun_ajaran$': { [Op.like]: keyword } }
					]
				}
			}


			return await Model.findAndCountAll(query);
		}

		return Model.findAndCountAll(query);
	}


	public detail(condition: any) {
		return Model.findOne({
			include: [
				// {
				// 	model: Santri,
				// 	as: 'santri',
				// 	attributes: ['id_santri', 'nama_santri'],
				// 	required: false,
				// },
				{
					model: Asrama,
					as: 'asrama',
					attributes: ['id_asrama', 'nama_asrama'],
					required: false,
				},
				{
					model: Kamar,
					as: 'kamar',
					attributes: ['id_kamar', 'nama_kamar'],
					required: false,
				},
				{
					model: TahunAjaran,
					as: 'tahunAjaran',
					attributes: ['id_tahunajaran', 'tahun_ajaran'],
					required: false,
				},
			],
			where: {
				...condition,
			},
		});
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
