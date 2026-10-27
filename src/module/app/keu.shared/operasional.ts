import { Op, Transaction, Model, ModelStatic } from 'sequelize';
import KeuAkun from '../keu.akun/keu.akun.model';
import Rekap from '../keu.rekap.harian/keu.rekap.harian.model';
import Target from '../keu.target/keu.target.model';
import Beasiswa from '../keu.beasiswa/keu.beasiswa.model';

export type JenisRekap = 'harian' | 'target' | 'beasiswa';
export const identity = (jenis: JenisRekap, data: any) => {
  if (jenis === 'harian')
    return {
      tanggal: data.tanggal,
      id_akun: data.id_akun,
      id_tahunajaran: data.id_tahunajaran || null,
    };
  if (jenis === 'target')
    return {
      id_akun: data.id_akun,
      jenis_target: data.jenis_target,
      periode_mulai: data.periode_mulai,
      periode_selesai: data.periode_selesai,
    };
  return {
    cakupan_data:
      data.cakupan_data || (data.id_santri ? 'PerPenerima' : 'Agregat'),
    id_santri: data.id_santri || null,
    id_jenis_beasiswa: data.id_jenis_beasiswa,
    jenis_bantuan: data.jenis_bantuan,
    nama_program: data.nama_program || null,
    id_tahunajaran: data.id_tahunajaran,
    tanggal_data: data.tanggal_data,
  };
};
export const identityKey = (jenis: JenisRekap, data: any) =>
  JSON.stringify(identity(jenis, data));
export async function validateOperational(
  jenis: JenisRekap,
  data: any,
  excludeId?: string
) {
  const errors: string[] = [];
  if (jenis === 'harian' || jenis === 'target') {
    const akun = await KeuAkun.findByPk(data.id_akun);
    if (akun?.is_periodik_tahun_ajaran && !data.id_tahunajaran)
      errors.push('Tahun Ajaran wajib untuk akun periodik');
  }
  if (data.is_current !== false) {
    const model: ModelStatic<Model> =
      jenis === 'harian' ? Rekap : jenis === 'target' ? Target : Beasiswa;
    const pk =
      jenis === 'harian'
        ? 'id_rekap'
        : jenis === 'target'
          ? 'id_target'
          : 'id_rekap_beasiswa';
    const id = excludeId || data[pk];
    const duplicate = await model.findOne({
      where: {
        ...identity(jenis, data),
        is_current: true,
        ...(id ? { [pk]: { [Op.ne]: id } } : {}),
      },
    });
    if (duplicate)
      errors.push('Data aktif dengan kombinasi identitas yang sama sudah ada');
  }
  return errors;
}

// Corrections create a new UUID; the old row remains available as history.
export class OperationalError extends Error {}

export async function saveDailyVersion(
  payload: any,
  transaction: Transaction,
  previousId?: string
) {
  const id = previousId || payload.id_rekap;
  if (id) {
    const previous = await Rekap.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!previous || !previous.is_current)
      throw new OperationalError(
        'Versi rekap tidak ditemukan atau sudah menjadi histori'
      );
    await previous.update({ is_current: false }, { transaction });
  }
  const { id_rekap, created_at, updated_at, ...data } = payload;
  const warnings = reconcileDaily(data);
  if (warnings.length)
    data.keterangan = [
      data.keterangan,
      ...warnings.filter(
        (warning) => !String(data.keterangan || '').includes(warning)
      ),
    ]
      .filter(Boolean)
      .join('; ');
  const fields = [
    'tanggal',
    'id_akun',
    'id_tahunajaran',
    'saldo_awal',
    'masuk',
    'keluar',
    'saldo_akhir',
    'id_batch',
    'nomor_baris_sumber',
    'is_current',
    'keterangan',
  ];
  return Rekap.create(
    Object.fromEntries(
      fields
        .filter((key) => data[key] !== undefined)
        .map((key) => [key, data[key]])
    ),
    { transaction }
  );
}

const cents = (value: string): bigint => {
  const negative = String(value).startsWith('-');
  const [whole, fraction = ''] = String(value).replace(/^-/, '').split('.');
  return (
    (negative ? BigInt(-1) : BigInt(1)) *
    (BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0')))
  );
};
const decimal = (value: bigint) => {
  const amount = value < BigInt(0) ? -value : value;
  return `${value < BigInt(0) ? '-' : ''}${amount / BigInt(100)}.${String(amount % BigInt(100)).padStart(2, '0')}`;
};
export function reconcileDaily(data: any) {
  const expected =
    cents(data.saldo_awal) + cents(data.masuk) - cents(data.keluar);
  const difference = cents(data.saldo_akhir) - expected;
  return difference === BigInt(0)
    ? []
    : [
        `Saldo akhir sumber ${data.saldo_akhir} berbeda dari perhitungan ${decimal(expected)}; selisih ${decimal(difference)}`,
      ];
}
