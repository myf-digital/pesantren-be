'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class AppMenu extends Model {
  public menu_id!: string;
  public menu_name!: string;
  public menu_icon!: string;
  public module_name!: string;
  public type_menu!: string;
  public seq_number!: number;
  public parent_id!: string;
  public status!: number;
  public created_by!: string;
  public created_date!: Date;
  public modified_by!: string;
  public modified_date!: Date;
}

export function initAppMenu(sequelize: Sequelize) {
  AppMenu.init(
    {
      menu_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      menu_name: {
        type: DataTypes.STRING,
      },
      menu_icon: {
        type: DataTypes.STRING,
      },
      module_name: {
        type: DataTypes.STRING,
      },
      type_menu: {
        type: DataTypes.STRING(1),
      },
      seq_number: {
        type: DataTypes.TINYINT,
      },
      parent_id: {
        type: DataTypes.STRING,
        defaultValue: '00000000-0000-0000-0000-000000000000',
      },
      status: {
        type: DataTypes.TINYINT,
      },
      created_by: {
        type: DataTypes.STRING,
      },
      created_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      modified_by: {
        type: DataTypes.STRING,
      },
      modified_date: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: 'AppMenu',
      tableName: 'app_menu',
      timestamps: false,
    }
  );

  AppMenu.beforeCreate((row) => {
    row?.setDataValue('menu_id', uuidv4());
  });
  return AppMenu;
}

export function associateAppMenu() {
  AppMenu.belongsTo(AppMenu, {
    as: 'parent',
    foreignKey: 'parent_id',
    targetKey: 'menu_id',
  });
}

export default AppMenu;
