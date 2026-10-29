import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { z } from 'zod';
import Daily from '../keu.rekap.harian/keu.rekap.harian.model';
import Target from '../keu.target/keu.target.model';
import Budget from '../keu.anggaran/keu.anggaran.model';
import Scholarship from '../keu.beasiswa/keu.beasiswa.model';
import Tahun from '../tahun.ajaran/tahun.ajaran.model';
import { response } from '../../../helpers/response';
import { cents, decimal } from './operasional';

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  });
const filters = z
  .object({
    tanggal_awal: date.optional(),
    tanggal_akhir: date.optional(),
    id_akun: z.string().min(1).optional(),
    id_tahunajaran: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      !value.tanggal_awal ||
      !value.tanggal_akhir ||
      value.tanggal_awal <= value.tanggal_akhir,
    'Periode tidak valid'
  );
const total = (rows: any[], field: string) =>
  decimal(
    rows.reduce(
      (sum, row) => sum + (row[field] == null ? BigInt(0) : cents(row[field])),
      BigInt(0)
    )
  );

export function dailySummary(rows: any[]) {
  const latest = new Map<string, any>();
  for (const row of rows) {
    const key = JSON.stringify([row.id_akun, row.id_tahunajaran || null]);
    if (!latest.has(key) || latest.get(key).tanggal < row.tanggal)
      latest.set(key, row);
  }
  const dates = rows.map((row) => row.tanggal).sort();
  return {
    jumlah_baris: rows.length,
    periode_tersedia: {
      awal: dates[0] || null,
      akhir: dates[dates.length - 1] || null,
    },
    histori_lengkap: null,
    catatan:
      'Hanya tanggal yang tersedia dari sumber; rentang tanggal tidak menjamin histori lengkap.',
    masuk: total(rows, 'masuk'),
    keluar: total(rows, 'keluar'),
    posisi_terakhir: [...latest.values()].map((row) => ({
      id_akun: row.id_akun,
      id_tahunajaran: row.id_tahunajaran,
      tanggal: row.tanggal,
      saldo_akhir: row.saldo_akhir,
    })),
  };
}

export const financialSummary =
  (jenis: 'harian' | 'target' | 'anggaran' | 'beasiswa') =>
  async (req: Request, res: Response) => {
    const parsed = filters.safeParse(req.query);
    if (!parsed.success)
      return response.failed(parsed.error.issues[0].message, 400, res);
    const filter = parsed.data;
    const where: any = { is_current: true };
    if (filter.id_akun && jenis !== 'beasiswa') where.id_akun = filter.id_akun;
    if (filter.id_tahunajaran && jenis !== 'anggaran')
      where.id_tahunajaran = filter.id_tahunajaran;
    const dateWhere = {
      ...(filter.tanggal_awal ? { [Op.gte]: filter.tanggal_awal } : {}),
      ...(filter.tanggal_akhir ? { [Op.lte]: filter.tanggal_akhir } : {}),
    };
    if (jenis === 'harian' || jenis === 'beasiswa') {
      if (filter.tanggal_awal || filter.tanggal_akhir)
        where[jenis === 'harian' ? 'tanggal' : 'tanggal_data'] = dateWhere;
    } else {
      if (filter.tanggal_awal)
        where.periode_selesai = { [Op.gte]: filter.tanggal_awal };
      if (filter.tanggal_akhir)
        where.periode_mulai = { [Op.lte]: filter.tanggal_akhir };
    }
    try {
      if (jenis === 'harian') {
        const rows = await Daily.findAll({ where, raw: true });
        return response.success(
          'Ringkasan rekap harian',
          dailySummary(rows),
          res
        );
      }
      if (jenis === 'target') {
        const rows = await Target.findAll({ where, raw: true });
        const values = [];
        for (const row of rows) {
          const indicator =
            row.jenis_target === 'Penerimaan'
              ? 'masuk'
              : row.jenis_target === 'Pengeluaran'
                ? 'keluar'
                : null;
          const dailyRows = indicator
            ? await Daily.findAll({
                where: {
                  is_current: true,
                  id_akun: row.id_akun,
                  ...(row.id_tahunajaran
                    ? { id_tahunajaran: row.id_tahunajaran }
                    : {}),
                  tanggal: {
                    [Op.between]: [row.periode_mulai, row.periode_selesai],
                  },
                },
                raw: true,
              })
            : [];
          // No inferred mapping for Anggaran/Lainnya: report unknown until a business indicator is defined.
          values.push({
            ...row,
            indikator_realisasi: indicator,
            realisasi:
              indicator && dailyRows.length
                ? total(dailyRows, indicator)
                : null,
          });
        }
        return response.success('Realisasi target', values, res);
      }
      const rows: any[] =
        jenis === 'anggaran'
          ? await Budget.findAll({ where, raw: true })
          : await Scholarship.findAll({ where, raw: true });
      const finalField =
        jenis === 'anggaran' ? 'nilai_disetujui' : 'nilai_ditetapkan';
      // Final and realized values are separate measures, never added together.
      return response.success(
        'Ringkasan keuangan',
        {
          jumlah_baris: rows.length,
          [finalField]: rows.length ? total(rows, finalField) : null,
          nilai_realisasi: rows.some((row) => row.nilai_realisasi != null)
            ? total(rows, 'nilai_realisasi')
            : null,
          jumlah_realisasi_tidak_diketahui: rows.filter(
            (row) => row.nilai_realisasi == null
          ).length,
        },
        res
      );
    } catch (error: any) {
      return response.failed(`Ringkasan keuangan: ${error.message}`, 500, res);
    }
  };

export async function financialFormOptions(_req: Request, res: Response) {
  try {
    const tahun = await Tahun.findAll({ order: [['nomor_urut', 'DESC']] });
    const active = tahun.filter((row) => row.status === 'Aktif');
    return response.success(
      'Pilihan tahun ajaran',
      {
        tahun_ajaran: tahun,
        id_tahunajaran_default:
          active.length === 1 ? active[0].id_tahunajaran : null,
      },
      res
    );
  } catch (error: any) {
    return response.failed(error.message, 500, res);
  }
}
