import { NextFunction, Request, Response } from 'express';
import { Model, ModelStatic } from 'sequelize';
import Akun from '../keu.akun/keu.akun.model';
import Kelompok from '../keu.kelompok.kas/keu.kelompok.kas.model';
import Tahun from '../tahun.ajaran/tahun.ajaran.model';
import Santri from '../santri/santri.model';
import Beasiswa from '../jenis.beasiswa/jenis.beasiswa.model';
import { response } from '../../../helpers/response';
import { OperationalError } from './operasional';

// Business codes resolve before schema validation; names are never identifiers.
export async function resolveBusinessCodes(data: any) {
  const result = { ...data };
  const references: [string, string, ModelStatic<Model>, string][] = [
    ['kode_akun', 'id_akun', Akun, 'kode_akun'],
    ['kode_kelompok', 'id_kelompok_kas', Kelompok, 'kode_kelompok'],
    ['kode_beasiswa', 'id_jenis_beasiswa', Beasiswa, 'kode_beasiswa'],
    ['tahun_ajaran', 'id_tahunajaran', Tahun, 'tahun_ajaran'],
    ['nis', 'id_santri', Santri, 'nis'],
  ];
  for (const [code, id, model, field] of references) {
    if (result[code] === undefined) continue;
    const value = String(result[code] ?? '').trim();
    if (!value) throw new OperationalError(`${code} wajib diisi`);
    const matches = await model.findAll({
      where: { [field]: value },
      limit: 2,
    });
    if (matches.length !== 1)
      throw new OperationalError(`${code} tidak ditemukan atau tidak unik`);
    const resolved = matches[0].get(
      id === 'id_jenis_beasiswa' ? 'id_beasiswa' : id
    );
    const supplied = result[id]?.value ?? result[id];
    if (supplied && supplied !== resolved)
      throw new OperationalError(`${code} tidak cocok dengan ${id}`);
    if (
      (code === 'kode_akun' || code === 'kode_kelompok') &&
      matches[0].get('is_active') === false
    )
      throw new OperationalError(`${code} tidak aktif`);
    result[id] = resolved;
  }
  return result;
}

export const resolveFinancialInput = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accountMaster =
      req.path === '/keu-akun' || req.path.startsWith('/keu-akun/');
    const input = { ...req.body };
    if (accountMaster) delete input.kode_akun;
    req.body = { ...req.body, ...(await resolveBusinessCodes(input)) };
    next();
  } catch (error: any) {
    return response.failed(error.message, 400, res);
  }
};
