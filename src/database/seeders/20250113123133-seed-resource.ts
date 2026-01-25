'use strict';

import { v4 as uuidv4 } from 'uuid';
import Config from '../../config/parameter';
import { helper } from '../../helpers/helper';
import { ROLE_ADMIN } from '../../utils/constant';
import { initializeDatabase } from '../connection';
import { Op, QueryInterface, Sequelize } from 'sequelize';
import Model from '../../module/app/resource/resource.model';
import { initializeModels } from '../../module/models/models.index';
import { repository as repoArea } from '../../module/area/area.repository';
import { repository as repoRole } from '../../module/app/role/role.repository';

type Migration = (
  queryInterface: QueryInterface,
  sequelize: Sequelize
) => Promise<void>;
export const up: Migration = async () => {
  const dataConfig = await Config.initialize();
  const sequelize = await initializeDatabase(dataConfig?.database);
  initializeModels(sequelize);

  const password = await helper.hashIt('Pas2w0rd!');
  const role = await repoRole.detail({
    role_name: { [Op.like]: `%${ROLE_ADMIN}%` },
  });
  const province = await repoArea.provinceDetail({
    name: { [Op.like]: '%JAWA BARAT%' },
  });
  const regency = await repoArea.regencyDetail({
    name: { [Op.like]: '%KABUPATEN BANDUNG%' },
  });

  const check = await Model.findOne({
    where: { username: 'admin@user' },
  });
  if (check) {
    console.log(`⚠️ User admin@user already exists, skipping...`);
  } else {
    await Model.create({
      resource_id: uuidv4(),
      role_id: role?.getDataValue('role_id'),
      username: 'admin@user',
      email: 'admin.user@yopmail.com',
      password: password,
      full_name: 'Super Admin',
      place_of_birth: 'Bandung',
      date_of_birth: helper.date(),
      usia: 1,
      telepon: '085722800025',
      status: 'A',
      area_province_id: province?.getDataValue('id'),
      area_regencies_id: regency?.getDataValue('id'),
      created_by: '00000000-0000-0000-0000-000000000000',
    });
  }
};

export const down: Migration = async () => {
  const dataConfig = await Config.initialize();
  const sequelize = await initializeDatabase(dataConfig?.database);
  initializeModels(sequelize);
  await Model.sequelize?.query(`TRUNCATE "app_resource" CASCADE`);
};
