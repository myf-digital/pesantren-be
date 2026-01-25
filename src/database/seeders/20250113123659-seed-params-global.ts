'use strict';

import { v4 as uuidv4 } from 'uuid';
import Config from '../../config/parameter';
import { initializeDatabase } from '../connection';
import { QueryInterface, Sequelize } from 'sequelize';
import { initializeModels } from '../../module/models/models.index';
import Model from '../../module/app/param.global/param.global.model';
import { repository as repoResource } from '../../module/app/resource/resource.repository';

type Migration = (
  queryInterface: QueryInterface,
  sequelize: Sequelize
) => Promise<void>;
export const up: Migration = async () => {
  const dataConfig = await Config.initialize();
  const sequelize = await initializeDatabase(dataConfig?.database);
  initializeModels(sequelize);

  const resource = await repoResource.detail({ username: 'admin@user' }, '');
  const globalParam = [
    {
      id: uuidv4(),
      param_key: 'PAR_RELATION',
      param_value: 'Ayah',
      param_desc: 'Ayah',
      status: 1,
      created_by: resource?.getDataValue('resource_id'),
    },
    {
      id: uuidv4(),
      param_key: 'PAR_RELATION',
      param_value: 'Ibu',
      param_desc: 'Ibu',
      status: 1,
      created_by: resource?.getDataValue('resource_id'),
    },
    {
      id: uuidv4(),
      param_key: 'PAR_RELATION',
      param_value: 'Suami',
      param_desc: 'Suami',
      status: 1,
      created_by: resource?.getDataValue('resource_id'),
    },
    {
      id: uuidv4(),
      param_key: 'PAR_RELATION',
      param_value: 'Istri',
      param_desc: 'Istri',
      status: 1,
      created_by: resource?.getDataValue('resource_id'),
    },
    {
      id: uuidv4(),
      param_key: 'PAR_RELATION',
      param_value: 'Kakak',
      param_desc: 'Kakak',
      status: 1,
      created_by: resource?.getDataValue('resource_id'),
    },
    {
      id: uuidv4(),
      param_key: 'PAR_RELATION',
      param_value: 'Adik',
      param_desc: 'Adik',
      status: 1,
      created_by: resource?.getDataValue('resource_id'),
    },
    {
      id: uuidv4(),
      param_key: 'PAR_RELATION',
      param_value: 'Anak',
      param_desc: 'Anak',
      status: 1,
      created_by: resource?.getDataValue('resource_id'),
    },
    {
      id: uuidv4(),
      param_key: 'PAR_RELATION',
      param_value: 'Paman',
      param_desc: 'Paman',
      status: 1,
      created_by: resource?.getDataValue('resource_id'),
    },
    {
      id: uuidv4(),
      param_key: 'PAR_RELATION',
      param_value: 'Bibi',
      param_desc: 'Bibi',
      status: 1,
      created_by: resource?.getDataValue('resource_id'),
    },
    {
      id: uuidv4(),
      param_key: 'PAR_RELATION',
      param_value: 'Sepupu',
      param_desc: 'Sepupu',
      status: 1,
      created_by: resource?.getDataValue('resource_id'),
    },
    {
      id: uuidv4(),
      param_key: 'PAR_RELATION',
      param_value: 'Ponakan',
      param_desc: 'Ponakan',
      status: 1,
      created_by: resource?.getDataValue('resource_id'),
    },
    {
      id: uuidv4(),
      param_key: 'PAR_RELATION',
      param_value: 'Kakek',
      param_desc: 'Kakek',
      status: 1,
      created_by: resource?.getDataValue('resource_id'),
    },
    {
      id: uuidv4(),
      param_key: 'PAR_RELATION',
      param_value: 'Nenek',
      param_desc: 'Nenek',
      status: 1,
      created_by: resource?.getDataValue('resource_id'),
    },
  ];

  for (let i in globalParam) {
    const check = await Model.findOne({
      where: { param_value: globalParam[i]?.param_value },
    });
    if (check) {
      console.log(
        `⚠️ Global Param ${globalParam[i]?.param_value} already exists, skipping...`
      );
    } else await Model.create(globalParam[i]);
  }
};

export const down: Migration = async () => {
  const dataConfig = await Config.initialize();
  const sequelize = await initializeDatabase(dataConfig?.database);
  initializeModels(sequelize);
  await Model.sequelize?.query(`TRUNCATE "app_param_global" CASCADE`);
};
