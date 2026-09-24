'use strict';

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import moment from 'moment';
import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import TelegramBot from 'tele-sender';
import { QueryTypes, Op } from 'sequelize';
import { Request, Response } from 'express';
import { response } from '../helpers/response';
import { appConfig } from '../config/config.app';
import { mailConfig } from '../config/config.mail';
import { parse as ParseCSV } from 'csv-parse/sync';
import { teleConfig } from '../config/config.telegram';
import { APP_NAME, MYSQL, POSTGRES, TIMEZONE } from '../utils/constant';
import AppResource from '../module/app/resource/resource.model';
import KesehatanSantri from '../module/app/kesehatan.santri/kesehatan.santri.model';
import ActivityLog from '../module/global/activity.log.model';
import JadwalPelajaran from '../module/app/jadwal.pelajaran/jadwal.pelajaran.model';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { service } from '../module/global/global.service';
import { rawQuery } from './rawQuery';
import { repository as notificationRepository } from '../module/app/notification/notification.repository';
import { repository as jadwalInspeksiKebersihanRepository } from '../module/app/jadwal.inspeksi.kebersihan/jadwal.inspeksi.kebersihan.repository';
import { repository as appResourceRepository } from '../module/app/resource/resource.repository';

const month: string = moment().tz(TIMEZONE).format('YYYY-MM');
const parseTimeToSeconds = (time: string): number => {
  if (!time) return 0;

  const normalized = time.replace(/\./g, ':');
  const parts = normalized.split(':').map(Number);

  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const s = parts[2] ?? 0;

  return h * 3600 + m * 60 + s;
};

interface NotificationPayload {
  title: string;
  message: string;
  url: string;
  receiver: string[];
  type: string;
}
export default class Helper {
  public date() {
    return moment().tz(TIMEZONE).locale('id').format('YYYY-MM-DD HH:mm:ss');
  }

  public dateFormat(date: string) {
    return moment(date).locale('id').format('YYYY-MM-DD HH:mm:ss');
  }

  public dateForNumber() {
    return moment().tz(TIMEZONE).locale('id').format('DDMMYYYY');
  }

  public getHari(tanggal: string): string {
    const hariList = [
      'Ahad',
      'Senin',
      'Selasa',
      'Rabu',
      'Kamis',
      'Jumat',
      'Sabtu',
    ];
    return hariList[moment(tanggal).day()];
  }

  public async findJadwalPelajaran(data: {
    id_kelas: string;
    id_jam_pelajaran: string;
    tanggal: string;
  }) {
    const hari = this.getHari(data.tanggal);
    return await JadwalPelajaran.findOne({
      where: {
        id_kelas: data.id_kelas,
        id_jam_pelajaran: data.id_jam_pelajaran,
        hari,
      },
    });
  }

  public dateAdd(num: number, type: any) {
    return moment()
      .tz(TIMEZONE)
      .add(num, type)
      .locale('id')
      .format('YYYY-MM-DD HH:mm:ss');
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
        ((typeof data[i] === 'boolean' ? true : data[i]) &&
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
    if (
      type == 'all' &&
      Object.values(allowedExt).flat().includes(ext.toLocaleLowerCase())
    )
      return 'allowed';
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
    const month: string = moment().tz(TIMEZONE).format('YYYY-MM');
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
    return response.failed(message, code, res);
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
          { type: QueryTypes.UPDATE }
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
      await this.sendNotif(`[cron] success update usia: ${result}`);
    } catch (err: any) {
      await this.sendNotif(`[cron] failed update usia: ${err?.message}`);
    }
  }

  public async updateSesiGuru() {
    try {
      let result: any;
      let affectedRows = 0;

      if (process.env.DB_DIALECT == POSTGRES) {
        result = await AppResource.sequelize?.query(
          `
          UPDATE jurnal_kelas jk
          SET jam_selesai = CASE
            WHEN jk.jam_mulai > jp.selesai THEN (jk.jam_mulai + INTERVAL '1 minute')::time
            ELSE jp.selesai
          END
          FROM jam_pelajaran jp
          WHERE jp.id_jampel = jk.id_jam_pelajaran
            AND jk.jam_selesai IS NULL
            AND (jp.selesai + INTERVAL '1 hour') < (NOW() AT TIME ZONE 'Asia/Jakarta')::time
          `,
          { type: QueryTypes.UPDATE }
        );
        affectedRows = result?.[1] ?? 0;
      }
      if (process.env.DB_DIALECT == MYSQL) {
        result = await AppResource.sequelize?.query(
          `
          UPDATE jurnal_kelas jk
          JOIN jam_pelajaran jp ON jp.id_jampel = jk.id_jam_pelajaran
          SET jk.jam_selesai = CASE
            WHEN jk.jam_mulai > jp.selesai THEN ADDTIME(jk.jam_mulai, '00:01:00')
            ELSE jp.selesai
          END
          WHERE jk.jam_selesai IS NULL
            AND ADDTIME(jp.selesai, '01:00:00') < TIME(CONVERT_TZ(NOW(), '+00:00', '+07:00'))
          `,
          {
            type: QueryTypes.UPDATE,
          }
        );
        affectedRows = result?.[0]?.affectedRows ?? 0;
      }
      if (affectedRows > 0) {
        await this.sendNotif(
          `[cron] success update jam selesai: ${affectedRows} baris`
        );
      }
    } catch (err: any) {
      await this.sendNotif(`[cron] failed update jam selesai: ${err?.message}`);
    }
  }

  public async reminderInspeksi() {
    try {
      const day: number =
        moment().tz(TIMEZONE).day() == 0 ? 7 : moment().tz(TIMEZONE).day();
      const jam: string = moment().tz(TIMEZONE).format('HH:mm');
      const result =
        await jadwalInspeksiKebersihanRepository.findAllByDayAndTime(day, jam);

      if (result.length < 1) return;

      for (const item of result) {
        const resource = await appResourceRepository.detail(
          { id_eksternal: item.id_petugas },
          ''
        );

        if (resource) {
          const dataMessage = {
            title: 'Jadwal Inspeksi Kebersihan',
            message: `${item.kode_slot} (${item.master_slot_waktu?.jam_mulai?.toString().slice(0, -3)} - ${item.master_slot_waktu?.jam_selesai?.toString().slice(0, -3)})`,
            url: `/app/kebersihan-inspeksi/form`,
            receiver: [resource.username],
            type: 'Inspeksi',
          };

          helper.sendNotification({} as Request, dataMessage);
        }
      }

      if (result.length > 0) {
        await this.sendNotif(
          `[cron] success reminder inspeksi: ${result.length} baris`
        );
      }
    } catch (err: any) {
      await this.sendNotif(`[cron] failed reminder inspeksi: ${err?.message}`);
    }
  }

  public async deleteOldActivityLogs() {
    try {
      const oneMonthAgo = moment().subtract(1, 'month').toDate();
      const deletedCount = await ActivityLog.destroy({
        where: {
          created_at: {
            [Op.lt]: oneMonthAgo,
          },
        },
      });
      if (deletedCount > 0) {
        await this.sendNotif(
          `[cron] success delete activity_logs (> 1 month old): ${deletedCount} baris`
        );
      }
    } catch (err: any) {
      await this.sendNotif(
        `[cron] failed delete activity_logs: ${err?.message}`
      );
    }
  }

  public async updateStatusKesehatanSantri() {
    try {
      let result: any;
      let affectedRows = 0;

      if (process.env.DB_DIALECT == POSTGRES) {
        result = await KesehatanSantri.sequelize?.query(
          `
          UPDATE kesehatan_santri
          SET progres_status = 'Selesai'
          WHERE is_deleted = false
            AND progres_status IN ('Dirawat', 'Dirujuk')
            AND tanggal_event IS NOT NULL
            AND (tanggal_event + (COALESCE(estimasi_hari, 0) * INTERVAL '1 day')) < NOW()
          `,
          { type: QueryTypes.UPDATE }
        );
        affectedRows = result?.[1] ?? 0;
      }

      if (process.env.DB_DIALECT == MYSQL) {
        result = await KesehatanSantri.sequelize?.query(
          `
          UPDATE kesehatan_santri
          SET progres_status = 'Selesai'
          WHERE is_deleted = false
            AND progres_status IN ('Dirawat', 'Dirujuk')
            AND tanggal_event IS NOT NULL
            AND DATE_ADD(tanggal_event, INTERVAL COALESCE(estimasi_hari, 0) DAY) < NOW()
          `,
          { type: QueryTypes.UPDATE }
        );
        affectedRows = result?.[0]?.affectedRows ?? 0;
      }

      if (affectedRows > 0) {
        await this.sendNotif(
          `[cron] success update status kesehatan santri: ${affectedRows} baris`
        );
      }
    } catch (err: any) {
      await this.sendNotif(
        `[cron] failed update status kesehatan santri: ${err?.message}`
      );
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
    const keyword: any = req?.query?.q || req?.query?.keyword;
    const id_pegawai: any = req?.query?.id_pegawai;
    const tanggal: any = req?.query?.tanggal;
    const tanggal_awal: any = req?.query?.tanggal_awal;
    const tanggal_akhir: any = req?.query?.tanggal_akhir;
    const id_lokasi: any = req?.query?.id_lokasi;

    return {
      limit: parseInt(limit),
      offset: parseInt(limit) * (parseInt(offset) - 1),
      keyword,
      tanggal,
      tanggal_awal,
      tanggal_akhir,
      id_pegawai,
      id_lokasi,
    };
  }

  public calDurationTime(start: string, end: string): number {
    if (!start || !end) return 0;

    const totalStart = parseTimeToSeconds(start);
    const totalEnd = parseTimeToSeconds(end);

    let duration = (totalEnd - totalStart) / 3600;

    if (duration < 0) duration += 24;

    return duration;
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

  public async parseImportFile(file: any, formatKey?: boolean) {
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
        const header = formatKey
          ? String(cell.value ?? '')
              .trim()
              .toLowerCase()
              .replace(/[\s/]+/g, '_')
          : String(cell.value ?? '').trim();
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

  public async uploadBase64(
    base64: string,
    filename: string,
    folder: string = '',
    username: string = 'system',
    type: string = 'local'
  ) {
    try {
      // hapus prefix kalau ada (data:image/png;base64,...)
      const matches = base64.match(/^data:(.+);base64,(.+)$/);
      let ext = 'png';
      let data = base64;

      if (matches) {
        const mimeType = matches[1];
        data = matches[2];
        ext = mimeType.split('/')[1];
      } else {
        const prefix = base64.substring(0, 15);
        if (prefix.startsWith('iVBORw0KGg')) {
          ext = 'png';
        } else if (prefix.startsWith('JVBERi')) {
          ext = 'pdf';
        } else if (prefix.startsWith('/9j/')) {
          ext = 'jpeg';
        } else if (prefix.startsWith('R0lGOD')) {
          ext = 'gif';
        } else if (prefix.startsWith('UEsDBB')) {
          ext = 'zip';
        }
      }

      const cleanFilename = filename.replace(/ /g, '');
      const finalName = `${Date.now()}_${cleanFilename}.${ext}`;

      const month = new Date().toISOString().slice(0, 7); // YYYY-MM
      const upload_path = `./public/uploads/${folder}/${month}`;

      if (!fs.existsSync(upload_path)) {
        fs.mkdirSync(upload_path, { recursive: true });
      }

      const filePath = path.join(upload_path, finalName);

      // decode base64 → buffer
      const buffer = Buffer.from(data, 'base64');

      // simpan file
      fs.writeFileSync(filePath, buffer);

      console.log(filePath, 'filePath');

      return filePath.replace('public', '');
    } catch (err: any) {
      console.warn(`upload ${type} error: ${err?.message}`);

      if (teleConfig?.token) {
        const telegram = new TelegramBot(teleConfig?.token);
        await telegram.send(teleConfig?.chatId, err?.message);
      }

      return err?.message;
    }
  }

  public isBase64(str: string): boolean {
    if (!str || typeof str !== 'string') return false;
    if (/^data:(image|file|application)\/[a-zA-Z0-9.+]+;base64,/.test(str)) {
      return true;
    }
    const prefix = str.substring(0, 15);
    if (
      prefix.startsWith('iVBORw0KGg') ||
      prefix.startsWith('JVBERi') ||
      prefix.startsWith('/9j/') ||
      prefix.startsWith('R0lGOD') ||
      prefix.startsWith('UEsDBB')
    ) {
      return true;
    }
    return false;
  }

  public checkExtentionBase64(base64: string, type: string = 'image') {
    if (!base64 || !this.isBase64(base64)) return 'file tidak valid';

    let mimeType = '';
    let data = '';
    let ext = '';

    const matches = base64.match(/^data:(.+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      data = matches[2];
      ext = mimeType.split('/')[1]?.toLowerCase();
    } else {
      data = base64;
      const prefix = base64.substring(0, 15);
      if (prefix.startsWith('iVBORw0KGg')) {
        ext = 'png';
      } else if (prefix.startsWith('JVBERi')) {
        ext = 'pdf';
      } else if (prefix.startsWith('/9j/')) {
        ext = 'jpeg';
      } else if (prefix.startsWith('R0lGOD')) {
        ext = 'gif';
      } else if (prefix.startsWith('UEsDBB')) {
        ext = 'zip';
      } else {
        ext = type === 'image' ? 'png' : 'pdf';
      }
    }

    const allowedExt: any = {
      image: ['jpg', 'jpeg', 'png', 'gif'],
      video: ['mp4', 'webm', 'avi', 'mkv', 'mov', 'flv', 'mts', 'wmv'],
      file: ['pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
    };

    // validasi ekstensi
    if (!allowedExt[type]?.includes(ext)) {
      return `file extension allowed *${allowedExt[type]?.join(', ')}.`;
    }

    // hitung size dari base64 (byte)
    const buffer = Buffer.from(data, 'base64');
    const size = buffer.length;

    // validasi size khusus image (2MB)
    if (type === 'image' && size > 2048000) {
      return 'file size maksimal *2MB.';
    }

    return 'allowed';
  }

  public generateTimestamp() {
    return Math.floor(Date.now() / 1000).toString();
  }

  public waliData(val: string, type: string = '') {
    const wali: any = {
      hubungan: ['Ayah', 'Ibu', 'Wali'],
      pendidikan: [
        'Tidak Sekolah',
        'SD / MI',
        'SMP / MTs',
        'SMA / MA',
        'SMK',
        'D1',
        'D2',
        'D3',
        'S1',
        'S2',
        'S3',
        'Lainnya',
      ],
      pekerjaan: [
        'Tidak Bekerja',
        'Ibu Rumah Tangga',
        'Petani',
        'Buruh Harian',
        'Nelayan',
        'Wiraswasta',
        'Pedagang',
        'Karyawan Swasta',
        'PNS',
        'TNI / POLRI',
        'Guru / Dosen',
        'Pekerja Migran',
        'Pensiunan',
        'Lainnya',
      ],
      penghasilan: [
        '< 1 juta',
        '1–2 juta',
        '2–3 juta',
        '3–5 juta',
        '> 5 juta',
        'Tidak berpenghasilan',
      ],
    };
    if (!type) return null;

    const w = wali[type] || null;
    if (w) {
      const r = w.find((wv: any) => wv == val);
      if (r) return val;
    }
    return null;
  }

  public async sendNotification(req: Request, data: NotificationPayload) {
    try {
      const q = `SELECT resource_id FROM app_resource WHERE username IN (:ids)`;
      const conn = await rawQuery.getConnection();
      const res: any = await conn.query(q, {
        type: QueryTypes.SELECT,
        replacements: {
          ids: data.receiver,
        },
      });

      if (res.length > 0) {
        let insert = [];
        for (const user of res) {
          insert.push({
            from: req.user?.id || '00000000-0000-0000-0000-000000000000',
            to: user.resource_id,
            title: data.title,
            type: data.type,
            url: data.url,
            message: data.message,
          });
        }

        await notificationRepository.insert(insert);
      }

      const result = await service.sendNotification(data);
      return result;
    } catch (err: any) {
      console.log(err);
    }
  }

  public async receiverByRole(roles: any[]) {
    const q = `SELECT username FROM app_resource WHERE role_id IN (SELECT role_id FROM app_role where role_name in (:ids))`;
    const conn = await rawQuery.getConnection();
    const res: any = await conn.query(q, {
      type: QueryTypes.SELECT,
      replacements: {
        ids: roles,
      },
    });

    return res.length > 0 ? res.map((r: any) => r.username) : [];
  }

  public convertToRomawi(month: number): string {
    const romawi = [
      'I',
      'II',
      'III',
      'IV',
      'V',
      'VI',
      'VII',
      'VIII',
      'IX',
      'X',
      'XI',
      'XII',
    ];
    return romawi[month - 1] || 'I';
  }
}

export const helper = new Helper();
