import { Op, Transaction, Model, ModelStatic } from 'sequelize';
import Kelompok from '../keu.kelompok.kas/keu.kelompok.kas.model';
import KeuAkun from '../keu.akun/keu.akun.model';
import Rekap from '../keu.rekap.harian/keu.rekap.harian.model';
import Anggaran from '../keu.anggaran/keu.anggaran.model';
import Target from '../keu.target/keu.target.model';
import Beasiswa from '../keu.beasiswa/keu.beasiswa.model';

export type JenisRekap = 'harian' | 'target' | 'beasiswa' | 'anggaran';
export const identity = (jenis: JenisRekap, data: any) => {
  if (jenis === 'anggaran')
    return {
      kode_referensi_sumber: data.kode_referensi_sumber,
      periode_mulai: data.periode_mulai,
      periode_selesai: data.periode_selesai,
      id_akun: data.id_akun || null,
    };
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
  if (jenis === 'harian' || jenis === 'target' || jenis === 'anggaran') {
    const akun = await KeuAkun.findByPk(data.id_akun);
    if (akun?.is_active === false) errors.push('Akun tidak aktif');
    if (akun?.id_kelompok_kas) {
      const kelompok = await Kelompok.findByPk(akun.id_kelompok_kas);
      if (kelompok?.is_active === false)
        errors.push('Kelompok kas tidak aktif');
    }
    if (
      jenis !== 'anggaran' &&
      akun?.is_periodik_tahun_ajaran &&
      !data.id_tahunajaran
    )
      errors.push('Tahun Ajaran wajib untuk akun periodik');
  }
  if (
    data.is_current !== false &&
    (jenis !== 'anggaran' || data.kode_referensi_sumber)
  ) {
    const model: ModelStatic<Model> =
      jenis === 'harian'
        ? Rekap
        : jenis === 'target'
          ? Target
          : jenis === 'anggaran'
            ? Anggaran
            : Beasiswa;
    const pk =
      jenis === 'harian'
        ? 'id_rekap'
        : jenis === 'target'
          ? 'id_target'
          : jenis === 'anggaran'
            ? 'id_anggaran'
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

export const cents = (value: string): bigint => {
  const negative = String(value).startsWith('-');
  const [whole, fraction = ''] = String(value).replace(/^-/, '').split('.');
  return (
    (negative ? BigInt(-1) : BigInt(1)) *
    (BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0')))
  );
};
export const decimal = (value: bigint) => {
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

// Every correction locks its predecessor and creates a separate version.
export async function saveFinancialVersion(
  model: ModelStatic<Model>,
  pk: string,
  payload: any,
  transaction: Transaction
) {
  const id = payload[pk];
  if (id) {
    const previous: any = await model.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!previous || !previous.is_current)
      throw new OperationalError(
        'Versi data tidak ditemukan atau sudah menjadi histori'
      );
    await previous.update({ is_current: false }, { transaction });
  }
  const data = { ...payload };
  for (const key of [pk, 'created_at', 'updated_at', 'per_akun'])
    delete data[key];
  return model.create(data, { transaction });
}

// Corrections can identify a source row by business identity, without exposing UUIDs in templates.
export async function prepareCorrection(
  jenis: JenisRekap,
  payload: any,
  action: string = 'tambah'
) {
  if (!['tambah', 'koreksi'].includes(action))
    throw new OperationalError('Aksi harus tambah atau koreksi');
  if (action !== 'koreksi') return payload;
  const model: ModelStatic<Model> =
    jenis === 'harian'
      ? Rekap
      : jenis === 'target'
        ? Target
        : jenis === 'anggaran'
          ? Anggaran
          : Beasiswa;
  const pk =
    jenis === 'harian'
      ? 'id_rekap'
      : jenis === 'target'
        ? 'id_target'
        : jenis === 'anggaran'
          ? 'id_anggaran'
          : 'id_rekap_beasiswa';
  if (payload[pk]) return payload;
  if (jenis === 'anggaran' && !payload.kode_referensi_sumber)
    throw new OperationalError(
      'Koreksi anggaran memerlukan kode referensi sumber'
    );
  const previous = await model.findOne({
    where: { ...identity(jenis, payload), is_current: true },
  });
  if (!previous)
    throw new OperationalError('Data current untuk koreksi tidak ditemukan');
  return { ...payload, [pk]: previous.get(pk) };
}
