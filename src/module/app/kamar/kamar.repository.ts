'use strict';

import { Op, Sequelize } from 'sequelize';
import Model from './kamar.model';
import Asrama from '../asrama/asrama.model';
import Pegawai from '../pegawai/pegawai.model';

export default class Repository {
	public list(data: any) {
		let query: Object = {
			order: [['id_kamar', 'DESC']],
			include: [
				{
					model: Asrama,
					as: 'asrama',
					attributes: ['id_asrama', 'nama_asrama'],
					required: false,
				},
				{
					model: Pegawai,
					as: 'waliAsuh',
					attributes: ['id_pegawai', 'nama_lengkap'],
					required: false,
				},
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
				{
					model: Asrama,
					as: 'asrama',
					attributes: ['id_asrama', 'nama_asrama'],
					required: false,
				},
				{
					model: Pegawai,
					as: 'waliAsuh',
					attributes: ['id_pegawai', 'nama_lengkap'],
					required: false,
				}
			],
		};

		const keyword = data?.keyword ? `%${data.keyword}%` : null;

		if (keyword) {
			query = {
				...query,
				where: {
					[Op.or]: [
						{ nama_kamar: { [Op.like]: keyword } },
						{ lantai: { [Op.like]: keyword } },
						{ kapasitas: { [Op.like]: keyword } },
						{ status: { [Op.like]: keyword } },
						{ keterangan: { [Op.like]: keyword } },
						{ '$asrama.nama_asrama$': { [Op.like]: keyword } },
						{ '$waliAsuh.nama_pegawai$': { [Op.like]: keyword } }
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
				{
					model: Asrama,
					as: 'asrama',
					attributes: ['id_asrama', 'nama_asrama'],
					required: false,
				},
				{
					model: Pegawai,
					as: 'waliAsuh',
					attributes: ['id_pegawai', 'nama_lengkap'],
					required: false,
				}
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
