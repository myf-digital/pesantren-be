'use strict';

import { Request, Response } from 'express';
import { helper } from '../../../helpers/helper';
import { response } from '../../../helpers/response';
import { repository } from './jurnal.kelas.repository';
import { endJurnalKelasSchema } from './jurnal.kelas.schema';
import {
  NOT_FOUND,
  SUCCESS_RETRIEVED,
  SUCCESS_UPDATED,
  TIMEZONE,
} from '../../../utils/constant';
import moment from 'moment';
import { z } from 'zod';
import ExcelJS from 'exceljs';

const calculateDuration = (mulai: string, selesai: string | null) => {
  if (!selesai) return 'Aktif (Sedang Berjalan)';
  const start = moment(mulai, 'HH:mm:ss');
  const end = moment(selesai, 'HH:mm:ss');
  const diffMs = end.diff(start);
  const duration = moment.duration(diffMs);
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  const parts = [];
  if (hours > 0) parts.push(`${hours} jam`);
  if (minutes > 0) parts.push(`${minutes} menit`);
  if (seconds > 0 && hours === 0 && minutes === 0)
    parts.push(`${seconds} detik`);

  return parts.join(' ') || '0 menit';
};

const generateDataExcel = (sheet: any, details: any) => {
  sheet.addRow([
    'No',
    'Tanggal',
    'Lembaga',
    'Jam Pelajaran',
    'Kelas / Lokasi',
    'Guru / Petugas',
    'Hari',
    'Jam Mulai',
    'Jam Selesai',
    'Durasi Sesi',
    'Materi',
    'Catatan',
  ]);

  const columnWidths = [5, 15, 25, 20, 25, 30, 15, 15, 25, 40, 40];
  columnWidths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  sheet.getRow(1).eachCell((cell: any) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' },
    };
  });

  for (let i in details) {
    const row = details[i];
    const dataRow = row.toJSON ? row.toJSON() : row;
    const durasiText = calculateDuration(
      dataRow.jam_mulai,
      dataRow.jam_selesai
    );
    const namaLembaga =
      dataRow.kelasFormal?.lembaga?.nama_lembaga ||
      dataRow.kelasMda?.lembaga?.nama_lembaga ||
      '-';

    sheet.addRow([
      parseInt(i) + 1,
      dataRow.tanggal ? moment(dataRow.tanggal).format('YYYY-MM-DD') : '',
      namaLembaga,
      dataRow.jamPelajaran?.nama_jampel || '',
      dataRow.lokasi?.nama_lokasi || '',
      dataRow.petugas?.full_name || '',
      dataRow.jadwalPelajaran?.hari || '',
      dataRow.jam_mulai || '',
      dataRow.jam_selesai || '',
      durasiText,
      dataRow.materi || '',
      dataRow.catatan || '',
    ]);
  }

  const columnCount = sheet.columns.length;
  for (let row = 1; row <= (details?.length || 0) + 1; row++) {
    const currentRow = sheet.getRow(row);
    for (let col = 1; col <= columnCount; col++) {
      const cell = currentRow.getCell(col);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    }
  }

  return sheet;
};

export default class Controller {
  public async getActiveJurnal(req: Request, res: Response) {
    try {
      const { tanggal, id_lokasi, id_jam_pelajaran } = req.query;

      if (!tanggal || !id_lokasi || !id_jam_pelajaran) {
        return response.failed(
          'Parameter tanggal, id_lokasi, dan id_jam_pelajaran wajib diisi.',
          400,
          res
        );
      }

      const id_petugas = req.user?.id;
      const activeJurnal = await repository.findActiveJurnal({
        id_petugas,
        tanggal: tanggal as string,
        id_lokasi: id_lokasi as string,
        id_jam_pelajaran: id_jam_pelajaran as string,
      });

      if (!activeJurnal) {
        return response.success(NOT_FOUND, null, res, false);
      }

      return response.success(SUCCESS_RETRIEVED, activeJurnal, res);
    } catch (error: any) {
      return helper.catchError(
        `getActiveJurnal error: ${error.message}`,
        500,
        res
      );
    }
  }

  public async endJurnal(req: Request, res: Response) {
    try {
      const validBody = endJurnalKelasSchema.parse(req.body);
      const id_petugas = req.user?.id;
      const jam_selesai = moment().tz(TIMEZONE).format('HH:mm:ss');

      const updated = await repository.endJurnal(
        validBody.id_jurnal,
        id_petugas,
        {
          materi: validBody.materi || null,
          catatan: validBody.catatan || null,
          jam_selesai,
        }
      );

      if (!updated) {
        return response.failed(
          'Sesi kelas tidak ditemukan atau Anda tidak memiliki akses untuk mengakhiri kelas ini.',
          404,
          res
        );
      }

      return response.success(SUCCESS_UPDATED, updated, res);
    } catch (error: any) {
      const msg =
        error instanceof z.ZodError
          ? `Gagal Validasi: ${error.issues.map((i) => i.message).join(', ')}`
          : error.message;
      return helper.catchError(msg, 400, res);
    }
  }

  public async index(req: Request, res: Response) {
    try {
      const query = helper.fetchQueryRequest(req);
      const filterData = {
        ...query,
        tanggal: req.query.tanggal,
        id_lokasi: req.query.id_lokasi,
        id_jam_pelajaran: req.query.id_jam_pelajaran,
        id_petugas: req.query.id_petugas,
        tanggal_awal: req.query.tanggal_awal,
        tanggal_akhir: req.query.tanggal_akhir,
        id_lembaga: req.query.id_lembaga,
      };

      const { count, rows } = await repository.index(filterData);
      if (rows?.length < 1) {
        return response.success(NOT_FOUND, null, res, false);
      }

      return response.success(
        SUCCESS_RETRIEVED,
        { total: count, values: rows },
        res
      );
    } catch (error: any) {
      return helper.catchError(
        `JurnalKelas index error: ${error.message}`,
        500,
        res
      );
    }
  }

  public async export(req: Request, res: Response) {
    try {
      const {
        q,
        keyword,
        id_lokasi,
        id_jam_pelajaran,
        id_petugas,
        tanggal_awal,
        tanggal_akhir,
        id_lembaga,
      } = req.body;

      const filterData = {
        keyword: keyword || q,
        id_lokasi,
        id_jam_pelajaran,
        id_petugas,
        tanggal_awal,
        tanggal_akhir,
        id_lembaga,
      };

      const { rows } = await repository.index(filterData);

      const { dir, path } = await helper.checkDirExport('excel');
      const filename = `jurnal-kelas-${moment().tz(TIMEZONE).format('DDMMYYYY-HHmmss')}.xlsx`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('LAPORAN JURNAL KELAS');

      generateDataExcel(sheet, rows);
      await workbook.xlsx.writeFile(`${path}/${filename}`);

      return response.success(
        'export excel jurnal kelas',
        `${dir}/${filename}`,
        res
      );
    } catch (err: any) {
      console.log(err);
      return helper.catchError(
        `export excel jurnal kelas: ${err?.message}`,
        500,
        res
      );
    }
  }
}

export const JurnalKelasController = new Controller();
