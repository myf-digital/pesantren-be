'use strict';

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import moment from 'moment';
import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import TelegramBot from 'tele-sender';
import { QueryTypes } from 'sequelize';
import { Request, Response } from 'express';
import { response } from '../helpers/response';
import { appConfig } from '../config/config.app';
import { mailConfig } from '../config/config.mail';
import { parse as ParseCSV } from 'csv-parse/sync';
import { teleConfig } from '../config/config.telegram';
import { APP_NAME, MYSQL, POSTGRES } from '../utils/constant';
import AppResource from '../module/app/resource/resource.model';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';

const month: string = moment().format('YYYY-MM');
const parseTimeToSeconds = (time: string): number => {
  if (!time) return 0

  const normalized = time.replace(/\./g, ':')
  const parts = normalized.split(':').map(Number)

  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const s = parts[2] ?? 0

  return h * 3600 + m * 60 + s
}

export default class Helper {
  public date() {
    return moment().locale('id').format('YYYY-MM-DD HH:mm:ss');
  }

  public dateFormat(date: string) {
    return moment(date).locale('id').format('YYYY-MM-DD HH:mm:ss');
  }

  public dateForNumber() {
    return moment().locale('id').format('DDMMYYYY');
  }

  public dateAdd(num: number, type: any) {
    return moment().add(num, type).locale('id').format('YYYY-MM-DD HH:mm:ss');
  }

  public dateSubtract(num: number, type: any) {
    return moment()
      .subtract(num, type)
      .locale('id')
      .format('YYYY-MM-DD HH:mm:ss');
  }

  public dateDiff(date: any, type: any) {
    return moment(date).diff(moment(), type);
  }

  public only(keys: Array<string>, data: any, isUpdate: boolean = false) {
    const date = this.date();
    let result: any = {};

    keys.forEach((i) => {
      if (
        (data[i] &&
          data[i] !== undefined &&
          data[i] !== '' &&
          data[i] != 'null') ||
        data[i] === 0
      ) {
        result[i] = data[i];
      }
    });
    if (isUpdate) {
      result = {
        ...result,
        updated_at: date,
      };
    } else {
      result = {
        ...result,
        created_at: date,
        updated_at: date,
      };
    }
    return result;
  }

  public async hashIt(password: string, length: number = 10) {
    const salt: string = await bcrypt.genSalt(length);
    const hashed: string = await bcrypt.hash(password, salt);
    return hashed;
  }

  public async compareIt(password: any, hashed: any) {
    return await bcrypt.compare(password, hashed);
  }

  public random(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  public checkExtention(file: File, type: string = 'image') {
    if (type == 'image' && file?.size > 2048000)
      return 'file size maksimal *2MB.';
    const allowedExt: any = {
      image: ['jpg', 'jpeg', 'png', 'gif'],
      video: ['mp4', 'webm', 'avi', 'mkv', 'mov', 'flv', 'mts', 'wmv'],
      file: ['pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
    };
    let ext: string = file?.name.split('.').pop() || '-';
    if (allowedExt[type].includes(ext.toLocaleLowerCase())) return 'allowed';
    return `file extension allowed *${allowedExt[type]?.join(', ')}.`;
  }

  public async upload(
    file: any,
    folder: string = '',
    username: string = 'system',
    type: string = 'local'
  ) {
    const filename: string = file?.name.replace(/ /g, '');
    const upload_path: string = `./public/uploads/${folder}/${month}`;
    if (!fs.existsSync(upload_path)) {
      fs.mkdirSync(upload_path, { recursive: true });
    }
    let uploadPath: string = `${upload_path}/${filename}`;
    await file.mv(uploadPath, async function (err: any) {
      if (err) {
        console.warn(`upload ${type} error: ${err?.message}`);
        if (teleConfig?.token) {
          const telegram = new TelegramBot(teleConfig?.token);
          await telegram.send(teleConfig?.chatId, err?.message);
        }
        return err?.message;
      }
    });
    return uploadPath.replace('./public', '');
  }

  public async resize(file: any, fd: string, w: number, h: number = 0) {
    const size: string = `${w}${h == 0 ? '' : '_' + h}`;
    const rename = `${
      file?.name.replace(/ /g, '').split('.')[0]
    }_${size}.${file?.name.split('.').pop()}`;
    const upload_path: string = `./public/uploads/${fd}/${month}`;
    let uploadPath: string = `${upload_path}/${rename}`;
    if (!fs.existsSync(upload_path)) {
      fs.mkdirSync(upload_path, { recursive: true });
    }

    let resize: any = null;
    if (['gallery'].includes(fd)) {
      const metadata = await sharp(path.resolve(file?.tempFilePath)).metadata();
      const width: number = +(metadata?.width || 0);
      const height: number = +(metadata?.height || 0);
      const newWidth: number = Math.round(width / (height / w));

      resize = await sharp(path.resolve(file?.tempFilePath))
        .resize(newWidth, w)
        .toFile(path.resolve(uploadPath));
    } else {
      resize = await sharp(path.resolve(file?.tempFilePath))
        .resize(w, h == 0 ? w : h)
        .toFile(path.resolve(uploadPath));
    }

    return {
      ...resize,
      filename: rename,
      path_doc: uploadPath.replace('./public', ''),
    };
  }

  public async checkDirExport(type: string) {
    const month: string = moment().format('YYYY-MM');
    const path: string = `./public/${type}/${month}`;
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
    return {
      dir: `/${type}/${month}`,
      path: path,
    };
  }

  public async sendNotif(message: string) {
    if (teleConfig?.token && teleConfig?.token != 'token') {
      const telegram = new TelegramBot(teleConfig?.token);
      return await telegram.send(teleConfig?.chatId, message);
    }
    return false;
  }

  public async catchError(message: string, code: number, res: Response) {
    const msg: string = `${appConfig?.app} - ${message}`;
    await this.sendNotif(msg);
    return response.failed(msg, code, res);
  }

  public async sendEmail(data: Object | any) {
    let tls = {};
    if (mailConfig?.secure) {
      tls = {
        tls: {
          ciphers: 'SSLv3',
        },
      };
    }

    let mailOptions: any;
    if (data?.attachments && data?.attachments?.length > 0) {
      mailOptions = {
        from: `${APP_NAME} ${mailConfig?.sender}`,
        to: data?.to,
        subject: data?.subject,
        html: data?.content,
        attachments: data?.attachments,
      };
    } else {
      mailOptions = {
        from: `${APP_NAME} ${mailConfig?.sender}`,
        to: data?.to,
        subject: data?.subject,
        html: data?.content,
      };
    }

    const transporter = nodemailer.createTransport({
      service: mailConfig?.service,
      host: mailConfig?.host,
      port: mailConfig?.port,
      secure: mailConfig?.secure,
      auth: {
        user: mailConfig?.user,
        pass: mailConfig?.pass,
      },
      logger: mailConfig?.debug,
      ...tls,
    });

    transporter.sendMail(mailOptions, async (error: any, info: any) => {
      if (error) {
        console.warn(`Email error: ${error}`);
        await this.sendNotif(error);
      } else {
        console.warn(`Email sent: ${info?.response}`);
      }
    });
  }

  public slug(string: string) {
    return string
      .replace(/ /g, '-')
      .replace(/[^a-zA-Z0-9-]+/g, '')
      .toLowerCase();
  }

  public async updateUsia() {
    try {
      let result: any;
      if (process.env.DB_DIALECT == POSTGRES) {
        result = await AppResource.sequelize?.query(
          `
          UPDATE app_resource AS ar
          SET usia = subquery.usia
          FROM (
              SELECT resource_id, DATE_PART('year', AGE(CURRENT_DATE, date_of_birth)) AS usia
              FROM app_resource
          ) AS subquery
          WHERE ar.resource_id = subquery.resource_id;
          `,
          { type: QueryTypes.SELECT }
        );
      }
      if (process.env.DB_DIALECT == MYSQL) {
        result = await AppResource.sequelize?.query(
          `
          UPDATE app_resource AS ar
          JOIN (
              SELECT 
                  resource_id, 
                  TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) AS calculated_age
              FROM app_resource
          ) AS subquery ON ar.resource_id = subquery.resource_id
          SET ar.usia = subquery.calculated_age;
        `,
          {
            type: QueryTypes.UPDATE,
          }
        );
      }
      await this.sendNotif(`success update usia: ${result}`);
    } catch (err: any) {
      await this.sendNotif(`failed update usia: ${err?.message}`);
    }
  }

  public validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public isValidUUID(uuid: string) {
    return uuidValidate(uuid) && uuidVersion(uuid) == 4;
  }

  public makeid(length: number): string {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter: number = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }

  public formatIDR(amount: number): string {
    const roundedAmount = Math.round(amount);
    const formattedAmount = roundedAmount
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return formattedAmount;
  }

  public fetchQueryRequest(req: Request) {
    const limit: any = req?.query?.perPage || 10;
    const offset: any = req?.query?.page || 1;
    const keyword: any = req?.query?.q;

    return {
      limit: parseInt(limit),
      offset: parseInt(limit) * (parseInt(offset) - 1),
      keyword,
    };
  }

  public calDurationTime(start: string, end: string): number {
    if (!start || !end) return 0

    const totalStart = parseTimeToSeconds(start)
    const totalEnd = parseTimeToSeconds(end)

    let duration = (totalEnd - totalStart) / 3600

    if (duration < 0) duration += 24

    return duration
  }

  public getOriginUrl(req: Request) {
    const path = req.path;
    const segments = path.split('/').filter(Boolean);
    return segments[0];
  }

  public parseCSV(buffer: Buffer) {
    const records = ParseCSV(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    return records.map((row: any, i: number) => ({
      __row: i + 2,
      ...row,
    }));
  }

  public async parseImportFile(file: any) {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      return this.parseCSV(file.data);
    }

    if (['xlsx', 'xls'].includes(ext)) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.data);

      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error('Sheet tidak ditemukan');

      const headers: string[] = [];
      sheet.getRow(1).eachCell((cell, col) => {
        const header = String(cell.value ?? '').trim();
        if (header) headers[col - 1] = header;
      });

      const rows: any[] = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const item: any = { __row: rowNumber };
        headers.forEach((h, i) => {
          const cell = row.getCell(i + 1).value;
          if (cell === null || cell === undefined) {
            item[h] = null;
          } else if (typeof cell === 'object' && 'text' in cell) {
            item[h] = cell.text;
          } else {
            item[h] = cell;
          }
        });
        rows.push(item);
      });
      return rows;
    }
    throw new Error('Format file tidak didukung');
  }
}

export const helper = new Helper();
