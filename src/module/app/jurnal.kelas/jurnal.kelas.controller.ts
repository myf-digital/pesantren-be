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

  public async getRekapGuru(req: Request, res: Response) {
    try {
      const query = helper.fetchQueryRequest(req);
      const filterData = {
        ...query,
        id_lembaga: req.query.id_lembaga,
        id_tahunajaran: req.query.id_tahunajaran,
        id_semester: req.query.id_semester,
        id_petugas: req.query.id_petugas,
        id_lokasi: req.query.id_lokasi,
        id_jam_pelajaran: req.query.id_jam_pelajaran,
        tanggal_awal: req.query.tanggal_awal,
        tanggal_akhir: req.query.tanggal_akhir,
        tanggal: req.query.tanggal,
        bulan: req.query.bulan,
        keyword: req.query.keyword || req.query.q,
      };

      const { count, rows, all, meta } = await repository.rekapGuru(filterData);

      const totalGuru = count || 0;
      const totalWajibHadir = (all || []).reduce(
        (sum: number, item: any) => sum + (item.wajib_hadir || 0),
        0
      );
      const totalSakit = (all || []).reduce(
        (sum: number, item: any) => sum + (item.sakit || 0),
        0
      );
      const totalIzin = (all || []).reduce(
        (sum: number, item: any) => sum + (item.izin || 0),
        0
      );
      const totalAlfa = (all || []).reduce(
        (sum: number, item: any) => sum + (item.alfa || 0),
        0
      );
      const totalAbsen = totalSakit + totalIzin + totalAlfa;
      const avgKehadiran =
        totalGuru > 0
          ? Math.round(
              ((all || []).reduce(
                (sum: number, item: any) => sum + (item.kehadiran_persen || 0),
                0
              ) /
                totalGuru) *
                10
            ) / 10
          : 0;

      return response.success(
        SUCCESS_RETRIEVED,
        {
          total: count,
          values: rows,
          meta: meta || {},
          summary: {
            total_guru: totalGuru,
            total_wajib_hadir: totalWajibHadir,
            total_sakit: totalSakit,
            total_izin: totalIzin,
            total_alfa: totalAlfa,
            total_absen: totalAbsen,
            avg_kehadiran: avgKehadiran,
          },
        },
        res
      );
    } catch (error: any) {
      return helper.catchError(
        `JurnalKelas getRekapGuru error: ${error.message}`,
        500,
        res
      );
    }
  }

  public async exportRekapGuru(req: Request, res: Response) {
    try {
      const {
        q,
        keyword,
        id_lembaga,
        id_tahunajaran,
        id_semester,
        id_petugas,
        tanggal_awal,
        tanggal_akhir,
        bulan,
        nama_lembaga,
      } = req.body;

      const filterData = {
        keyword: keyword || q,
        id_lembaga,
        id_tahunajaran,
        id_semester,
        id_petugas,
        tanggal_awal,
        tanggal_akhir,
        bulan,
      };

      const { all, meta } = await repository.rekapGuru(filterData);

      const { dir, path } = await helper.checkDirExport('excel');
      const filename = `presentase-kehadiran-guru-${moment().tz(TIMEZONE).format('DDMMYYYY-HHmmss')}.xlsx`;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('KEHADIRAN GURU');

      const namaLembagaText = nama_lembaga || 'Semua Lembaga';
      const bulanText =
        meta?.bulanLabel ||
        moment(bulan || tanggal_awal || undefined)
          .locale('id')
          .format('MMMM YYYY');

      // Title
      sheet.mergeCells('A1:I1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'PRESENTASE KEHADIRAN GURU';
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      // Metadata Info
      sheet.getCell('B3').value = 'Lembaga :';
      sheet.getCell('B3').font = { bold: true };
      sheet.getCell('C3').value = namaLembagaText;

      sheet.getCell('B4').value = 'Bulan   :';
      sheet.getCell('B4').font = { bold: true };
      sheet.getCell('C4').value = bulanText;

      // Table Header on Row 6 & Row 7
      sheet.mergeCells('A6:A7');
      sheet.getCell('A6').value = 'No';

      sheet.mergeCells('B6:B7');
      sheet.getCell('B6').value = 'Nama Guru';

      sheet.mergeCells('C6:C7');
      sheet.getCell('C6').value = 'Wajib Hadir';

      sheet.mergeCells('D6:G6');
      sheet.getCell('D6').value = 'Absensi (Sesi)';

      sheet.getCell('D7').value = 'S';
      sheet.getCell('E7').value = 'I';
      sheet.getCell('F7').value = 'A';
      sheet.getCell('G7').value = 'Hadir';

      sheet.mergeCells('H6:H7');
      sheet.getCell('H6').value = 'Total Jam';

      sheet.mergeCells('I6:I7');
      sheet.getCell('I6').value = 'Kehadiran %';

      [6, 7].forEach((rowNum) => {
        const row = sheet.getRow(rowNum);
        row.eachCell({ includeEmpty: true }, (cell: any) => {
          cell.font = { bold: true };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
      });

      // Data Rows
      (all || []).forEach((row: any, idx: number) => {
        sheet.addRow([
          idx + 1,
          row.nama || row.nama_guru || '-',
          row.wajib_hadir || 0,
          row.sakit || 0,
          row.izin || 0,
          row.alfa || 0,
          row.hadir ?? row.total_hadir ?? 0,
          row.total_jam_label || (row.total_jam ? `${row.total_jam} Jam` : '0 Jam'),
          `${row.kehadiran_persen}%`,
        ]);
      });

      // Column widths
      sheet.getColumn(1).width = 6;
      sheet.getColumn(2).width = 34;
      sheet.getColumn(3).width = 14;
      sheet.getColumn(4).width = 8;
      sheet.getColumn(5).width = 8;
      sheet.getColumn(6).width = 8;
      sheet.getColumn(7).width = 10;
      sheet.getColumn(8).width = 20;
      sheet.getColumn(9).width = 16;

      const lastRow = 7 + (all?.length || 1);
      for (let r = 6; r <= lastRow; r++) {
        for (let col = 1; col <= 9; col++) {
          const cell = sheet.getRow(r).getCell(col);
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } },
          };
          if (r >= 8) {
            if (col === 2) {
              cell.alignment = { vertical: 'middle', horizontal: 'left' };
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
          }
        }
      }

      await workbook.xlsx.writeFile(`${path}/${filename}`);

      return response.success(
        'export excel presentase kehadiran guru',
        `${dir}/${filename}`,
        res
      );
    } catch (err: any) {
      return helper.catchError(
        `export excel presentase kehadiran guru: ${err?.message}`,
        500,
        res
      );
    }
  }
}

export const JurnalKelasController = new Controller();
