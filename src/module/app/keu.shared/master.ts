import { Model, ModelStatic, Transaction } from 'sequelize';
import Rekap from '../keu.rekap.harian/keu.rekap.harian.model';
import Target from '../keu.target/keu.target.model';
import Anggaran from '../keu.anggaran/keu.anggaran.model';
import { OperationalError } from './operasional';

export async function validateAccountChange(
  previous: any,
  data: any,
  transaction?: Transaction
) {
  if (!previous) return;
  if (data.kode_akun !== undefined && data.kode_akun !== previous.kode_akun)
    throw new OperationalError(
      'Kode akun tidak boleh diubah; buat akun baru jika maknanya berubah'
    );
  if (
    data.id_kelompok_kas !== undefined &&
    data.id_kelompok_kas !== previous.id_kelompok_kas
  ) {
    const options = { where: { id_akun: previous.id_akun }, transaction };
    if (
      (await Rekap.findOne(options)) ||
      (await Target.findOne(options)) ||
      (await Anggaran.findOne(options))
    )
      throw new OperationalError(
        'Akun yang telah digunakan tidak boleh dipindahkan kelompoknya'
      );
  }
}

export async function saveMaster(
  model: ModelStatic<Model>,
  code: string,
  payload: any,
  transaction: Transaction
) {
  const previous = await model.findOne({
    where: { [code]: payload[code] },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!previous) return model.create(payload, { transaction });
  if (code === 'kode_akun')
    await validateAccountChange(previous, payload, transaction);
  // Updating the found instance preserves its UUID, including for repeated master imports.
  return previous.update(payload, { transaction });
}
