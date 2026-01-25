import JenisPenilaianBobot from './jenis.penilaian.bobot.model';
import { Sequelize, Op, fn, col } from 'sequelize';
import { z, ZodError } from 'zod';

const bobotSchema = z.object({
  id_penilaian: z.string().nonempty('id_penilaian wajib diisi'),
  lembaga_type: z.enum(
    ['FORMAL', 'PESANTREN'],
    'lembaga_type wajib FORMAL/PESANTREN'
  ),
  id_lembaga: z.string().nonempty('id_lembaga wajib diisi'),
  id_tingkat: z.string().optional().nullable(),
  id_tahunajaran: z.string().nonempty('id_tahunajaran wajib diisi'),
  bobot: z
    .number()
    .min(0, 'bobot harus ≥ 0')
    .max(100, 'bobot tidak boleh > 100'),
  status: z.enum(['Aktif', 'Nonaktif']).optional(),
});

export const bulkBobotSchema = z
  .array(bobotSchema)
  .nonempty('Input minimal 1 data');

type TotalBobotParams = {
  id_penilaian: string;
  lembaga_type: string;
  id_lembaga: string;
  id_tingkat?: string | null | undefined;
  id_tahunajaran: string;
  status?: string | undefined;
  bobot: number;
};

export const updateExistingBobot = async ({
  lembaga_type,
  id_lembaga,
  id_tingkat,
  id_tahunajaran,
  bobot,
  id_penilaian,
  status = 'Aktif',
}: any): Promise<boolean> => {
  const whereCondition: any = {
    lembaga_type,
    id_lembaga,
    id_tahunajaran,
    status,
    id_tingkat: id_tingkat ?? { [Op.is]: null },
  };
  const existing = await JenisPenilaianBobot.findOne({
    where: { ...whereCondition, id_penilaian },
  });

  if (existing) {
    await existing.update({ bobot });
    return true;
  }

  return false;
};

export const getTotalBobot = async ({
  lembaga_type,
  id_lembaga,
  id_tingkat,
  id_tahunajaran,
  bobot,
  id_penilaian,
  status = 'Aktif',
}: TotalBobotParams): Promise<number> => {
  const whereCondition: any = {
    lembaga_type,
    id_lembaga,
    id_tahunajaran,
    status,
  };
  if (id_tingkat) whereCondition.id_tingkat = id_tingkat;
  else whereCondition.id_tingkat = { [Op.is]: null };

  const existing = await JenisPenilaianBobot.findOne({
    where: { ...whereCondition, id_penilaian },
  });

  if (existing) {
    await existing.update({ bobot });
  }

  const result = await JenisPenilaianBobot.findOne({
    attributes: [[fn('COALESCE', fn('SUM', col('bobot')), 0), 'total_bobot']],
    where: whereCondition,
    raw: true,
  });

  return Number(result?.total_bobot || 0);
};

export const validateBobot = async (
  payload: any[],
  onlySchema: boolean = false
) => {
  // Validasi schema
  let parsed;

  try {
    // Validasi schema dengan Zod
    parsed = bulkBobotSchema.safeParse(payload);

    if (!parsed.success) {
      // Ambil detail error dari Zod tanpa parse JSON
      const messages = parsed.error.issues.map((e) => {
        const index = e.path?.[0] ?? '?';
        const field = e.path?.[1] ?? '?';
        return `Item ke-${String(index)} Field ${String(field)}: ${e.message}`;
      });

      throw new Error(`Validasi schema gagal: ${messages.join(', ')}`);
    }

    if (onlySchema) return;

    // Validasi total bobot per kombinasi
    for (const item of parsed.data) {
      const totalDB = await getTotalBobot(item);
      const totalAfterInput = totalDB + Number(item.bobot);

      if (totalAfterInput > 100) {
        throw new Error(
          `Total bobot melebihi 100 untuk kombinasi lembaga_type=${item.lembaga_type}, id_lembaga=${item.id_lembaga}, id_tingkat=${item.id_tingkat}, id_tahunajaran=${item.id_tahunajaran}`
        );
      }
    }
  } catch (err: any) {
    // Tangani semua error lain (misal dari DB)
    throw new Error(err.message || 'Terjadi kesalahan saat validasi');
  }

  return true;
};
