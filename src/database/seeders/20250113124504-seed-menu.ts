'use strict';

import { v4 as uuidv4 } from 'uuid';
import { datamenu } from '../data/menu';
import Config from '../../config/parameter';
import { initializeDatabase } from '../connection';
import Model from '../../module/app/menu/menu.model';
import { QueryInterface, Sequelize } from 'sequelize';
import { initializeModels } from '../../module/models/models.index';
import { repository as repoResource } from '../../module/app/resource/resource.repository';

type Migration = (
  queryInterface: QueryInterface,
  sequelize: Sequelize
) => Promise<void>;
export const up: Migration = async () => {
  const dataConfig = await Config.initialize();
  const sequelize = await initializeDatabase(dataConfig?.database);
  initializeModels(sequelize);

  const menus = datamenu.menu();
  const childmenu = datamenu.childmenu();
  const resource = await repoResource.detail({ username: 'admin@user' }, '');

  for (let i in menus) {
    const check = await Model.findOne({
      where: {
        menu_name: menus[i]?.menu_name,
      },
    });
    if (check) {
      console.log(`⚠️ Menu ${menus[i]?.menu_name} already assign, skipping...`);
    } else {
      const menu = await Model.create({
        ...menus[i],
        menu_id: uuidv4(),
        created_by: resource?.getDataValue('resource_id'),
      });
    }
  }

  for (let i in childmenu) {
    const check = await Model.findOne({
      where: {
        menu_name: childmenu[i]?.menu_name,
      },
    });
    if (check) {
      console.log(
        `⚠️ Child Menu ${childmenu[i]?.menu_name} already assign, skipping...`
      );
    } else {
      const parent = await Model.findOne({
        where: {
          menu_name: menus.find((m) => m.id == childmenu[i]?.parent_id)
            ?.menu_name,
        },
      });
      await Model.create({
        ...childmenu[i],
        menu_id: uuidv4(),
        parent_id: parent?.dataValues?.menu_id,
        created_by: resource?.getDataValue('resource_id'),
      });
    }
  }
};

export const down: Migration = async () => {
  const dataConfig = await Config.initialize();
  const sequelize = await initializeDatabase(dataConfig?.database);
  initializeModels(sequelize);
  await Model.sequelize?.query(`TRUNCATE "app_menu" CASCADE`);
};
