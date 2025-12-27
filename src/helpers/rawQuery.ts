import { Sequelize } from 'sequelize';
import { initializeDatabase } from '../database/connection';
import Config from '../config/parameter';

export default class RawQuery {
  private _connection: any = null;

  public async getConnection(): Promise<Sequelize> {
    if (!this._connection) {
      const dataConfig = await Config.initialize();
      this._connection = initializeDatabase(dataConfig?.database);
    }
    return this._connection;
  }
}

export const rawQuery = new RawQuery();
