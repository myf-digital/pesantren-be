import { z } from 'zod';
import { cents } from '../keu.shared/operasional';
import { nominalSchema } from '../keu.rekap.harian/keu.rekap.harian.schema';

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus YYYY-MM-DD')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, 'Tanggal tidak valid');
const referenceValue = (value: any) =>
  value && typeof value === 'object' ? value.value : value;
const nonnegativeNominal = nominalSchema.refine(
  (value) => !value.startsWith('-') || /^-0+\.00$/.test(value),
  'Nominal harus >= 0'
);
const statusSumber = z.enum(['Diajukan', 'Disetujui', 'Realisasi', 'Ditolak']);
const nominalFields = z.object({
  status_sumber: z.string().trim().pipe(statusSumber),
  nilai_diajukan: nominalSchema.refine(
    (value) => !value.startsWith('-') && /[1-9]/.test(value),
    'Nilai diajukan harus lebih besar dari 0'
  ),
  nilai_disetujui: nonnegativeNominal.nullable().optional(),
  nilai_realisasi: nonnegativeNominal.nullable().optional(),
});

function validateNominals(
  data: z.infer<typeof nominalFields>,
  ctx: z.RefinementCtx
) {
  if (ctx.issues.length) return;
  const diajukan = cents(data.nilai_diajukan);
  const disetujui = cents(data.nilai_disetujui ?? '0.00');
  const realisasi = cents(data.nilai_realisasi ?? '0.00');
  const hasApproval =
    data.status_sumber === 'Disetujui' || data.status_sumber === 'Realisasi';
  const hasRealization = data.status_sumber === 'Realisasi';

  if (disetujui > diajukan || disetujui > 0n !== hasApproval)
    ctx.addIssue({
      code: 'custom',
      path: ['nilai_disetujui'],
      message: hasApproval
        ? 'Nilai disetujui harus lebih besar dari 0 dan tidak boleh melebihi nilai diajukan'
        : 'Nilai disetujui harus 0 atau kosong untuk status ini',
    });

  if (realisasi > disetujui || realisasi > 0n !== hasRealization)
    ctx.addIssue({
      code: 'custom',
      path: ['nilai_realisasi'],
      message: hasRealization
        ? 'Nilai realisasi harus lebih besar dari 0 dan tidak boleh melebihi nilai disetujui'
        : 'Nilai realisasi harus 0 atau kosong untuk status ini',
    });
}

export const keuAnggaranNominalSchema =
  nominalFields.superRefine(validateNominals);

const fields = nominalFields.extend({
  per_akun: z.boolean().optional(),
  kode_referensi_sumber: z.string().trim().max(150).nullable().optional(),
  nama_anggaran: z.string().trim().min(1, 'Nama Anggaran wajib diisi').max(200),
  periode_mulai: dateOnly,
  periode_selesai: dateOnly,
  id_akun: z
    .preprocess(
      (value: any) =>
        value === '' || value === null ? null : referenceValue(value),
      z.string().trim().min(1).max(255).nullable()
    )
    .optional(),
  id_batch: z
    .preprocess(
      referenceValue,
      z.string().trim().min(1, 'Batch wajib diisi').max(255)
    )
    .optional(),
  is_current: z.boolean(),
  keterangan: z.string().nullable().optional(),
});
export const keuAnggaranSchema = fields
  .extend({ is_current: z.boolean().default(true) })
  .superRefine(validateNominals)
  .refine(
    (data) => data.periode_mulai <= data.periode_selesai,
    'Periode mulai tidak boleh melebihi periode selesai'
  )
  .refine(
    (data) => !data.per_akun || !!data.id_akun,
    'Akun wajib untuk anggaran per akun'
  );
export const updateKeuAnggaranSchema = fields
  .partial()
  .refine(
    (data) =>
      !data.periode_mulai ||
      !data.periode_selesai ||
      data.periode_mulai <= data.periode_selesai,
    'Periode mulai tidak boleh melebihi periode selesai'
  );
