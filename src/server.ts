'use strict';

import cors from 'cors';
import moment from 'moment';
import cron from 'node-cron';
import bodyParser from 'body-parser';
import express, { Express } from 'express';
import fileUpload from 'express-fileupload';
import { xss } from 'express-xss-sanitizer';

import routes from './routes';
import Config from './config/parameter';
import { helper } from './helpers/helper';
require('express-async-errors');

import { runWithUser } from './context/userContext';
import { initializeJWT } from './config/config.jwt';
import { initializeApp } from './config/config.app';
import { initializeMail } from './config/config.mail';
import { initializeDatabase } from './database/connection';
import { initializeTelegram } from './config/config.telegram';
import { initializeModels } from './module/models/models.index';

async function bootstrap() {
  const dataConfig = await Config.initialize();

  initializeApp(dataConfig);
  initializeJWT(dataConfig?.jwt);
  initializeMail(dataConfig?.mail);
  initializeTelegram(dataConfig?.telegram);

  const sequelize = await initializeDatabase(dataConfig?.database);
  initializeModels(sequelize);

  const app: Express = express();
  const day: string = moment().format('YYYY-MM-DD');
  const options: cors.CorsOptions = {
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'X-Access-Token',
      'Authorization',
    ],
    credentials: true,
    methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
    origin: '*',
    preflightContinue: false,
  };

  app.use(
    fileUpload({
      useTempFiles: true,
      tempFileDir: `./tmp/${day}/`,
    })
  );
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.static('public'));
  app.use(xss({
    allowedKeys: ['penghasilan']
  }));
  app.use(cors(options));
  app.use((req, res, next) => {
    runWithUser(null, next);
  });
  app.use(routes);

  cron.schedule(
    '1 0 * * *',
    async () => {
      await helper.updateUsia();
    },
    {
      scheduled: true,
      timezone: 'Asia/Jakarta',
    }
  );

  app.listen(dataConfig?.port, () => {
    console.log(`⚡️[server]: Server is running on port: ${dataConfig?.port}`);
  });
}

bootstrap();
