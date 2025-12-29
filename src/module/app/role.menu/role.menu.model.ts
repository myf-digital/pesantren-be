'use strict';

import { v4 as uuidv4 } from 'uuid';
import AppMenu from '../menu/menu.model';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class AppRoleMenu extends Model {
  public role_menu_id!: string;
  public role_id!: string;
  public menu_id!: string;
  public create!: number;
  public edit!: number;
  public delete!: number;
  public approve!: number;
  public import!: number;
  public export!: number;
  public status!: number;
  public created_by!: string;
  public created_date!: Date;
  public modified_by!: string;
  public modified_date!: Date;
}

export function initAppRoleMenu(sequelize: Sequelize) {
  AppRoleMenu.init(
    {
      role_menu_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      role_id: {
        type: DataTypes.STRING,
      },
      menu_id: {
        type: DataTypes.STRING,
      },
      view: {
        type: DataTypes.TINYINT,
      },
      create: {
        type: DataTypes.TINYINT,
      },
      edit: {
        type: DataTypes.TINYINT,
      },
      delete: {
        type: DataTypes.TINYINT,
      },
      approve: {
        type: DataTypes.TINYINT,
      },
      import: {
        type: DataTypes.TINYINT,
      },
      export: {
        type: DataTypes.TINYINT,
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
      modelName: 'AppRoleMenu',
      tableName: 'app_role_menu',
      timestamps: false,
    }
  );

  AppRoleMenu.beforeCreate((row) => {
    row?.setDataValue('role_menu_id', uuidv4());
  });
  return AppRoleMenu;
}

export function associateAppRoleMenu() {
  AppRoleMenu.belongsTo(AppMenu, { as: 'menu', foreignKey: 'menu_id' });
}

export default AppRoleMenu;
