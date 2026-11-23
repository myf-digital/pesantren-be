WITH
akun AS (
   SELECT
       a.id_akun, a.kode_akun, a.nama_akun, a.id_kelompok_kas,
       COALESCE(a.is_periodik_tahun_ajaran, FALSE) AS is_periodik_tahun_ajaran,
       a.urutan AS urutan_akun,
       kk.kode_kelompok, kk.nama_kelompok, kk.urutan AS urutan_kelompok
   FROM public.keu_akun a
   INNER JOIN public.keu_kelompok_kas kk
       ON kk.id_kelompok_kas = a.id_kelompok_kas
   WHERE COALESCE(a.is_active, TRUE) = TRUE
     AND COALESCE(kk.is_active, TRUE) = TRUE
),
tanggal_acuan AS (
   SELECT MAX(r.tanggal)::date AS tanggal_dashboard
   FROM public.keu_rekap_harian r
   WHERE COALESCE(r.is_current, TRUE) = TRUE
),
periode AS (
   SELECT
       t.tanggal_dashboard,
       date_trunc('month', t.tanggal_dashboard)::date AS awal_bulan,
       t.tanggal_dashboard AS akhir_bulan,
       (date_trunc('month', t.tanggal_dashboard) - INTERVAL '1 month')::date AS awal_bulan_lalu,
       LEAST(
           (date_trunc('month', t.tanggal_dashboard) - INTERVAL '1 month'
               + (t.tanggal_dashboard - date_trunc('month', t.tanggal_dashboard)))::date,
           (date_trunc('month', t.tanggal_dashboard) - INTERVAL '1 day')::date
       ) AS akhir_bulan_lalu,
       date_trunc('year', t.tanggal_dashboard)::date AS awal_tahun,
       (t.tanggal_dashboard - 6)::date AS awal_grafik
   FROM tanggal_acuan t
),
rekap AS (
   SELECT
       r.id_rekap, r.tanggal, r.id_akun, r.id_tahunajaran,
       r.saldo_awal, r.masuk, r.keluar, r.saldo_akhir,
       r.id_batch, r.nomor_baris_sumber, r.keterangan,
       r.created_at, r.updated_at
   FROM public.keu_rekap_harian r
   INNER JOIN akun a ON a.id_akun = r.id_akun
   CROSS JOIN periode p
   WHERE COALESCE(r.is_current, TRUE) = TRUE
     AND r.tanggal <= p.tanggal_dashboard
     AND (
           (a.is_periodik_tahun_ajaran IS TRUE AND r.id_tahunajaran IS NOT NULL)
        OR (a.is_periodik_tahun_ajaran IS FALSE AND r.id_tahunajaran IS NULL)
     )
),
-- --------------------------------------------------------------------------
-- A. MUTASI MTD DAN PEMBANDING BULAN LALU
mutasi_mtd AS (
   SELECT
       COALESCE(SUM(r.masuk), 0)::numeric(18,2) AS total_pemasukan_mtd,
       COALESCE(SUM(r.keluar), 0)::numeric(18,2) AS total_pengeluaran_mtd,
       COUNT(*)::bigint AS jumlah_baris_rekap_mtd,
       COUNT(DISTINCT r.id_akun)::bigint AS jumlah_akun_bermutasi
   FROM rekap r
   CROSS JOIN periode p
   WHERE r.tanggal BETWEEN p.awal_bulan AND p.akhir_bulan
),
mutasi_bulan_lalu AS (
   SELECT
       COALESCE(SUM(r.masuk), 0)::numeric(18,2) AS pemasukan_bulan_lalu,
       COALESCE(SUM(r.keluar), 0)::numeric(18,2) AS pengeluaran_bulan_lalu,
       COUNT(*)::bigint AS jumlah_baris_rekap_bulan_lalu
   FROM rekap r
   CROSS JOIN periode p
   WHERE r.tanggal BETWEEN p.awal_bulan_lalu AND p.akhir_bulan_lalu
),
kartu_mutasi AS (
   SELECT
       m.*,
       b.pemasukan_bulan_lalu,
       b.pengeluaran_bulan_lalu,
       b.jumlah_baris_rekap_bulan_lalu,
       (m.total_pemasukan_mtd - m.total_pengeluaran_mtd)::numeric(18,2) AS sisa_saldo_mtd,
       CASE WHEN b.pemasukan_bulan_lalu = 0 THEN NULL
            ELSE ROUND((m.total_pemasukan_mtd - b.pemasukan_bulan_lalu)
                       / b.pemasukan_bulan_lalu * 100, 2) END AS pertumbuhan_pemasukan_persen,
       CASE WHEN b.pengeluaran_bulan_lalu = 0 THEN NULL
            ELSE ROUND((m.total_pengeluaran_mtd - b.pengeluaran_bulan_lalu)
                       / b.pengeluaran_bulan_lalu * 100, 2) END AS pertumbuhan_pengeluaran_persen
   FROM mutasi_mtd m
   CROSS JOIN mutasi_bulan_lalu b
),
-- --------------------------------------------------------------------------
-- B. TARGET PENCAPAIAN (KUMULATIF SAMPAI SNAPSHOT)
-- Komponen 1: aktual seluruh akun / (target prorata + aktual tanpa target).
-- Komponen 2: aktual akun bertarget / target penuh dan target prorata.
-- Akun periodik dicocokkan dengan id_tahunajaran; nonperiodik berdasarkan akun.
-- Aktual hanya dihitung satu kali per baris rekap meskipun target bertumpang tindih.
target_aktif AS (
   SELECT
       t.id_target, t.nama_target, t.id_akun,
       t.id_tahunajaran AS id_tahunajaran_target,
       CASE WHEN a.is_periodik_tahun_ajaran IS TRUE
            THEN t.id_tahunajaran ELSE NULL END AS id_tahunajaran_scope,
       t.periode_mulai, t.periode_selesai, t.nilai_target,
       a.kode_akun, a.nama_akun,
       LEAST(t.periode_selesai, p.tanggal_dashboard) AS tanggal_akhir_hitung,
       GREATEST(
           (LEAST(t.periode_selesai, p.tanggal_dashboard) - t.periode_mulai + 1),
           0
       )::numeric AS hari_berjalan,
       (t.periode_selesai - t.periode_mulai + 1)::numeric AS hari_periode_target
   FROM public.keu_target t
   INNER JOIN akun a ON a.id_akun = t.id_akun
   CROSS JOIN periode p
   WHERE COALESCE(t.is_current, TRUE) = TRUE
     AND t.jenis_target = 'Penerimaan'
     AND t.periode_mulai <= p.tanggal_dashboard
     AND t.periode_selesai >= t.periode_mulai
     AND (
           a.is_periodik_tahun_ajaran IS FALSE
        OR (a.is_periodik_tahun_ajaran IS TRUE AND t.id_tahunajaran IS NOT NULL)
     )
),
parameter_pencapaian AS (
   SELECT COALESCE(MIN(ta.periode_mulai), p.awal_bulan) AS tanggal_mulai_laporan,
          p.tanggal_dashboard
   FROM periode p
   LEFT JOIN target_aktif ta ON TRUE
   GROUP BY p.tanggal_dashboard, p.awal_bulan
),
target_per_scope AS (
   SELECT
       ta.id_akun, ta.id_tahunajaran_scope AS id_tahunajaran,
       MIN(ta.kode_akun) AS kode_akun,
       MIN(ta.nama_akun) AS nama_akun,
       SUM(ta.nilai_target)::numeric(18,2) AS target_penuh,
       SUM(ta.nilai_target * ta.hari_berjalan
           / NULLIF(ta.hari_periode_target, 0))::numeric(18,2) AS target_prorata,
       COUNT(DISTINCT ta.id_target)::bigint AS jumlah_record_target,
       MIN(ta.periode_mulai) AS periode_mulai_terawal,
       MAX(ta.periode_selesai) AS periode_selesai_terakhir
   FROM target_aktif ta
   GROUP BY ta.id_akun, ta.id_tahunajaran_scope
),
aktual_per_scope_bert_target AS (
   SELECT
       r.id_akun, r.id_tahunajaran,
       SUM(r.masuk)::numeric(18,2) AS aktual_bert_target
   FROM rekap r
   CROSS JOIN parameter_pencapaian pp
   WHERE r.tanggal BETWEEN pp.tanggal_mulai_laporan AND pp.tanggal_dashboard
     AND r.masuk <> 0
     AND EXISTS (
         SELECT 1
         FROM target_aktif ta
         WHERE ta.id_akun = r.id_akun
           AND ta.id_tahunajaran_scope IS NOT DISTINCT FROM r.id_tahunajaran
           AND r.tanggal BETWEEN ta.periode_mulai AND ta.periode_selesai
     )
   GROUP BY r.id_akun, r.id_tahunajaran
),
target_scope_final AS (
   SELECT
       t.id_akun, t.id_tahunajaran, t.kode_akun, t.nama_akun,
       t.target_penuh, t.target_prorata,
       COALESCE(a.aktual_bert_target, 0)::numeric(18,2) AS aktual_bert_target,
       t.jumlah_record_target, t.periode_mulai_terawal,
       t.periode_selesai_terakhir
   FROM target_per_scope t
   LEFT JOIN aktual_per_scope_bert_target a
     ON a.id_akun = t.id_akun
    AND a.id_tahunajaran IS NOT DISTINCT FROM t.id_tahunajaran
),
aktual_tanpa_target AS (
   SELECT
       COALESCE(SUM(r.masuk), 0)::numeric(18,2) AS aktual_tanpa_target,
       COUNT(DISTINCT r.id_akun)::bigint AS jumlah_akun_tanpa_target,
       COUNT(*)::bigint AS jumlah_baris_tanpa_target
   FROM rekap r
   CROSS JOIN parameter_pencapaian pp
   WHERE r.tanggal BETWEEN pp.tanggal_mulai_laporan AND pp.tanggal_dashboard
     AND r.masuk <> 0
     AND NOT EXISTS (
         SELECT 1
         FROM target_aktif ta
         WHERE ta.id_akun = r.id_akun
           AND ta.id_tahunajaran_scope IS NOT DISTINCT FROM r.id_tahunajaran
           AND r.tanggal BETWEEN ta.periode_mulai AND ta.periode_selesai
     )
),
target_kpi AS (
   SELECT
       COALESCE(SUM(t.target_penuh), 0)::numeric(18,2) AS target_penuh_total,
       COALESCE(SUM(t.target_prorata), 0)::numeric(18,2) AS target_prorata_total,
       COALESCE(SUM(t.aktual_bert_target), 0)::numeric(18,2) AS aktual_akun_bert_target,
       COUNT(DISTINCT t.id_akun)::bigint AS jumlah_akun_bert_target,
       COUNT(*)::bigint AS jumlah_scope_target,
       CASE WHEN COALESCE(SUM(t.target_penuh), 0) = 0 THEN NULL
            ELSE ROUND(SUM(t.aktual_bert_target) / SUM(t.target_penuh) * 100, 2) END AS pencapaian_target_penuh,
       CASE WHEN COALESCE(SUM(t.target_prorata), 0) = 0 THEN NULL
            ELSE ROUND(SUM(t.aktual_bert_target) / SUM(t.target_prorata) * 100, 2) END AS pencapaian_target_prorata,
       (COALESCE(SUM(t.aktual_bert_target), 0) - COALESCE(SUM(t.target_penuh), 0))::numeric(18,2) AS selisih_target_penuh,
       (COALESCE(SUM(t.aktual_bert_target), 0) - COALESCE(SUM(t.target_prorata), 0))::numeric(18,2) AS selisih_target_prorata
   FROM target_scope_final t
),
pencapaian_gabungan AS (
   SELECT
       tk.target_penuh_total, tk.target_prorata_total,
       tk.aktual_akun_bert_target,
       at.aktual_tanpa_target,
       (tk.aktual_akun_bert_target + at.aktual_tanpa_target)::numeric(18,2) AS aktual_total,
       (tk.target_penuh_total + at.aktual_tanpa_target)::numeric(18,2) AS target_gabungan_penuh,
       (tk.target_prorata_total + at.aktual_tanpa_target)::numeric(18,2) AS target_gabungan_prorata,
       CASE WHEN tk.target_penuh_total + at.aktual_tanpa_target = 0 THEN NULL
            ELSE ROUND((tk.aktual_akun_bert_target + at.aktual_tanpa_target)
                / (tk.target_penuh_total + at.aktual_tanpa_target) * 100, 2) END AS pencapaian_gabungan_penuh,
       CASE WHEN tk.target_prorata_total + at.aktual_tanpa_target = 0 THEN NULL
            ELSE ROUND((tk.aktual_akun_bert_target + at.aktual_tanpa_target)
                / (tk.target_prorata_total + at.aktual_tanpa_target) * 100, 2) END AS pencapaian_gabungan_prorata
   FROM target_kpi tk
   CROSS JOIN aktual_tanpa_target at
),
target_detail_json AS (
   SELECT COALESCE(
       json_agg(json_build_object(
           'id_akun', t.id_akun,
           'kode_akun', t.kode_akun,
           'nama_akun', t.nama_akun,
           'id_tahunajaran_scope', t.id_tahunajaran,
           'periode_mulai', t.periode_mulai_terawal,
           'periode_selesai', t.periode_selesai_terakhir,
           'target_penuh', t.target_penuh,
           'target_prorata', t.target_prorata,
           'aktual', t.aktual_bert_target,
           'pencapaian_target_penuh_persen', CASE WHEN t.target_penuh = 0 THEN NULL
               ELSE ROUND(t.aktual_bert_target / t.target_penuh * 100, 2) END,
           'pencapaian_target_prorata_persen', CASE WHEN t.target_prorata = 0 THEN NULL
               ELSE ROUND(t.aktual_bert_target / t.target_prorata * 100, 2) END,
           'jumlah_record_target', t.jumlah_record_target
       ) ORDER BY t.kode_akun, t.id_tahunajaran), '[]'::json
   ) AS data
   FROM target_scope_final t
),
cakupan_target AS (
   SELECT
       COUNT(*)::bigint AS jumlah_akun_aktif,
       COUNT(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM target_per_scope t WHERE t.id_akun = a.id_akun
       ))::bigint AS jumlah_akun_aktif_bert_target,
       COUNT(*) FILTER (WHERE NOT EXISTS (
           SELECT 1 FROM target_per_scope t WHERE t.id_akun = a.id_akun
       ))::bigint AS jumlah_akun_aktif_tanpa_target
   FROM akun a
),
-- --------------------------------------------------------------------------
-- C. TOTAL SALDO REKAP: SNAPSHOT TERAKHIR PER AKUN + TAHUN AJARAN
saldo_snapshot AS (
   SELECT DISTINCT ON (r.id_akun, r.id_tahunajaran)
       r.id_akun, r.id_tahunajaran, r.tanggal,
       r.saldo_awal, r.saldo_akhir, r.id_rekap
   FROM rekap r
   ORDER BY r.id_akun, r.id_tahunajaran,
            r.tanggal DESC, r.updated_at DESC NULLS LAST,
            r.created_at DESC NULLS LAST, r.id_rekap DESC
),
saldo_total AS (
   SELECT
       COALESCE(SUM(s.saldo_akhir), 0)::numeric(18,2) AS total_saldo_rekap,
       COUNT(*)::bigint AS jumlah_pos_saldo,
       MAX(s.tanggal)::date AS tanggal_saldo_terakhir,
       COUNT(DISTINCT s.id_akun)::bigint AS jumlah_akun_memiliki_saldo
   FROM saldo_snapshot s
),
saldo_detail_json AS (
   SELECT COALESCE(json_agg(json_build_object(
       'id_akun', s.id_akun,
       'kode_akun', a.kode_akun,
       'nama_akun', a.nama_akun,
       'id_kelompok_kas', a.id_kelompok_kas,
       'nama_kelompok', a.nama_kelompok,
       'id_tahunajaran', s.id_tahunajaran,
       'tanggal_saldo', s.tanggal,
       'saldo_awal', s.saldo_awal,
       'saldo_akhir', s.saldo_akhir
   ) ORDER BY a.urutan_akun NULLS LAST, a.kode_akun, s.id_tahunajaran), '[]'::json) AS data
   FROM saldo_snapshot s
   INNER JOIN akun a ON a.id_akun = s.id_akun
),
-- --------------------------------------------------------------------------
-- D. PEMASUKAN PER HARI: 7 HARI SAMPAI TANGGAL DASHBOARD
tanggal_grafik AS (
   SELECT gs::date AS tanggal
   FROM periode p
   CROSS JOIN LATERAL generate_series(
       p.awal_grafik, p.tanggal_dashboard, INTERVAL '1 day'
   ) gs
),
pemasukan_harian AS (
   SELECT
       t.tanggal,
       COALESCE(SUM(r.masuk), 0)::numeric(18,2) AS total_pemasukan,
       COUNT(r.id_rekap)::bigint AS jumlah_baris_rekap,
       (COUNT(r.id_rekap) > 0) AS ada_data_rekap
   FROM tanggal_grafik t
   LEFT JOIN rekap r ON r.tanggal = t.tanggal
   GROUP BY t.tanggal
),
stat_harian AS (
   SELECT
       COALESCE(AVG(total_pemasukan) FILTER (WHERE ada_data_rekap), 0)::numeric(18,2)
           AS rata_rata_per_hari_terekap,
       COALESCE(AVG(total_pemasukan) FILTER (WHERE total_pemasukan > 0), 0)::numeric(18,2)
           AS rata_rata_hari_ada_pemasukan,
       COALESCE(MAX(total_pemasukan) FILTER (WHERE ada_data_rekap), 0)::numeric(18,2)
           AS tertinggi_hari_terekap,
       COALESCE(MIN(total_pemasukan) FILTER (WHERE ada_data_rekap AND total_pemasukan > 0), 0)::numeric(18,2)
           AS terendah_hari_ada_pemasukan,
       COUNT(*) FILTER (WHERE ada_data_rekap)::bigint AS hari_dengan_rekap,
       COUNT(*) FILTER (WHERE NOT ada_data_rekap)::bigint AS hari_tanpa_rekap,
       COUNT(*) FILTER (WHERE ada_data_rekap AND total_pemasukan > 0)::bigint AS hari_ada_pemasukan,
       COUNT(*) FILTER (WHERE ada_data_rekap AND total_pemasukan = 0)::bigint AS hari_rekap_tanpa_pemasukan
   FROM pemasukan_harian
),
harian_json AS (
   SELECT COALESCE(json_agg(json_build_object(
       'tanggal', h.tanggal,
       'total_pemasukan', h.total_pemasukan,
       'jumlah_baris_rekap', h.jumlah_baris_rekap,
       'ada_data_rekap', h.ada_data_rekap,
       'status_data', CASE WHEN h.ada_data_rekap THEN 'ADA_REKAP' ELSE 'BELUM_ADA_REKAP' END
   ) ORDER BY h.tanggal), '[]'::json) AS data
   FROM pemasukan_harian h
),
-- --------------------------------------------------------------------------
-- E. PENGELUARAN PER KELOMPOK KAS DAN AKUN (MTD, KELUAR > 0)
pengeluaran_akun AS (
   SELECT
       a.id_kelompok_kas, a.kode_kelompok, a.nama_kelompok,
       a.id_akun, a.kode_akun, a.nama_akun,
       SUM(r.keluar)::numeric(18,2) AS total_pengeluaran,
       COUNT(*)::bigint AS jumlah_baris_rekap
   FROM akun a
   INNER JOIN rekap r ON r.id_akun = a.id_akun
   CROSS JOIN periode p
   WHERE r.tanggal BETWEEN p.awal_bulan AND p.akhir_bulan
   GROUP BY a.id_kelompok_kas, a.kode_kelompok, a.nama_kelompok,
            a.id_akun, a.kode_akun, a.nama_akun
   HAVING SUM(r.keluar) > 0
),
pengeluaran_akun_pct AS (
   SELECT
       pa.*,
       CASE WHEN SUM(pa.total_pengeluaran) OVER (PARTITION BY pa.id_kelompok_kas) = 0 THEN 0
            ELSE ROUND(pa.total_pengeluaran
                       / SUM(pa.total_pengeluaran) OVER (PARTITION BY pa.id_kelompok_kas) * 100, 2)
       END AS persentase_dari_kelompok
   FROM pengeluaran_akun pa
),
pengeluaran_kelompok AS (
   SELECT
       pa.id_kelompok_kas, pa.kode_kelompok, pa.nama_kelompok,
       SUM(pa.total_pengeluaran)::numeric(18,2) AS total_pengeluaran,
       COUNT(*)::bigint AS jumlah_akun,
       json_agg(json_build_object(
           'id_akun', pa.id_akun,
           'kode_akun', pa.kode_akun,
           'nama_akun', pa.nama_akun,
           'total_pengeluaran', pa.total_pengeluaran,
           'jumlah_baris_rekap', pa.jumlah_baris_rekap,
           'persentase_dari_kelompok', pa.persentase_dari_kelompok
       ) ORDER BY pa.total_pengeluaran DESC, pa.kode_akun) AS data_akun
   FROM pengeluaran_akun_pct pa
   GROUP BY pa.id_kelompok_kas, pa.kode_kelompok, pa.nama_kelompok
),
pengeluaran_kelompok_pct AS (
   SELECT
       k.*,
       CASE WHEN SUM(k.total_pengeluaran) OVER () = 0 THEN 0
            ELSE ROUND(k.total_pengeluaran / SUM(k.total_pengeluaran) OVER () * 100, 2)
       END AS persentase_dari_total
   FROM pengeluaran_kelompok k
),
pengeluaran_json AS (
   SELECT
       COALESCE(SUM(k.total_pengeluaran), 0)::numeric(18,2) AS total_pengeluaran,
       COUNT(*)::bigint AS jumlah_kelompok,
       COALESCE(json_agg(json_build_object(
           'id_kelompok_kas', k.id_kelompok_kas,
           'kode_kelompok', k.kode_kelompok,
           'nama_kelompok', k.nama_kelompok,
           'total_pengeluaran', k.total_pengeluaran,
           'jumlah_akun', k.jumlah_akun,
           'persentase_dari_total', k.persentase_dari_total,
           'akun', k.data_akun
       ) ORDER BY k.total_pengeluaran DESC), '[]'::json) AS data_kelompok
   FROM pengeluaran_kelompok_pct k
),
-- --------------------------------------------------------------------------
-- F. MUTASI KAS TERBARU: 5 BARIS REKAP, BUKAN TRANSAKSI INDIVIDUAL
mutasi_kas_terbaru_json AS (
   SELECT
       COUNT(*)::bigint AS jumlah_baris_ditampilkan,
       COALESCE(json_agg(json_build_object(
           'id_rekap', x.id_rekap,
           'tanggal', x.tanggal,
           'id_akun', x.id_akun,
           'kode_akun', x.kode_akun,
           'nama_akun', x.nama_akun,
           'id_tahunajaran', x.id_tahunajaran,
           'saldo_awal', x.saldo_awal,
           'masuk', x.masuk,
           'keluar', x.keluar,
           'saldo_akhir', x.saldo_akhir,
           'nomor_baris_sumber', x.nomor_baris_sumber,
           'keterangan', x.keterangan,
           'id_batch', x.id_batch,
           'updated_at', x.updated_at
       ) ORDER BY x.updated_at DESC NULLS LAST, x.created_at DESC NULLS LAST, x.kode_akun, x.id_rekap), '[]'::json) AS data
   FROM (
       SELECT
           r.id_rekap, r.tanggal, r.id_akun,
           a.kode_akun, a.nama_akun, r.id_tahunajaran,
           r.saldo_awal, r.masuk, r.keluar, r.saldo_akhir,
           r.nomor_baris_sumber, r.keterangan, r.id_batch, r.created_at, r.updated_at
       FROM rekap r
       INNER JOIN akun a ON a.id_akun = r.id_akun
       CROSS JOIN periode p
       WHERE r.tanggal = p.tanggal_dashboard
       ORDER BY r.updated_at DESC NULLS LAST, r.created_at DESC NULLS LAST, a.kode_akun, r.id_rekap
       LIMIT 5
   ) x
),
mutasi_kas_semua_tanggal_terakhir_json AS (
   SELECT
       COUNT(*)::bigint AS jumlah_baris,
       COALESCE(json_agg(json_build_object(
           'id_rekap', r.id_rekap,
           'tanggal', r.tanggal,
           'id_akun', r.id_akun,
           'kode_akun', a.kode_akun,
           'nama_akun', a.nama_akun,
           'id_tahunajaran', r.id_tahunajaran,
           'saldo_awal', r.saldo_awal,
           'masuk', r.masuk,
           'keluar', r.keluar,
           'saldo_akhir', r.saldo_akhir,
           'nomor_baris_sumber', r.nomor_baris_sumber,
           'keterangan', r.keterangan,
           'id_batch', r.id_batch
       ) ORDER BY a.kode_akun, r.id_rekap), '[]'::json) AS data
   FROM rekap r
   INNER JOIN akun a ON a.id_akun = r.id_akun
   CROSS JOIN periode p
   WHERE r.tanggal = p.tanggal_dashboard
),
-- G. DETAIL PENGELUARAN: 
-- --------------------------------------------------------------------------
detail_pengeluaran_json AS (
   SELECT COALESCE(json_agg(json_build_object(
       'tanggal', r.tanggal,
       'id_kelompok_kas', a.id_kelompok_kas,
       'kode_kelompok', a.kode_kelompok,
       'nama_kelompok', a.nama_kelompok,
       'id_akun', a.id_akun,
       'kode_akun', a.kode_akun,
       'nama_akun', a.nama_akun,
       'id_tahunajaran', r.id_tahunajaran,
       'saldo_awal', r.saldo_awal,
       'masuk', r.masuk,
       'keluar', r.keluar,
       'saldo_akhir', r.saldo_akhir,
       'keterangan', r.keterangan,
       'nomor_baris_sumber', r.nomor_baris_sumber,
       'id_batch', r.id_batch,
       'id_rekap', r.id_rekap
   ) ORDER BY r.tanggal DESC, a.urutan_akun NULLS LAST, a.kode_akun, r.id_tahunajaran), '[]'::json) AS data,
   COUNT(*)::bigint AS jumlah_baris
   FROM rekap r
   INNER JOIN akun a ON a.id_akun = r.id_akun
   CROSS JOIN periode p
   WHERE r.tanggal BETWEEN p.awal_bulan AND p.akhir_bulan
     AND r.keluar > 0
),
-- --------------------------------------------------------------------------
-- H. REKONSILIASI MUTASI MTD: PER KELOMPOK, AKUN, DAN TAHUN AJARAN
rekonsiliasi_json AS (
   SELECT COALESCE(json_agg(json_build_object(
       'id_kelompok_kas', x.id_kelompok_kas,
       'kode_kelompok', x.kode_kelompok,
       'nama_kelompok', x.nama_kelompok,
       'id_akun', x.id_akun,
       'kode_akun', x.kode_akun,
       'nama_akun', x.nama_akun,
       'id_tahunajaran', x.id_tahunajaran,
       'total_pemasukan_mtd', x.total_pemasukan_mtd,
       'total_pengeluaran_mtd', x.total_pengeluaran_mtd,
       'sisa_saldo_mutasi_mtd', x.sisa_saldo_mutasi_mtd,
       'jumlah_baris_rekap', x.jumlah_baris_rekap
   ) ORDER BY x.urutan_kelompok NULLS LAST, x.urutan_akun NULLS LAST, x.kode_akun, x.id_tahunajaran), '[]'::json) AS data
   FROM (
       SELECT
           a.id_kelompok_kas, a.kode_kelompok, a.nama_kelompok,
           a.urutan_kelompok, a.id_akun, a.kode_akun, a.nama_akun,
           a.urutan_akun, r.id_tahunajaran,
           SUM(r.masuk)::numeric(18,2) AS total_pemasukan_mtd,
           SUM(r.keluar)::numeric(18,2) AS total_pengeluaran_mtd,
           SUM(r.masuk-r.keluar)::numeric(18,2) AS sisa_saldo_mutasi_mtd,
           COUNT(*)::bigint AS jumlah_baris_rekap
       FROM rekap r
       INNER JOIN akun a ON a.id_akun = r.id_akun
       CROSS JOIN periode p
       WHERE r.tanggal BETWEEN p.awal_bulan AND p.akhir_bulan
       GROUP BY a.id_kelompok_kas, a.kode_kelompok, a.nama_kelompok,
                a.urutan_kelompok, a.id_akun, a.kode_akun, a.nama_akun,
                a.urutan_akun, r.id_tahunajaran
   ) x
),
-- --------------------------------------------------------------------------
-- I. VALIDASI TAHUN AJARAN
validasi_tahun_ajaran AS (
   SELECT
       COUNT(*) FILTER (
           WHERE (a.is_periodik_tahun_ajaran IS TRUE AND r.id_tahunajaran IS NULL)
              OR (a.is_periodik_tahun_ajaran IS FALSE AND r.id_tahunajaran IS NOT NULL)
       )::bigint AS jumlah_baris_tidak_sesuai,
       COUNT(*)::bigint AS jumlah_rekap_current,
       COUNT(*) FILTER (WHERE r.tanggal = p.tanggal_dashboard)::bigint AS jumlah_baris_tanggal_terakhir
   FROM public.keu_rekap_harian r
   INNER JOIN akun a ON a.id_akun = r.id_akun
   CROSS JOIN periode p
   WHERE COALESCE(r.is_current, TRUE) = TRUE
)
,
-- --------------------------------------------------------------------------
-- J. TAHUN AJARAN AKTIF (UNTUK BEASISWA / KERINGANAN)
tahun_ajaran_aktif AS (
   SELECT id_tahunajaran, tahun_ajaran, nomor_urut
   FROM public.tahun_ajaran
   WHERE status = 'Aktif'
   ORDER BY nomor_urut DESC
   LIMIT 1
),
-- --------------------------------------------------------------------------
-- SESSION 4. ANGGARAN: 6 SUB-SESSION JUMLAH + NILAI
-- Menggunakan seluruh versi current; tanggal update terakhir ditampilkan terpisah.
-- Sisa per pengajuan = nilai_disetujui - nilai_realisasi.
anggaran_aktif AS (
   SELECT
       a.id_anggaran, a.nama_anggaran, a.kode_referensi_sumber,
       a.periode_mulai, a.periode_selesai, a.id_akun,
       a.nilai_diajukan, a.nilai_disetujui, a.nilai_realisasi,
       a.status_sumber, a.keterangan, a.created_at, a.updated_at
   FROM public.keu_anggaran a
   WHERE a.is_current IS TRUE
),
anggaran_metadata AS (
   SELECT
       MAX(COALESCE(a.updated_at, a.created_at)) AS waktu_update_terakhir,
       COUNT(*) FILTER (WHERE a.is_current IS TRUE)::bigint AS jumlah_record_current
   FROM public.keu_anggaran a
),
anggaran_kpi AS (
   SELECT
       -- 1. Total Pengajuan: semua status aktif/current.
       COUNT(*)::bigint AS total_pengajuan,
       COALESCE(SUM(nilai_diajukan),0)::numeric(18,2) AS total_nilai_diajukan,
       -- 2. Total Proses Pengajuan: status Diajukan.
       COUNT(*) FILTER (WHERE status_sumber = 'Diajukan')::bigint AS jumlah_proses_pengajuan,
       COALESCE(SUM(nilai_diajukan) FILTER (WHERE status_sumber = 'Diajukan'),0)::numeric(18,2)
           AS total_nilai_proses_pengajuan,
       -- 3. Total Disetujui: status Disetujui + Realisasi.
       COUNT(*) FILTER (WHERE status_sumber IN ('Disetujui','Realisasi'))::bigint AS jumlah_disetujui,
       COALESCE(SUM(nilai_disetujui) FILTER (WHERE status_sumber IN ('Disetujui','Realisasi')),0)::numeric(18,2)
           AS total_nilai_disetujui,
       -- 4. Total Direalisasi: status Realisasi.
       COUNT(*) FILTER (WHERE status_sumber = 'Realisasi')::bigint AS jumlah_direalisasi,
       COALESCE(SUM(nilai_realisasi) FILTER (WHERE status_sumber = 'Realisasi'),0)::numeric(18,2)
           AS total_nilai_realisasi,
       -- 5. Total Ditolak: nilai pengajuan pada status Ditolak.
       COUNT(*) FILTER (WHERE status_sumber = 'Ditolak')::bigint AS jumlah_ditolak,
       COALESCE(SUM(nilai_diajukan) FILTER (WHERE status_sumber = 'Ditolak'),0)::numeric(18,2)
           AS total_nilai_ditolak,
       -- 6. Total Sisa Anggaran:
       COUNT(*) FILTER (
           WHERE status_sumber IN ('Disetujui','Realisasi')
             AND COALESCE(nilai_disetujui,0) - COALESCE(nilai_realisasi,0) > 0
       )::bigint AS jumlah_sisa_anggaran,
       COALESCE(SUM(
           COALESCE(nilai_disetujui,0) - COALESCE(nilai_realisasi,0)
       ) FILTER (WHERE status_sumber IN ('Disetujui','Realisasi')),0)::numeric(18,2)
           AS total_sisa_anggaran
   FROM anggaran_aktif
),
anggaran_detail_json AS (
   SELECT COALESCE(json_agg(json_build_object(
       'id_anggaran', a.id_anggaran,
       'nama_anggaran', a.nama_anggaran,
       'kode_referensi_sumber', a.kode_referensi_sumber,
       'periode_mulai', a.periode_mulai,
       'periode_selesai', a.periode_selesai,
       'id_akun', a.id_akun,
       'nilai_diajukan', a.nilai_diajukan,
       'nilai_disetujui', a.nilai_disetujui,
       'nilai_realisasi', a.nilai_realisasi,
       'sisa_anggaran_disetujui', CASE WHEN a.status_sumber IN ('Disetujui','Realisasi')
           THEN COALESCE(a.nilai_disetujui,0)-COALESCE(a.nilai_realisasi,0) ELSE NULL END,
       'status_sumber', a.status_sumber,
       'keterangan', a.keterangan,
       'created_at', a.created_at,
       'updated_at', a.updated_at
   ) ORDER BY a.created_at DESC NULLS LAST, a.id_anggaran), '[]'::json) AS data
   FROM anggaran_aktif a
),
-- --------------------------------------------------------------------------
-- SESSION 5. BEASISWA (TA AKTIF, CURRENT)
-- Baris Agregat tidak dihitung sebagai jumlah penerima santri.
beasiswa_aktif AS (
   SELECT b.*
   FROM public.keu_beasiswa b
   INNER JOIN tahun_ajaran_aktif ta ON ta.id_tahunajaran = b.id_tahunajaran
   WHERE b.is_current IS TRUE
     AND b.jenis_bantuan = 'Beasiswa'
),
beasiswa_kpi AS (
   SELECT
       COUNT(*)::bigint AS jumlah_record,
       COUNT(*) FILTER (WHERE cakupan_data = 'PerPenerima')::bigint AS jumlah_record_per_penerima,
       COUNT(DISTINCT id_santri) FILTER (WHERE cakupan_data = 'PerPenerima' AND id_santri IS NOT NULL)::bigint AS jumlah_penerima_santri,
       COUNT(*) FILTER (WHERE cakupan_data = 'Agregat')::bigint AS jumlah_record_agregat,
       COUNT(*) FILTER (WHERE status_final = 'Diajukan')::bigint AS jumlah_diajukan,
       COUNT(*) FILTER (WHERE status_final = 'Disetujui')::bigint AS jumlah_disetujui,
       COUNT(*) FILTER (WHERE status_final = 'Direalisasi')::bigint AS jumlah_direalisasi,
       COUNT(*) FILTER (WHERE status_final = 'Ditolak')::bigint AS jumlah_ditolak,
       COUNT(*) FILTER (WHERE status_final = 'Dicabut')::bigint AS jumlah_dicabut,
       COUNT(*) FILTER (WHERE status_final = 'Selesai')::bigint AS jumlah_selesai,
       COALESCE(SUM(nilai_diajukan),0)::numeric(18,2) AS total_nilai_diajukan,
       COALESCE(SUM(nilai_ditetapkan),0)::numeric(18,2) AS total_nilai_ditetapkan,
       COALESCE(SUM(nilai_realisasi),0)::numeric(18,2) AS total_nilai_realisasi
   FROM beasiswa_aktif
),
beasiswa_tampilan_kpi AS (
   SELECT
       bk.*,
       bk.total_nilai_ditetapkan AS total_nilai_beasiswa_utama,
       COALESCE((
           SELECT SUM(b.nilai_ditetapkan)
           FROM beasiswa_aktif b
           WHERE b.cakupan_data = 'PerPenerima'
       ), 0)::numeric(18,2) AS total_nilai_ditetapkan_per_penerima,
       COALESCE((
           SELECT SUM(b.nilai_ditetapkan)
           FROM beasiswa_aktif b
           WHERE b.cakupan_data = 'Agregat'
       ), 0)::numeric(18,2) AS total_nilai_ditetapkan_agregat,
       CASE WHEN bk.jumlah_penerima_santri = 0 THEN 0::numeric(18,2)
            ELSE ROUND(COALESCE((
                SELECT SUM(b.nilai_ditetapkan)
                FROM beasiswa_aktif b
                WHERE b.cakupan_data = 'PerPenerima'
            ), 0) / bk.jumlah_penerima_santri, 2)
       END AS rata_rata_nilai_per_santri,
       (SELECT MAX(COALESCE(b.updated_at, b.created_at)) FROM beasiswa_aktif b)
           AS waktu_update_terakhir
   FROM beasiswa_kpi bk
),
beasiswa_detail_json AS (
   SELECT COALESCE(json_agg(json_build_object(
       'id_rekap_beasiswa', b.id_rekap_beasiswa,
       'id_tahunajaran', b.id_tahunajaran,
       'id_santri', b.id_santri,
       'fullname_santri', s.fullname,
       'nis_santri', s.nis,
       'id_jenis_beasiswa', b.id_jenis_beasiswa,
       'jenis_bantuan', b.jenis_bantuan,
       'nama_program', b.nama_program,
       'cakupan_data', b.cakupan_data,
       'status_final', b.status_final,
       'tanggal_data', b.tanggal_data,
       'nilai_diajukan', b.nilai_diajukan,
       'nilai_ditetapkan', b.nilai_ditetapkan,
       'nilai_realisasi', b.nilai_realisasi,
       'keterangan', b.keterangan
   ) ORDER BY b.tanggal_data DESC NULLS LAST, b.id_rekap_beasiswa), '[]'::json) AS data
   FROM beasiswa_aktif b
   LEFT JOIN public.santri s ON s.id_santri = b.id_santri
),
-- --------------------------------------------------------------------------
-- SESSION 6. KERINGANAN (TA AKTIF, CURRENT)
keringanan_aktif AS (
   SELECT b.*
   FROM public.keu_beasiswa b
   INNER JOIN tahun_ajaran_aktif ta ON ta.id_tahunajaran = b.id_tahunajaran
   WHERE b.is_current IS TRUE
     AND b.jenis_bantuan = 'Keringanan'
),
keringanan_kpi AS (
   SELECT
       COUNT(*)::bigint AS jumlah_record,
       COUNT(*) FILTER (WHERE cakupan_data = 'PerPenerima')::bigint AS jumlah_record_per_penerima,
       COUNT(DISTINCT id_santri) FILTER (WHERE cakupan_data = 'PerPenerima' AND id_santri IS NOT NULL)::bigint AS jumlah_penerima_santri,
       COUNT(*) FILTER (WHERE cakupan_data = 'Agregat')::bigint AS jumlah_record_agregat,
       COUNT(*) FILTER (WHERE status_final = 'Diajukan')::bigint AS jumlah_diajukan,
       COUNT(*) FILTER (WHERE status_final = 'Disetujui')::bigint AS jumlah_disetujui,
       COUNT(*) FILTER (WHERE status_final = 'Direalisasi')::bigint AS jumlah_direalisasi,
       COUNT(*) FILTER (WHERE status_final = 'Ditolak')::bigint AS jumlah_ditolak,
       COUNT(*) FILTER (WHERE status_final = 'Dicabut')::bigint AS jumlah_dicabut,
       COUNT(*) FILTER (WHERE status_final = 'Selesai')::bigint AS jumlah_selesai,
       COALESCE(SUM(nilai_diajukan),0)::numeric(18,2) AS total_nilai_diajukan,
       COALESCE(SUM(nilai_ditetapkan),0)::numeric(18,2) AS total_nilai_ditetapkan,
       COALESCE(SUM(nilai_realisasi),0)::numeric(18,2) AS total_nilai_realisasi
   FROM keringanan_aktif
),
keringanan_detail_json AS (
   SELECT COALESCE(json_agg(json_build_object(
       'id_rekap_beasiswa', b.id_rekap_beasiswa,
       'id_tahunajaran', b.id_tahunajaran,
       'id_santri', b.id_santri,
       'fullname_santri', s.fullname,
       'nis_santri', s.nis,
       'id_jenis_beasiswa', b.id_jenis_beasiswa,
       'jenis_bantuan', b.jenis_bantuan,
       'nama_program', b.nama_program,
       'cakupan_data', b.cakupan_data,
       'status_final', b.status_final,
       'tanggal_data', b.tanggal_data,
       'nilai_diajukan', b.nilai_diajukan,
       'nilai_ditetapkan', b.nilai_ditetapkan,
       'nilai_realisasi', b.nilai_realisasi,
       'keterangan', b.keterangan
   ) ORDER BY b.tanggal_data DESC NULLS LAST, b.id_rekap_beasiswa), '[]'::json) AS data
   FROM keringanan_aktif b
   LEFT JOIN public.santri s ON s.id_santri = b.id_santri
),
-- SESSION 6 : STATUS BEASISWA + KERINGANAN TAHUN AJARAN AKTIF
bantuan_gabungan_aktif AS (
   SELECT b.*
   FROM public.keu_beasiswa b
   INNER JOIN tahun_ajaran_aktif ta ON ta.id_tahunajaran = b.id_tahunajaran
   WHERE b.is_current IS TRUE
     AND b.jenis_bantuan IN ('Beasiswa', 'Keringanan')
),
bantuan_gabungan_kpi AS (
   SELECT
       COUNT(*)::bigint AS jumlah_total_pengajuan,
       COUNT(*) FILTER (WHERE status_final = 'Diajukan')::bigint AS jumlah_diajukan,
       COUNT(*) FILTER (WHERE status_final = 'Disetujui')::bigint AS jumlah_disetujui,
       COUNT(*) FILTER (WHERE status_final = 'Direalisasi')::bigint AS jumlah_direalisasi,
       COUNT(*) FILTER (WHERE status_final = 'Ditolak')::bigint AS jumlah_ditolak,
       COUNT(*) FILTER (WHERE status_final = 'Dicabut')::bigint AS jumlah_dicabut,
       COUNT(*) FILTER (WHERE status_final = 'Selesai')::bigint AS jumlah_selesai,
       COUNT(DISTINCT id_santri) FILTER (
           WHERE cakupan_data = 'PerPenerima' AND id_santri IS NOT NULL
       )::bigint AS jumlah_penerima_santri,
       COUNT(*) FILTER (WHERE cakupan_data = 'Agregat')::bigint AS jumlah_record_agregat,
       COALESCE(SUM(nilai_diajukan),0)::numeric(18,2) AS total_nilai_diajukan,
       COALESCE(SUM(nilai_ditetapkan),0)::numeric(18,2) AS total_nilai_ditetapkan,
       COALESCE(SUM(nilai_realisasi),0)::numeric(18,2) AS total_nilai_realisasi,
       COUNT(*) FILTER (WHERE jenis_bantuan = 'Beasiswa')::bigint AS jumlah_record_beasiswa,
       COUNT(*) FILTER (WHERE jenis_bantuan = 'Keringanan')::bigint AS jumlah_record_keringanan,
       MAX(COALESCE(updated_at, created_at)) AS waktu_update_terakhir
   FROM bantuan_gabungan_aktif
),
bantuan_gabungan_per_jenis AS (
   SELECT
       jenis_bantuan,
       COUNT(*)::bigint AS jumlah_pengajuan,
       COUNT(*) FILTER (WHERE status_final = 'Diajukan')::bigint AS jumlah_diajukan,
       COUNT(*) FILTER (WHERE status_final = 'Disetujui')::bigint AS jumlah_disetujui,
       COUNT(*) FILTER (WHERE status_final = 'Direalisasi')::bigint AS jumlah_direalisasi,
       COUNT(*) FILTER (WHERE status_final = 'Ditolak')::bigint AS jumlah_ditolak,
       COUNT(*) FILTER (WHERE status_final = 'Dicabut')::bigint AS jumlah_dicabut,
       COUNT(*) FILTER (WHERE status_final = 'Selesai')::bigint AS jumlah_selesai,
       COUNT(DISTINCT id_santri) FILTER (
           WHERE cakupan_data = 'PerPenerima' AND id_santri IS NOT NULL
       )::bigint AS jumlah_penerima_santri,
       COALESCE(SUM(nilai_diajukan),0)::numeric(18,2) AS total_nilai_diajukan,
       COALESCE(SUM(nilai_ditetapkan),0)::numeric(18,2) AS total_nilai_ditetapkan,
       COALESCE(SUM(nilai_realisasi),0)::numeric(18,2) AS total_nilai_realisasi
   FROM bantuan_gabungan_aktif
   GROUP BY jenis_bantuan
),
bantuan_gabungan_jenis_json AS (
   SELECT COALESCE(json_agg(json_build_object(
       'jenis_bantuan', j.jenis_bantuan,
       'jumlah_pengajuan', j.jumlah_pengajuan,
       'jumlah_diajukan', j.jumlah_diajukan,
       'jumlah_disetujui', j.jumlah_disetujui,
       'jumlah_direalisasi', j.jumlah_direalisasi,
       'jumlah_ditolak', j.jumlah_ditolak,
       'jumlah_dicabut', j.jumlah_dicabut,
       'jumlah_selesai', j.jumlah_selesai,
       'jumlah_penerima_santri', j.jumlah_penerima_santri,
       'total_nilai_diajukan', j.total_nilai_diajukan,
       'total_nilai_ditetapkan', j.total_nilai_ditetapkan,
       'total_nilai_realisasi', j.total_nilai_realisasi
   ) ORDER BY j.jenis_bantuan), '[]'::json) AS data
   FROM bantuan_gabungan_per_jenis j
),
bantuan_gabungan_detail_json AS (
   SELECT COALESCE(json_agg(json_build_object(
       'id_rekap_beasiswa', b.id_rekap_beasiswa,
       'id_tahunajaran', b.id_tahunajaran,
       'id_santri', b.id_santri,
       'fullname_santri', s.fullname,
       'nis_santri', s.nis,
       'id_jenis_beasiswa', b.id_jenis_beasiswa,
       'jenis_bantuan', b.jenis_bantuan,
       'nama_program', b.nama_program,
       'cakupan_data', b.cakupan_data,
       'status_final', b.status_final,
       'tanggal_data', b.tanggal_data,
       'nilai_diajukan', b.nilai_diajukan,
       'nilai_ditetapkan', b.nilai_ditetapkan,
       'nilai_realisasi', b.nilai_realisasi,
       'keterangan', b.keterangan,
       'created_at', b.created_at,
       'updated_at', b.updated_at
   ) ORDER BY b.tanggal_data DESC NULLS LAST, b.jenis_bantuan, b.id_rekap_beasiswa), '[]'::json) AS data
   FROM bantuan_gabungan_aktif b
   LEFT JOIN public.santri s ON s.id_santri = b.id_santri
),
-- --------------------------------------------------------------------------
-- SESSION 7. REKAP TRANSAKSI: MUTASI HARIAN PER AKUN
-- rekap MTD yang sudah difilter pada CTE rekap.
rekap_transaksi_kpi AS (
   SELECT
       COALESCE(SUM(r.masuk),0)::numeric(18,2) AS total_pemasukan_mtd,
       COALESCE(SUM(r.keluar),0)::numeric(18,2) AS total_pengeluaran_mtd,
       COALESCE(SUM(r.masuk-r.keluar),0)::numeric(18,2) AS selisih_mutasi_mtd,
       COUNT(*)::bigint AS jumlah_baris_rekap,
       COUNT(DISTINCT r.tanggal)::bigint AS jumlah_hari_terekap,
       COUNT(DISTINCT r.id_akun)::bigint AS jumlah_akun_terlibat
   FROM rekap r
   CROSS JOIN periode p
   WHERE r.tanggal BETWEEN p.awal_bulan AND p.akhir_bulan
),
rekap_transaksi_detail_json AS (
   SELECT COALESCE(json_agg(json_build_object(
       'tanggal', x.tanggal,
       'id_akun', x.id_akun,
       'kode_akun', x.kode_akun,
       'nama_akun', x.nama_akun,
       'id_tahunajaran', x.id_tahunajaran,
       'total_pemasukan', x.total_pemasukan,
       'total_pengeluaran', x.total_pengeluaran,
       'selisih_mutasi', x.selisih_mutasi,
       'jumlah_baris_rekap', x.jumlah_baris_rekap
   ) ORDER BY x.tanggal DESC, x.kode_akun, x.id_tahunajaran), '[]'::json) AS data
   FROM (
       SELECT
           r.tanggal, r.id_akun, a.kode_akun, a.nama_akun, r.id_tahunajaran,
           SUM(r.masuk)::numeric(18,2) AS total_pemasukan,
           SUM(r.keluar)::numeric(18,2) AS total_pengeluaran,
           SUM(r.masuk-r.keluar)::numeric(18,2) AS selisih_mutasi,
           COUNT(*)::bigint AS jumlah_baris_rekap
       FROM rekap r
       INNER JOIN akun a ON a.id_akun = r.id_akun
       CROSS JOIN periode p
       WHERE r.tanggal BETWEEN p.awal_bulan AND p.akhir_bulan
       GROUP BY r.tanggal, r.id_akun, a.kode_akun, a.nama_akun, r.id_tahunajaran
   ) x
)
SELECT
   2 AS level_summary,
   p.tanggal_dashboard,
   json_build_object(
       'tanggal_dashboard', p.tanggal_dashboard,
       'awal_bulan', p.awal_bulan,
       'akhir_bulan', p.akhir_bulan,
       'awal_pembanding', p.awal_bulan_lalu,
       'akhir_pembanding', p.akhir_bulan_lalu,
       'awal_tahun', p.awal_tahun,
       'awal_grafik', p.awal_grafik,
       'dasar_tanggal_dashboard', 'MAX(keu_rekap_harian.tanggal) WHERE is_current = TRUE',
       'tanggal_snapshot_keuangan', p.tanggal_dashboard
   ) AS parameter_dashboard,
   json_build_object(
       'tanggal_mulai_laporan', pp.tanggal_mulai_laporan,
       'tanggal_snapshot', pp.tanggal_dashboard,
       'komponen_1_pencapaian_gabungan', json_build_object(
           'target_gabungan_penuh', pg.target_gabungan_penuh,
           'target_gabungan_prorata', pg.target_gabungan_prorata,
           'aktual_total', pg.aktual_total,
           'aktual_akun_bert_target', pg.aktual_akun_bert_target,
           'aktual_akun_tanpa_target', pg.aktual_tanpa_target,
           'pencapaian_gabungan_target_penuh_persen', pg.pencapaian_gabungan_penuh,
           'pencapaian_gabungan_target_prorata_persen', pg.pencapaian_gabungan_prorata
       ),
       'komponen_2_pencapaian_akun_bert_target', json_build_object(
           'target_penuh', tk.target_penuh_total,
           'target_prorata', tk.target_prorata_total,
           'aktual', tk.aktual_akun_bert_target,
           'pencapaian_target_penuh_persen', tk.pencapaian_target_penuh,
           'pencapaian_target_prorata_persen', tk.pencapaian_target_prorata,
           'selisih_target_penuh', tk.selisih_target_penuh,
           'selisih_target_prorata', tk.selisih_target_prorata
       ),
       'jumlah_akun_bert_target', tk.jumlah_akun_bert_target,
       'jumlah_scope_target_akun_tahun_ajaran', tk.jumlah_scope_target,
       'jumlah_akun_aktif', ct.jumlah_akun_aktif,
       'jumlah_akun_aktif_bert_target', ct.jumlah_akun_aktif_bert_target,
       'persentase_cakupan_target', CASE WHEN ct.jumlah_akun_aktif = 0 THEN NULL
           ELSE ROUND(ct.jumlah_akun_aktif_bert_target::numeric / ct.jumlah_akun_aktif * 100, 2) END,
       'jumlah_akun_tanpa_target', at.jumlah_akun_tanpa_target,
       'jumlah_baris_tanpa_target', at.jumlah_baris_tanpa_target,
       'status_target', CASE WHEN tk.jumlah_scope_target = 0 THEN 'BELUM_ADA_TARGET'
           WHEN tk.target_penuh_total = 0 THEN 'TARGET_NOL_PERLU_DICEK'
           ELSE 'ADA_TARGET' END,
       'metode_prorata_target', 'Nilai target diprorata secara harian sejak periode_mulai sampai tanggal snapshot atau periode_selesai, mana yang lebih dahulu.',
       'metode_pencocokan_scope', 'Akun periodik dicocokkan berdasarkan id_akun dan id_tahunajaran; akun nonperiodik berdasarkan id_akun dengan scope tahun ajaran NULL.',
       'metode_aktual_tanpa_target', 'Aktual pemasukan yang pada tanggal rekapnya tidak memiliki target aktif yang cocok dengan akun dan scope.',
       'detail_per_akun_bert_target', td.data
   ) AS session_1_target_pencapaian,
   json_build_object(
       'total_pemasukan_mtd', km.total_pemasukan_mtd,
       'pertumbuhan_pemasukan_persen', km.pertumbuhan_pemasukan_persen,
       'pemasukan_bulan_lalu', km.pemasukan_bulan_lalu,
       'total_pengeluaran_mtd', km.total_pengeluaran_mtd,
       'pertumbuhan_pengeluaran_persen', km.pertumbuhan_pengeluaran_persen,
       'pengeluaran_bulan_lalu', km.pengeluaran_bulan_lalu,
       'sisa_saldo_mtd', km.sisa_saldo_mtd,
       'rumus_sisa_saldo', 'total_pemasukan_mtd - total_pengeluaran_mtd',
       'keterangan_sisa_saldo', 'Sisa saldo adalah selisih pemasukan dan pengeluaran selama periode bulan berjalan; bukan posisi saldo kas.',
       'total_saldo_rekap', st.total_saldo_rekap,
       'jumlah_pos_saldo', st.jumlah_pos_saldo,
       'jumlah_akun_memiliki_saldo', st.jumlah_akun_memiliki_saldo,
       'tanggal_saldo_terakhir', st.tanggal_saldo_terakhir,
       'jumlah_baris_rekap_mtd', km.jumlah_baris_rekap_mtd,
       'jumlah_akun_bermutasi', km.jumlah_akun_bermutasi,
       'jumlah_baris_rekap_bulan_lalu', km.jumlah_baris_rekap_bulan_lalu,
       'tanggal_snapshot_keuangan', p.tanggal_dashboard,
       'keterangan_periode', 'MTD sampai tanggal rekap terakhir yang tersedia.'
   ) AS session_1_kartu_keuangan,
   json_build_object(
       'rata_rata_per_hari_terekap', sh.rata_rata_per_hari_terekap,
       'rata_rata_hari_ada_pemasukan', sh.rata_rata_hari_ada_pemasukan,
       'tertinggi_hari_terekap', sh.tertinggi_hari_terekap,
       'terendah_hari_ada_pemasukan', sh.terendah_hari_ada_pemasukan,
       'hari_dengan_rekap', sh.hari_dengan_rekap,
       'hari_tanpa_rekap', sh.hari_tanpa_rekap,
       'hari_ada_pemasukan', sh.hari_ada_pemasukan,
       'hari_rekap_tanpa_pemasukan', sh.hari_rekap_tanpa_pemasukan,
       'data_harian', hj.data
   ) AS session_2_pembayaran_masuk_per_day,
   json_build_object(
       'total_pengeluaran', pj.total_pengeluaran,
       'jumlah_kelompok', pj.jumlah_kelompok,
       'data_kelompok', pj.data_kelompok,
       'detail_pengeluaran', json_build_object(
           'jumlah_baris', dp.jumlah_baris,
           'data', dp.data
       ),
       'keterangan', 'Tombol Lihat Detail Pengeluaran membuka seluruh baris rekap pengeluaran pada bulan dashboard.'
   ) AS session_3_pengeluaran,
   json_build_object(
       -- Sub-session 1: Total Pengajuan
       'total_pengajuan', ak.total_pengajuan,
       'total_nilai_diajukan', ak.total_nilai_diajukan,
       -- Sub-session 2: Total Proses Pengajuan
       'jumlah_proses_pengajuan', ak.jumlah_proses_pengajuan,
       'total_nilai_proses_pengajuan', ak.total_nilai_proses_pengajuan,
       -- Sub-session 3: Total Disetujui (termasuk yang sudah direalisasi)
       'jumlah_disetujui', ak.jumlah_disetujui,
       'total_nilai_disetujui', ak.total_nilai_disetujui,
       -- Sub-session 4: Total Direalisasi
       'jumlah_direalisasi', ak.jumlah_direalisasi,
       'total_nilai_realisasi', ak.total_nilai_realisasi,
       -- Sub-session 5: Total Ditolak
       'jumlah_ditolak', ak.jumlah_ditolak,
       'total_nilai_ditolak', ak.total_nilai_ditolak,
       -- Sub-session 6: Total Sisa Anggaran
       'jumlah_sisa_anggaran', ak.jumlah_sisa_anggaran,
       'total_sisa_anggaran', ak.total_sisa_anggaran,
       'sisa_anggaran_disetujui', ak.total_sisa_anggaran,
       'tanggal_snapshot_keuangan', p.tanggal_dashboard,
       'waktu_update_terakhir', am.waktu_update_terakhir,
       'jumlah_record_current', am.jumlah_record_current,
       'keterangan_tanggal', 'Anggaran menggunakan versi current; waktu update terakhir ditampilkan terpisah. Snapshot rekap bukan tanggal historis status anggaran.',
       'definisi_total_disetujui', 'Status Disetujui + Realisasi; nilai_disetujui tetap dihitung setelah status berubah menjadi Realisasi.',
       'rumus_sisa_anggaran', 'SUM(nilai_disetujui untuk status Disetujui/Realisasi) - SUM(nilai_realisasi untuk status Realisasi).',
       'detail', ad.data
   ) AS session_4_anggaran,
   json_build_object(
       'tahun_ajaran_aktif', (SELECT tahun_ajaran FROM tahun_ajaran_aktif),
       'id_tahunajaran_aktif', (SELECT id_tahunajaran FROM tahun_ajaran_aktif),
       'jumlah_record', bk.jumlah_record,
       'total_penerima', bk.jumlah_penerima_santri,
       'total_nilai_beasiswa', btk.total_nilai_beasiswa_utama,
       'rata_rata_per_santri', btk.rata_rata_nilai_per_santri,
       'total_nilai_ditetapkan_per_penerima', btk.total_nilai_ditetapkan_per_penerima,
       'total_nilai_ditetapkan_agregat', btk.total_nilai_ditetapkan_agregat,
       'waktu_update_terakhir', btk.waktu_update_terakhir,
       'jumlah_record_per_penerima', bk.jumlah_record_per_penerima,
       'jumlah_penerima_santri', bk.jumlah_penerima_santri,
       'jumlah_record_agregat', bk.jumlah_record_agregat,
       'jumlah_diajukan', bk.jumlah_diajukan,
       'jumlah_disetujui', bk.jumlah_disetujui,
       'jumlah_direalisasi', bk.jumlah_direalisasi,
       'jumlah_ditolak', bk.jumlah_ditolak,
       'jumlah_dicabut', bk.jumlah_dicabut,
       'jumlah_selesai', bk.jumlah_selesai,
       'total_nilai_diajukan', bk.total_nilai_diajukan,
       'total_nilai_ditetapkan', bk.total_nilai_ditetapkan,
       'total_nilai_realisasi', bk.total_nilai_realisasi,
       'detail', bd.data
   ) AS session_5_beasiswa,
   json_build_object(
       'label', 'Pengajuan Beasiswa / Keringanan',
       'tahun_ajaran_aktif', (SELECT tahun_ajaran FROM tahun_ajaran_aktif),
       'id_tahunajaran_aktif', (SELECT id_tahunajaran FROM tahun_ajaran_aktif),
       'jenis_data', 'Gabungan Beasiswa dan Keringanan; rincian tetap dipisahkan per jenis bantuan.',
       'jumlah_total_pengajuan', bgk.jumlah_total_pengajuan,
       'jumlah_diajukan', bgk.jumlah_diajukan,
       'jumlah_disetujui', bgk.jumlah_disetujui,
       'jumlah_direalisasi', bgk.jumlah_direalisasi,
       'jumlah_ditolak', bgk.jumlah_ditolak,
       'jumlah_dicabut', bgk.jumlah_dicabut,
       'jumlah_selesai', bgk.jumlah_selesai,
       'jumlah_penerima_santri', bgk.jumlah_penerima_santri,
       'jumlah_record_agregat', bgk.jumlah_record_agregat,
       'total_nilai_diajukan', bgk.total_nilai_diajukan,
       'total_nilai_ditetapkan', bgk.total_nilai_ditetapkan,
       'total_nilai_realisasi', bgk.total_nilai_realisasi,
       'jumlah_record_beasiswa', bgk.jumlah_record_beasiswa,
       'jumlah_record_keringanan', bgk.jumlah_record_keringanan,
       'waktu_update_terakhir', bgk.waktu_update_terakhir,
       'rekap_per_jenis_bantuan', bgj.data,
       'detail', bgd.data,
       'detail_beasiswa', bd.data,
       'detail_keringanan', kd.data
   ) AS session_6_keringanan,
   json_build_object(
       'total_pemasukan_mtd', rk.total_pemasukan_mtd,
       'total_pengeluaran_mtd', rk.total_pengeluaran_mtd,
       'selisih_mutasi_mtd', rk.selisih_mutasi_mtd,
       'jumlah_baris_rekap', rk.jumlah_baris_rekap,
       'jumlah_hari_terekap', rk.jumlah_hari_terekap,
       'jumlah_akun_terlibat', rk.jumlah_akun_terlibat,
       'jenis_data', 'Rekap harian per akun dan tanggal; bukan transaksi individual',
       'tanggal_snapshot', p.tanggal_dashboard,
       'detail', rd.data
   ) AS session_7_rekap_transaksi,
   json_build_object(
       'jumlah_baris', dp.jumlah_baris,
       'data', dp.data
   ) AS detail_pengeluaran,
   json_build_object(
       'data_per_akun_tahun_ajaran', rj.data
   ) AS rekonsiliasi_mutasi_mtd,
   json_build_object(
       'jumlah_baris_tidak_sesuai', vta.jumlah_baris_tidak_sesuai,
       'jumlah_rekap_current', vta.jumlah_rekap_current,
       'jumlah_baris_tanggal_terakhir', vta.jumlah_baris_tanggal_terakhir
   ) AS validasi_tahun_ajaran,
   json_build_object(
       'jenis_data', 'Rekap harian per akun',
       'label', 'Mutasi Kas Terbaru',
       'bukan_transaksi_individual', TRUE,
       'tanggal_data_terakhir', p.tanggal_dashboard,
       'waktu_update_terakhir_rekap', (SELECT MAX(COALESCE(r.updated_at, r.created_at)) FROM rekap r WHERE r.tanggal = p.tanggal_dashboard),
       'jumlah_baris_ditampilkan', mkj.jumlah_baris_ditampilkan,
       'data', mkj.data,
       'detail_semua_pada_tanggal_terakhir', json_build_object(
           'tanggal', p.tanggal_dashboard,
           'jumlah_baris', mkt.jumlah_baris,
           'data', mkt.data
       )
   ) AS "session_8_mutasi_kas_Transaksi_terbaru"
FROM periode p
CROSS JOIN parameter_pencapaian pp
CROSS JOIN target_kpi tk
CROSS JOIN pencapaian_gabungan pg
CROSS JOIN target_detail_json td
CROSS JOIN aktual_tanpa_target at
CROSS JOIN cakupan_target ct
CROSS JOIN kartu_mutasi km
CROSS JOIN saldo_total st
CROSS JOIN stat_harian sh
CROSS JOIN harian_json hj
CROSS JOIN pengeluaran_json pj
CROSS JOIN mutasi_kas_terbaru_json mkj
CROSS JOIN mutasi_kas_semua_tanggal_terakhir_json mkt
CROSS JOIN detail_pengeluaran_json dp
CROSS JOIN rekonsiliasi_json rj
CROSS JOIN validasi_tahun_ajaran vta
CROSS JOIN anggaran_kpi ak
CROSS JOIN anggaran_detail_json ad
CROSS JOIN anggaran_metadata am
CROSS JOIN beasiswa_kpi bk
CROSS JOIN beasiswa_tampilan_kpi btk
CROSS JOIN beasiswa_detail_json bd
CROSS JOIN keringanan_kpi kk
CROSS JOIN keringanan_detail_json kd
CROSS JOIN bantuan_gabungan_kpi bgk
CROSS JOIN bantuan_gabungan_jenis_json bgj
CROSS JOIN bantuan_gabungan_detail_json bgd
CROSS JOIN rekap_transaksi_kpi rk
CROSS JOIN rekap_transaksi_detail_json rd;
