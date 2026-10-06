WITH
--   0. PARAMETER DASHBOARD
params AS (
   SELECT
       (CURRENT_DATE - 1)::date  AS tanggal_dashboard,
       (CURRENT_DATE - 30)::date AS tanggal_mulai_trend,
       (CURRENT_DATE - 1)::date  AS tanggal_akhir_trend,
       0.40::numeric AS bobot_kehadiran,
       0.35::numeric AS bobot_kebersihan,
       0.25::numeric AS bobot_kedisiplinan,
       100::numeric AS ambang_istimewa,
       90::numeric  AS ambang_baik_sekali,
       80::numeric  AS ambang_baik,
       75::numeric  AS ambang_cukup,
       '#16A34A'::text AS warna_istimewa,
       '#16A34A'::text AS warna_baik_sekali,
       '#84CC16'::text AS warna_baik,
       '#EAB308'::text AS warna_cukup,
       '#DC2626'::text AS warna_kurang),


--   1. PARAMETER AREA KEBERSIHAN
/* AREA UTAMA KEBERSIHAN
  1. Kamar Santri
  2. Lorong Asrama
  3. Lingkungan*/
area_master AS (
   SELECT *
   FROM (
       VALUES
           (1, 'Kamar Santri'),
           (2, 'Lorong'),
           (3, 'Lingkungan')
   ) AS x(urutan, nama_area)),
  
--   2. MASTER SANTRI AKTIF
santri_base AS (
   SELECT DISTINCT ON (s.id_santri)
       s.id_santri,
       s.nis,
       s.fullname AS nama_santri,
       s.gender,
       s.status,
       pk.id_penempatan,
       pk.id_lokasi,
       lk.nama_lokasi AS nama_kamar,
       lk.jenis_lokasi::text AS jenis_lokasi,
       cb.id_cabang,
       cb.nama_cabang
   FROM santri s
   LEFT JOIN penempatan_kamar_santri pk
       ON pk.id_santri = s.id_santri
      AND pk.status = 'Aktif'
      AND pk.deleted_at IS NULL
   LEFT JOIN lokasi lk
       ON lk.id_lokasi = pk.id_lokasi
   LEFT JOIN cabang cb
       ON cb.id_cabang = lk.id_cabang
   WHERE s.status = '1'
   ORDER BY
       s.id_santri,
       pk.id_penempatan DESC NULLS LAST),
--   3. ABSENSI D-1
absensi_d1 AS (
   SELECT DISTINCT ON (a.id_santri)
       a.id_absen,
       a.id_santri,
       a.tanggal,
       a.waktu_absen,
       a.status_kehadiran::text AS status_kehadiran,
       a.keterangan
   FROM absen_harian_santri a
   CROSS JOIN params p
   WHERE a.tanggal = p.tanggal_dashboard
     AND COALESCE(a.is_deleted, FALSE) = FALSE
     AND a.deleted_at IS NULL
   ORDER BY
       a.id_santri,
       a.waktu_absen DESC,
       a.id_absen DESC),
--   4. PERIZINAN AKTIF D-1
izin_d1 AS (
   SELECT DISTINCT ON (ps.id_santri)
       ps.id_izin,
       ps.id_santri,
       ps.jenis_izin,
       ps.sumber_pengajuan,
       ps.status_approval,
       ps.kondisi,
       ps.tanggal_mulai,
       ps.tanggal_selesai
   FROM perizinan_santri ps
   CROSS JOIN params p
   WHERE ps.status_approval = 'Disetujui'
     AND p.tanggal_dashboard BETWEEN
           ps.tanggal_mulai::date
           AND ps.tanggal_selesai::date
     AND ps.deleted_at IS NULL
   ORDER BY
       ps.id_santri,
       ps.tanggal_mulai DESC,
       ps.id_izin DESC),
--   5. KESEHATAN AKTIF D-1
kesehatan_d1 AS (
   SELECT DISTINCT ON (ks.id_santri)
       ks.id_kesehatan,
       ks.id_santri,
       ks.kategori_sakit,
       ks.progres_status,
       ks.keluhan,
       ks.tindakan,
       ks.obat_diberikan,
       ks.tempat_dirawat,
       ks.tanggal_mulai_rawat,
       ks.estimasi_hari,
       ks.tanggal_dirujuk,
       ks.tempat_rujukan
   FROM kesehatan_santri ks
   CROSS JOIN params p
   WHERE p.tanggal_dashboard BETWEEN
           ks.tanggal_mulai_rawat::date
           AND (ks.tanggal_mulai_rawat::date
               +
               (COALESCE(ks.estimasi_hari, 1) - 1)
               * INTERVAL '1 day')::date
     AND COALESCE(ks.is_deleted, FALSE) = FALSE
     AND ks.deleted_at IS NULL
   ORDER BY
       ks.id_santri,
       ks.tanggal_mulai_rawat DESC,
       ks.id_kesehatan DESC),
--   6. KASUS PELANGGARAN AKTIF PER SANTRI
kasus_aktif_santri AS (
   SELECT
       k.id_santri,
       COUNT(*) FILTER (
           WHERE m.jenis = 'Pelanggaran'
       ) AS jumlah_kasus_aktif,
       COUNT(*) FILTER (
           WHERE m.jenis = 'Pelanggaran'
             AND m.kategori = 'Ringan'
       ) AS kasus_ringan,
       COUNT(*) FILTER (
           WHERE m.jenis = 'Pelanggaran'
             AND m.kategori = 'Sedang'
       ) AS kasus_sedang,
       COUNT(*) FILTER (
           WHERE m.jenis = 'Pelanggaran'
             AND m.kategori = 'Berat'
       ) AS kasus_berat,
       COUNT(*) FILTER (
           WHERE m.jenis = 'Pelanggaran'
             AND m.kategori = 'Sangat Berat'
       ) AS kasus_sangat_berat,
       COUNT(*) FILTER (
           WHERE m.jenis = 'Pelanggaran'
             AND k.status_progress = 'Proses'
       ) AS kasus_belum_selesai,
       COUNT(*) AS jumlah_event_aktif,
       COALESCE(
           SUM(k.skor_diberikan),
           0
       ) AS total_poin_bersih
   FROM kasus_pelanggaran_santri k
   INNER JOIN master_pelanggaran_remisi m
       ON m.id_pelanggaran_remisi =
          k.id_pelanggaran_remisi
   WHERE k.deleted_at IS NULL
     AND k.status_progress <> 'Batal'
   GROUP BY
       k.id_santri),
--   7. BASE DATA DASHBOARD
santri_dashboard AS (
   SELECT
       sb.id_santri,
       sb.nis,
       sb.nama_santri,
       sb.gender,
       sb.id_lokasi,
       sb.nama_kamar,
       sb.jenis_lokasi,
       sb.id_cabang,
       sb.nama_cabang,
       ad.id_absen,
       ad.status_kehadiran,
       CASE
           WHEN ad.status_kehadiran = 'Hadir'
           THEN 1 ELSE 0
       END AS is_hadir,
       CASE
           WHEN ad.status_kehadiran = 'Izin'
           THEN 1 ELSE 0
       END AS is_izin,
       CASE
           WHEN ad.status_kehadiran = 'Sakit'
           THEN 1 ELSE 0
       END AS is_sakit,
       CASE
           WHEN ad.status_kehadiran = 'Alfa'
           THEN 1 ELSE 0
       END AS is_alfa,
       CASE
           WHEN ad.id_absen IS NULL
           THEN 1 ELSE 0
       END AS is_belum_absen,
       CASE
           WHEN ad.status_kehadiran = 'Alfa'
             OR ad.id_absen IS NULL
           THEN 1 ELSE 0
       END AS is_alfa_tidak_absen,
       CASE
           WHEN kd.tempat_dirawat = 'UKS'
           THEN 1 ELSE 0
       END AS is_di_uks,
       CASE
           WHEN kd.tempat_dirawat = 'Kamar'
           THEN 1 ELSE 0
       END AS is_di_kamar,
       CASE
           WHEN ad.status_kehadiran = 'Sakit'
            AND iz.id_izin IS NOT NULL
           THEN 1 ELSE 0
       END AS is_di_rumah,
       CASE
           WHEN kd.progres_status = 'Dirujuk'
           THEN 1 ELSE 0
       END AS is_dirujuk,
       CASE
           WHEN kd.progres_status = 'Dirujuk'
             OR (
                   ad.status_kehadiran = 'Sakit'
                   AND iz.id_izin IS NOT NULL
                )
           THEN 1 ELSE 0
       END AS is_sakit_rumah_rujukan,
       CASE
           WHEN iz.jenis_izin = 'Sakit'
           THEN 1 ELSE 0
       END AS is_izin_sakit,
       CASE
           WHEN iz.jenis_izin = 'Izin'
           THEN 1 ELSE 0
       END AS is_izin_pulang,
       COALESCE(ka.jumlah_kasus_aktif, 0)
           AS jumlah_kasus_aktif,
       COALESCE(ka.kasus_ringan, 0)
           AS kasus_ringan,
       COALESCE(ka.kasus_sedang, 0)
           AS kasus_sedang,
       COALESCE(ka.kasus_berat, 0)
           AS kasus_berat,
       COALESCE(ka.kasus_sangat_berat, 0)
           AS kasus_sangat_berat,
       COALESCE(ka.kasus_belum_selesai, 0)
           AS kasus_belum_selesai,
       COALESCE(ka.total_poin_bersih, 0)
           AS total_poin_bersih
   FROM santri_base sb
   LEFT JOIN absensi_d1 ad
       ON ad.id_santri = sb.id_santri
   LEFT JOIN izin_d1 iz
       ON iz.id_santri = sb.id_santri
   LEFT JOIN kesehatan_d1 kd
       ON kd.id_santri = sb.id_santri
   LEFT JOIN kasus_aktif_santri ka
       ON ka.id_santri = sb.id_santri),
--   8. KEBERSIHAN D-1
kebersihan_d1 AS (
   SELECT
       ki.id_inspeksi,
       ki.id_cabang,
       ki.id_lokasi,
       ki.status_kondisi::text AS status_kondisi,
       lk.nama_lokasi,
       lk.jenis_lokasi::text AS jenis_lokasi,
		CASE
   		WHEN lk.jenis_lokasi::text = 'Kamar'
       		THEN 'Kamar Santri'
   		WHEN lk.jenis_lokasi::text = 'Asrama'
       		THEN 'Lorong'
   		WHEN lk.jenis_lokasi::text IN (
       		'Taman',
       		'AreaUmum',
       		'Lahan',
       		'Lapangan',
       		'Parkiran')
       		THEN 'Lingkungan'
   		ELSE NULL
		END AS area_kebersihan   
	FROM kebersihan_inspeksi ki
   CROSS JOIN params p
   LEFT JOIN lokasi lk
       ON lk.id_lokasi = ki.id_lokasi
   WHERE ki.tanggal = p.tanggal_dashboard),
--   9. KEBERSIHAN TOTAL
kebersihan_total AS (
   SELECT
       COUNT(*) AS jumlah_inspeksi,
       COUNT(*) FILTER (
           WHERE status_kondisi = 'BERSIH'
       ) AS jumlah_bersih,
       COUNT(*) FILTER (
           WHERE status_kondisi = 'KOTOR'
       ) AS jumlah_kotor
   FROM kebersihan_d1),
--   10. KEBERSIHAN PER CABANG
kebersihan_cabang AS (
   SELECT
       ki.id_cabang,
       COUNT(*) AS jumlah_inspeksi,
       COUNT(*) FILTER (
           WHERE ki.status_kondisi = 'BERSIH'
       ) AS jumlah_bersih,
       COUNT(*) FILTER (
           WHERE ki.status_kondisi = 'KOTOR'
       ) AS jumlah_kotor,
       ROUND(
           COUNT(*) FILTER (
               WHERE ki.status_kondisi = 'BERSIH'
           )::numeric
           /
           NULLIF(COUNT(*), 0)
           * 100,1) AS persentase_kebersihan
   FROM kebersihan_d1 ki
   GROUP BY
       ki.id_cabang),
--   11. KEBERSIHAN AREA TOTAL
kebersihan_area_total AS (
   SELECT
       a.urutan,
       a.nama_area,
       COUNT(k.id_inspeksi) AS jumlah_inspeksi,
       COUNT(k.id_inspeksi) FILTER (
           WHERE k.status_kondisi = 'BERSIH'
       ) AS jumlah_bersih,
       COUNT(k.id_inspeksi) FILTER (
           WHERE k.status_kondisi = 'KOTOR'
       ) AS jumlah_kotor,
       ROUND(
           COUNT(k.id_inspeksi) FILTER (
               WHERE k.status_kondisi = 'BERSIH'
           )::numeric
           /
           NULLIF(COUNT(k.id_inspeksi), 0)
           * 100,1) AS persentase_kebersihan
   FROM area_master a
   LEFT JOIN kebersihan_d1 k
       ON k.area_kebersihan = a.nama_area
   GROUP BY
       a.urutan,
       a.nama_area),
--   12. KEBERSIHAN AREA PER CABANG
kebersihan_area_cabang AS (
   SELECT
       k.id_cabang,
       k.area_kebersihan,
       COUNT(*) AS jumlah_inspeksi,
       COUNT(*) FILTER (
           WHERE k.status_kondisi = 'BERSIH'
       ) AS jumlah_bersih,
       COUNT(*) FILTER (
           WHERE k.status_kondisi = 'KOTOR'
       ) AS jumlah_kotor,
       ROUND(
           COUNT(*) FILTER (
               WHERE k.status_kondisi = 'BERSIH'
           )::numeric
           /
           NULLIF(COUNT(*), 0)
           * 100,1) AS persentase_kebersihan
   FROM kebersihan_d1 k
   WHERE k.area_kebersihan IS NOT NULL
   GROUP BY
       k.id_cabang,
       k.area_kebersihan),
-- TOP 5 LOKASI PERLU PERHATIAN
kebersihan_prioritas_lokasi AS (
   SELECT
       ki.id_lokasi,
       MAX(ki.id_cabang) AS id_cabang,
       lk.nama_lokasi,
       lk.jenis_lokasi::text
           AS jenis_lokasi,
       --   TOTAL INSPEKSI
       COUNT(*) AS jumlah_inspeksi,
       --   BERSIH
       COUNT(*) FILTER (
           WHERE ki.status_kondisi = 'BERSIH'
       ) AS jumlah_bersih,
       --   KOTOR
       COUNT(*) FILTER (
           WHERE ki.status_kondisi = 'KOTOR'
       ) AS jumlah_kotor,
       --   PERSENTASE KEBERSIHAN
       ROUND(
           COUNT(*) FILTER (
               WHERE ki.status_kondisi = 'BERSIH')::numeric
           	/
           	NULLIF(COUNT(*), 0)* 100,1
       ) AS persentase_kebersihan,
       --   JUMLAH TEMUAN
       COUNT(*) FILTER (
           WHERE ki.status_kondisi = 'KOTOR'
             AND EXISTS (
                 SELECT 1
                 FROM kebersihan_temuan kt
                 WHERE kt.id_inspeksi = ki.id_inspeksi
                   AND kt.perlu_tindak_lanjut = TRUE)
       ) AS inspeksi_perlu_tindak_lanjut
   FROM kebersihan_inspeksi ki
   CROSS JOIN params p
   INNER JOIN lokasi lk
       ON lk.id_lokasi = ki.id_lokasi
   WHERE ki.tanggal = p.tanggal_dashboard
   GROUP BY
       ki.id_lokasi,
       lk.nama_lokasi,
       lk.jenis_lokasi
  --    HANYA LOKASI YANG MEMILIKI KOTOR + TEMUAN PERLU TINDAK LANJUT
   HAVING
       COUNT(*) FILTER (
           WHERE ki.status_kondisi = 'KOTOR'
             AND EXISTS (
                 SELECT 1
                 FROM kebersihan_temuan kt
                 WHERE kt.id_inspeksi = ki.id_inspeksi
                   AND kt.perlu_tindak_lanjut = TRUE
             )) > 0
   ORDER BY
       persentase_kebersihan ASC,
       inspeksi_perlu_tindak_lanjut DESC,
       lk.nama_lokasi
   LIMIT 5),       
      
--   13. REKAP CABANG
cabang_rekap AS (
--       A. MASTER CABANG
   SELECT
       cb.id_cabang,
       cb.nama_cabang,
       --   SANTRI
       COUNT(sd.id_santri) AS total_santri,
       --   KEHADIRAN
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_hadir = 1
           ) AS hadir,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_izin = 1
           ) AS izin,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_sakit = 1
           ) AS sakit,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_alfa = 1
           ) AS alfa,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_belum_absen = 1
           ) AS belum_absen,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_alfa_tidak_absen = 1
           ) AS alfa_tidak_absen,
      --    KESEHATAN
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_di_uks = 1
           ) AS sakit_uks,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_di_kamar = 1
           ) AS sakit_kamar,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_di_rumah = 1
           ) AS sakit_rumah,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_dirujuk = 1
           ) AS dirujuk,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_sakit_rumah_rujukan = 1
           ) AS sakit_rumah_rujukan,
       --   PERIZINAN
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_izin_sakit = 1
           ) AS izin_sakit,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_izin_pulang = 1
           ) AS izin_pulang,
       --   KASUS
       COALESCE(
           SUM(sd.jumlah_kasus_aktif),
           0
       ) AS jumlah_kasus_aktif,
       COALESCE(
           SUM(sd.kasus_ringan),
           0
       ) AS kasus_ringan,
       COALESCE(
           SUM(sd.kasus_sedang),
           0
       ) AS kasus_sedang,
       COALESCE(
           SUM(sd.kasus_berat),
           0
       ) AS kasus_berat,
       COALESCE(
           SUM(sd.kasus_sangat_berat),
           0
       ) AS kasus_sangat_berat,
       COALESCE(
           SUM(sd.kasus_belum_selesai),
           0
       ) AS kasus_belum_selesai,
       COALESCE(
           SUM(sd.total_poin_bersih),
           0
       ) AS total_poin_bersih,
       --   JUMLAH SANTRI DENGAN KASUS
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.jumlah_kasus_aktif > 0
           ) AS santri_dengan_kasus,
       COUNT(sd.id_santri)
           FILTER (
               WHERE COALESCE(sd.jumlah_kasus_aktif, 0) = 0
           ) AS santri_tanpa_kasus
   FROM cabang cb
   LEFT JOIN santri_dashboard sd
       ON sd.id_cabang = cb.id_cabang
   GROUP BY
       cb.id_cabang,
       cb.nama_cabang
   --   B. SANTRI BELUM PENEMPATAN KAMAR TERPETAKAN KE CABANG
   UNION ALL
   SELECT
       NULL::varchar AS id_cabang,
       'Belum Terpetakan'::text AS nama_cabang,
       COUNT(sd.id_santri) AS total_santri,
       --   KEHADIRAN
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_hadir = 1
           ) AS hadir,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_izin = 1
           ) AS izin,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_sakit = 1
           ) AS sakit,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_alfa = 1
           ) AS alfa,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_belum_absen = 1
           ) AS belum_absen,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_alfa_tidak_absen = 1
           ) AS alfa_tidak_absen,
       --   KESEHATAN
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_di_uks = 1
           ) AS sakit_uks,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_di_kamar = 1
           ) AS sakit_kamar,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_di_rumah = 1
           ) AS sakit_rumah,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_dirujuk = 1
           ) AS dirujuk,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_sakit_rumah_rujukan = 1
           ) AS sakit_rumah_rujukan,
       --   PERIZINAN
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_izin_sakit = 1
           ) AS izin_sakit,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.is_izin_pulang = 1
           ) AS izin_pulang,
       --   KASUS
       COALESCE(
           SUM(sd.jumlah_kasus_aktif),
           0
       ) AS jumlah_kasus_aktif,
       COALESCE(
           SUM(sd.kasus_ringan),
           0
       ) AS kasus_ringan,
       COALESCE(
           SUM(sd.kasus_sedang),
           0
       ) AS kasus_sedang,
       COALESCE(
           SUM(sd.kasus_berat),
           0
       ) AS kasus_berat,
       COALESCE(
           SUM(sd.kasus_sangat_berat),
           0
       ) AS kasus_sangat_berat,
       COALESCE(
           SUM(sd.kasus_belum_selesai),
           0
       ) AS kasus_belum_selesai,
       COALESCE(
           SUM(sd.total_poin_bersih),
           0
       ) AS total_poin_bersih,
       COUNT(sd.id_santri)
           FILTER (
               WHERE sd.jumlah_kasus_aktif > 0
           ) AS santri_dengan_kasus,
       COUNT(sd.id_santri)
           FILTER (
               WHERE COALESCE(sd.jumlah_kasus_aktif, 0) = 0
           ) AS santri_tanpa_kasus
   FROM santri_dashboard sd
   WHERE sd.id_cabang IS NULL),
  
--   14. PERFORMA CABANG
cabang_performa AS (
   SELECT
       c.*,
       --   KEHADIRAN
       ROUND(
           c.hadir::numeric
           /
           NULLIF(c.total_santri, 0)
           * 100,
           1
       ) AS persentase_kehadiran,
       --   KEBERSIHAN
       kc.jumlah_inspeksi
           AS jumlah_inspeksi_kebersihan,
       kc.jumlah_bersih
           AS jumlah_bersih_kebersihan,
       kc.jumlah_kotor
           AS jumlah_kotor_kebersihan,
       kc.persentase_kebersihan,
       --   KEDISIPLINAN
       CASE
           WHEN c.total_santri = 0
               THEN NULL
           ELSE ROUND(
               (
                   c.total_santri
                   -
                   c.santri_dengan_kasus
               )::numeric
               /
               NULLIF(c.total_santri, 0)
               * 100,
               1
           )
       END AS persentase_kedisiplinan
   FROM cabang_rekap c
   LEFT JOIN kebersihan_cabang kc
       ON kc.id_cabang = c.id_cabang),
      
--   15. PERFORMA CABANG FINAL
cabang_performa_final AS (
   SELECT
       cp.*,
       CASE
           WHEN cp.persentase_kebersihan IS NULL
               THEN NULL
           ELSE ROUND(
               (cp.persentase_kehadiran
                   * p.bobot_kehadiran)
               +
               (cp.persentase_kebersihan
                   * p.bobot_kebersihan)
               +
               (cp.persentase_kedisiplinan
                   * p.bobot_kedisiplinan),1)
       END AS performa_total
   FROM cabang_performa cp
   CROSS JOIN params p),
--   16. AREA KEBERSIHAN PER CABANG JSON
area_cabang_json AS (
   SELECT
       x.id_cabang,
       jsonb_object_agg(
           x.area_kebersihan,
           jsonb_build_object(
               'jumlah_inspeksi',
                   x.jumlah_inspeksi,
               'jumlah_bersih',
                   x.jumlah_bersih,
               'jumlah_kotor',
                   x.jumlah_kotor,
               'persentase',
                   x.persentase_kebersihan
           )
       ) AS area_json
   FROM kebersihan_area_cabang x
   GROUP BY
       x.id_cabang),
--   17. TREND TANGGAL
trend_tanggal AS (
   SELECT
       gs::date AS tanggal
   FROM params p
   CROSS JOIN LATERAL generate_series(
       p.tanggal_mulai_trend,
       p.tanggal_akhir_trend,
       INTERVAL '1 day') gs),
--   18. ABSENSI TREND
absensi_trend AS (
   SELECT DISTINCT ON (
       a.id_santri,
       a.tanggal) a.id_santri,
       a.tanggal,
       a.status_kehadiran::text AS status_kehadiran
   FROM absen_harian_santri a
   CROSS JOIN params p
   WHERE a.tanggal BETWEEN
           p.tanggal_mulai_trend
           AND p.tanggal_akhir_trend
     AND COALESCE(a.is_deleted, FALSE) = FALSE
     AND a.deleted_at IS NULL
   ORDER BY
       a.id_santri,
       a.tanggal,
       a.waktu_absen DESC,
       a.id_absen DESC),
--   19. REKAP TREND
trend_rekap AS (
   SELECT
       t.tanggal,
       COUNT(sb.id_santri) AS total_santri,
       COUNT(*) FILTER (
           WHERE at.status_kehadiran = 'Hadir'
       ) AS hadir,
       COUNT(*) FILTER (
           WHERE at.status_kehadiran = 'Izin'
       ) AS izin,
       COUNT(*) FILTER (
           WHERE at.status_kehadiran = 'Sakit'
       ) AS sakit,
       COUNT(*) FILTER (
           WHERE at.status_kehadiran = 'Alfa'
       ) AS alfa,
       COUNT(*) FILTER (
           WHERE at.id_santri IS NULL
       ) AS belum_absen,
       ROUND(
           COUNT(*) FILTER (WHERE at.status_kehadiran = 'Hadir')::numeric
           /
           NULLIF(COUNT(sb.id_santri), 0)* 100,1) AS persentase_hadir
   FROM trend_tanggal t
   CROSS JOIN santri_base sb
   LEFT JOIN absensi_trend at
       ON at.id_santri = sb.id_santri
      AND at.tanggal = t.tanggal
   GROUP BY
       t.tanggal),
--   20. KOMPOSISI HARIAN
komposisi_harian AS (
   SELECT
       SUM(is_hadir) AS hadir,
       SUM(is_izin) AS izin,
       SUM(is_sakit) AS sakit,
       SUM(is_di_uks) AS sakit_uks,
       SUM(is_sakit_rumah_rujukan)
           AS sakit_rumah_rujukan,
       SUM(is_alfa) AS alfa,
       SUM(is_belum_absen) AS belum_absen,
       SUM(is_alfa_tidak_absen)
           AS alfa_tidak_absen
   FROM santri_dashboard),
--   21. KASUS TOTAL
kasus_total AS (
   SELECT
       COUNT(*) FILTER (
           WHERE m.jenis = 'Pelanggaran'
       ) AS total_kasus_aktif,
       COUNT(*) FILTER (
           WHERE m.jenis = 'Pelanggaran'
             AND m.kategori = 'Ringan'
       ) AS pelanggaran_ringan,
       COUNT(*) FILTER (
           WHERE m.jenis = 'Pelanggaran'
             AND m.kategori = 'Sedang'
       ) AS pelanggaran_sedang,
       COUNT(*) FILTER (
           WHERE m.jenis = 'Pelanggaran'
             AND m.kategori = 'Berat'
       ) AS pelanggaran_berat,
       COUNT(*) FILTER (
           WHERE m.jenis = 'Pelanggaran'
             AND m.kategori = 'Sangat Berat'
       ) AS pelanggaran_sangat_berat,
       COUNT(*) FILTER (
           WHERE m.jenis = 'Pelanggaran'
             AND k.status_progress = 'Proses'
       ) AS belum_selesai,
       COALESCE(
           SUM(k.skor_diberikan),
           0) AS total_poin_bersih
   FROM kasus_pelanggaran_santri k
   INNER JOIN master_pelanggaran_remisi m
       ON m.id_pelanggaran_remisi =
          k.id_pelanggaran_remisi
   WHERE k.deleted_at IS NULL
     AND k.status_progress <> 'Batal'),
--   22. DISIPLIN TOTAL
disiplin_total AS (
   SELECT
       COUNT(*) AS total_santri,
       COUNT(*) FILTER (
           WHERE jumlah_kasus_aktif > 0
       ) AS santri_dengan_kasus,
       COUNT(*) FILTER (
           WHERE jumlah_kasus_aktif = 0
       ) AS santri_tanpa_kasus,
       ROUND(( COUNT(*)
               -
               COUNT(*) FILTER (WHERE jumlah_kasus_aktif > 0)
           )::numeric
           /
           NULLIF(COUNT(*), 0)
           * 100,1) AS persentase_kedisiplinan
   FROM santri_dashboard),
--   23. PERFORMA TOTAL
performa_total AS (
   SELECT
       ROUND(
           SUM(sd.is_hadir)::numeric
           /
           NULLIF(COUNT(sd.id_santri), 0)
           * 100,1) AS persentase_kehadiran,
       CASE
           WHEN kt.jumlah_inspeksi = 0
               THEN NULL
           ELSE ROUND(
               kt.jumlah_bersih::numeric
               /
               NULLIF(kt.jumlah_inspeksi, 0)* 100,1)
       END AS persentase_kebersihan,
       dt.persentase_kedisiplinan
   FROM santri_dashboard sd
   CROSS JOIN kebersihan_total kt
   CROSS JOIN disiplin_total dt
   GROUP BY
       kt.jumlah_inspeksi,
       kt.jumlah_bersih,
       dt.persentase_kedisiplinan),
--   24. PERFORMA FINAL
performa_final AS (
   SELECT
       pt.*,
       CASE
           WHEN pt.persentase_kehadiran IS NULL
             OR pt.persentase_kebersihan IS NULL
             OR pt.persentase_kedisiplinan IS NULL
               THEN NULL
           ELSE ROUND((pt.persentase_kehadiran
                   * p.bobot_kehadiran)
               +
               (pt.persentase_kebersihan
                   * p.bobot_kebersihan)
               +
               (pt.persentase_kedisiplinan
                   * p.bobot_kedisiplinan),1)
       END AS performa_total
   FROM performa_total pt
   CROSS JOIN params p),
--   25. STATUS PERFORMA
performa_status AS (
   SELECT
       pf.*,
       CASE
           WHEN pf.performa_total >= p.ambang_istimewa
               THEN 'Istimewa'
           WHEN pf.performa_total >= p.ambang_baik_sekali
               THEN 'Baik Sekali'
           WHEN pf.performa_total >= p.ambang_baik
               THEN 'Baik'
           WHEN pf.performa_total >= p.ambang_cukup
               THEN 'Cukup'
           ELSE 'Kurang'
       END AS status_performa,
       CASE
           WHEN pf.performa_total >= p.ambang_istimewa
               THEN p.warna_istimewa
           WHEN pf.performa_total >= p.ambang_baik_sekali
               THEN p.warna_baik_sekali
           WHEN pf.performa_total >= p.ambang_baik
               THEN p.warna_baik
           WHEN pf.performa_total >= p.ambang_cukup
               THEN p.warna_cukup
           ELSE p.warna_kurang
       END AS warna_performa
   FROM performa_final pf
   CROSS JOIN params p),
--   26. KPI TOTAL — PENTING
kpi_total AS (
   SELECT
       COUNT(*) AS total_santri,
       COUNT(*) FILTER (
           WHERE UPPER(TRIM(gender::text))
               IN ('L','LAKI-LAKI','LAKI LAKI')) AS jumlah_l,
       COUNT(*) FILTER (
           WHERE UPPER(TRIM(gender::text))
               IN ('P','PEREMPUAN')) AS jumlah_p,
       SUM(is_hadir) AS hadir,
       SUM(is_izin) AS izin,
       SUM(is_di_uks) AS sakit_uks,
       SUM(is_sakit_rumah_rujukan)
           AS sakit_rumah_rujukan,
       SUM(is_alfa) AS alfa,
       SUM(is_belum_absen) AS belum_absen,
       SUM(is_alfa_tidak_absen)
           AS alfa_tidak_absen,
       ROUND(SUM(is_hadir)::numeric / NULLIF(COUNT(*), 0) * 100,1) AS persentase_hadir,
       ROUND(SUM(is_izin)::numeric
           /
           NULLIF(COUNT(*), 0)
           * 100,1) AS persentase_izin,
       ROUND(
           SUM(is_di_uks)::numeric
           /
           NULLIF(COUNT(*), 0)
           * 100,1) AS persentase_sakit_uks,
       ROUND(
           SUM(is_sakit_rumah_rujukan)::numeric
           /
           NULLIF(COUNT(*), 0)
           * 100,1) AS persentase_sakit_rumah_rujukan,
       ROUND(
           SUM(is_alfa)::numeric
           /
           NULLIF(COUNT(*), 0)
           * 100,1) AS persentase_alfa,
       ROUND(
           SUM(is_belum_absen)::numeric
           /
           NULLIF(COUNT(*), 0)
           * 100,1) AS persentase_belum_absen
   FROM santri_dashboard),
--   27. JSON TREND
trend_json AS (
   SELECT
       jsonb_agg(
           jsonb_build_object(
               'tanggal', tr.tanggal,
               'hadir', tr.hadir,
               'izin', tr.izin,
               'sakit', tr.sakit,
               'alfa', tr.alfa,
               'belum_absen', tr.belum_absen,
               'alfa_tidak_absen',
                   tr.alfa + tr.belum_absen,
               'persentase_hadir',
                   tr.persentase_hadir)
           ORDER BY tr.tanggal
       ) AS data
   FROM trend_rekap tr),
--   28. JSON CABANG
cabang_json AS (
   SELECT
       jsonb_agg(
           jsonb_build_object(
               'id_cabang',
                   cpf.id_cabang,
               'nama_cabang',
                   cpf.nama_cabang,
               'total_santri',
                   cpf.total_santri,
               'hadir',
                   cpf.hadir,
               'izin',
                   cpf.izin,
               'sakit',
                   cpf.sakit,
               'alfa',
                   cpf.alfa,
               'belum_absen',
                   cpf.belum_absen,
               'alfa_tidak_absen',
                   cpf.alfa_tidak_absen,
               'persentase_kehadiran',
                   cpf.persentase_kehadiran,
               'sakit_uks',
                   cpf.sakit_uks,
               'sakit_kamar',
                   cpf.sakit_kamar,
               'sakit_rumah',
                   cpf.sakit_rumah,
               'dirujuk',
                   cpf.dirujuk,
               'sakit_rumah_rujukan',
                   cpf.sakit_rumah_rujukan,
               'izin_sakit',
                   cpf.izin_sakit,
               'izin_pulang',
                   cpf.izin_pulang,
                   'jumlah_inspeksi_kebersihan',
                   cpf.jumlah_inspeksi_kebersihan,
               'jumlah_bersih_kebersihan',
                   cpf.jumlah_bersih_kebersihan,
               'jumlah_kotor_kebersihan',
                   cpf.jumlah_kotor_kebersihan,
               'persentase_kebersihan',
                   cpf.persentase_kebersihan,
               'kasus_aktif',
                   cpf.jumlah_kasus_aktif,
               'kasus_ringan',
                   cpf.kasus_ringan,
               'kasus_sedang',
                   cpf.kasus_sedang,
               'kasus_berat',
                   cpf.kasus_berat,
               'kasus_sangat_berat',
                   cpf.kasus_sangat_berat,
               'kasus_belum_selesai',
                   cpf.kasus_belum_selesai,
               'persentase_kedisiplinan',
                   cpf.persentase_kedisiplinan,
               'performa_total',
                   cpf.performa_total,
               'area_kebersihan',
                   COALESCE(
                       acj.area_json,
                       '{}'::jsonb))
           ORDER BY cpf.nama_cabang
       ) AS data
   FROM cabang_performa_final cpf
   LEFT JOIN area_cabang_json acj
       ON acj.id_cabang = cpf.id_cabang),
--   29. JSON KEBERSIHAN AREA
kebersihan_area_json AS (
   SELECT
       jsonb_agg(
           jsonb_build_object(
               'area',
                   kat.nama_area,
               'jumlah_inspeksi',
                   kat.jumlah_inspeksi,
               'jumlah_bersih',
                   kat.jumlah_bersih,
               'jumlah_kotor',
                   kat.jumlah_kotor,
               'persentase',
                   kat.persentase_kebersihan)
           ORDER BY kat.urutan
       ) AS data
   FROM kebersihan_area_total kat),
--   TOP 5 LOKASI PERLU PERHATIAN - JSON
kebersihan_prioritas_json AS (
   SELECT
       COALESCE(
           jsonb_agg(
               jsonb_build_object(
                   'peringkat',
                       x.peringkat,
                   'id_lokasi',
                       x.id_lokasi,
                   'id_cabang',
                       x.id_cabang,
                   'nama_lokasi',
                       x.nama_lokasi,
                   'jenis_lokasi',
                       x.jenis_lokasi,
                   'jumlah_inspeksi',
                       x.jumlah_inspeksi,
                   'jumlah_bersih',
                       x.jumlah_bersih,
                   'jumlah_kotor',
                       x.jumlah_kotor,
                   'inspeksi_perlu_tindak_lanjut',
                       x.inspeksi_perlu_tindak_lanjut,
                   'persentase_kebersihan',
                       x.persentase_kebersihan)
               ORDER BY x.peringkat
           ),
           '[]'::jsonb
       ) AS data
   FROM (
       SELECT
           ROW_NUMBER() OVER (
               ORDER BY
                   kpl.persentase_kebersihan ASC,
                   kpl.inspeksi_perlu_tindak_lanjut DESC,
                   kpl.nama_lokasi
           ) AS peringkat,
           kpl.*
       FROM kebersihan_prioritas_lokasi kpl
   ) x),   
  
--   30. JSON KASUS
kasus_json AS (
   SELECT
       jsonb_build_object(
           'pelanggaran_ringan',
               kt.pelanggaran_ringan,
           'pelanggaran_sedang',
               kt.pelanggaran_sedang,
           'pelanggaran_berat',
               kt.pelanggaran_berat,
           'pelanggaran_sangat_berat',
               kt.pelanggaran_sangat_berat,
           'total_kasus_aktif',
               kt.total_kasus_aktif,
           'belum_selesai',
               kt.belum_selesai,
           'total_poin_bersih',
               kt.total_poin_bersih
       ) AS data
   FROM kasus_total kt)
  
/* 31. OUTPUT FINAL
  SCALAR + JSON
  SATU RECORD DASHBOARD*/
SELECT
   -- IDENTITAS
   2 AS level_summary,
   p.tanggal_dashboard,
   p.tanggal_mulai_trend,
   p.tanggal_akhir_trend,
   -- PARAMETER SCALAR
   p.bobot_kehadiran,
   p.bobot_kebersihan,
   p.bobot_kedisiplinan,
   p.ambang_istimewa,
   p.ambang_baik_sekali,
   p.ambang_baik,
   p.ambang_cukup,
   p.warna_istimewa,
   p.warna_baik_sekali,
   p.warna_baik,
   p.warna_cukup,
   p.warna_kurang,
   -- PERFORMA SCALAR
   pf.persentase_kehadiran
       AS performa_kehadiran,
   pf.persentase_kebersihan
       AS performa_kebersihan,
   pf.persentase_kedisiplinan
       AS performa_kedisiplinan,
   pf.performa_total
       AS performa_total,
   ps.status_performa,
   ps.warna_performa,
   -- KPI SCALAR
   kp.total_santri,
   kp.jumlah_l,
   kp.jumlah_p,
   kp.hadir,
   kp.izin,
   kp.sakit_uks,
   kp.sakit_rumah_rujukan,
   kp.alfa,
   kp.belum_absen,
   kp.alfa_tidak_absen,
   kt.total_kasus_aktif
       AS kasus_aktif,
   kp.persentase_hadir,
   kp.persentase_izin,
   kp.persentase_sakit_uks,
   kp.persentase_sakit_rumah_rujukan,
   kp.persentase_alfa,
   kp.persentase_belum_absen,
   -- KEBERSIHAN SCALAR
   ktb.jumlah_inspeksi
       AS jumlah_inspeksi_kebersihan,
   ktb.jumlah_bersih
       AS jumlah_bersih_kebersihan,
   ktb.jumlah_kotor
       AS jumlah_kotor_kebersihan,
   pf.persentase_kebersihan
       AS persentase_kebersihan,
   -- KEDISIPLINAN SCALAR
   dt.total_santri
       AS total_santri_kedisiplinan,
   dt.santri_dengan_kasus,
   dt.santri_tanpa_kasus,
   dt.persentase_kedisiplinan,
   kt.total_kasus_aktif
       AS kasus_aktif_kedisiplinan,
   kt.belum_selesai
       AS kasus_belum_selesai,
   -- KOMPOSISI HARIAN SCALAR
   kh.hadir
       AS komposisi_hadir,
   kh.izin
       AS komposisi_izin,
   kh.sakit_uks
       AS komposisi_sakit_uks,
   kh.sakit_rumah_rujukan
       AS komposisi_sakit_rumah_rujukan,
   kh.alfa
       AS komposisi_alfa,
   kh.belum_absen
       AS komposisi_belum_absen,
   kh.alfa_tidak_absen
       AS komposisi_alfa_tidak_absen,
   -- KASUS SCALAR
   kt.pelanggaran_ringan,
   kt.pelanggaran_sedang,
   kt.pelanggaran_berat,
   kt.pelanggaran_sangat_berat,
   kt.total_kasus_aktif
       AS total_kasus_aktif,
   kt.belum_selesai
       AS total_kasus_belum_selesai,
   kt.total_poin_bersih,
   --   JSON PARAMETER
   jsonb_build_object(
       'bobot_kehadiran',
           p.bobot_kehadiran,
       'bobot_kebersihan',
           p.bobot_kebersihan,
       'bobot_kedisiplinan',
           p.bobot_kedisiplinan,
       'ambang_istimewa',
           p.ambang_istimewa,
       'ambang_baik_sekali',
           p.ambang_baik_sekali,
       'ambang_baik',
           p.ambang_baik,
       'ambang_cukup',
           p.ambang_cukup,
       'warna_istimewa',
           p.warna_istimewa,
       'warna_baik_sekali',
           p.warna_baik_sekali,
       'warna_baik',
           p.warna_baik,
       'warna_cukup',
           p.warna_cukup,
       'warna_kurang',
           p.warna_kurang
   ) AS parameter_dashboard,
   -- JSON PERFORMA
   jsonb_build_object(
       'kehadiran',
           pf.persentase_kehadiran,
       'bobot_kehadiran',
           p.bobot_kehadiran,
       'kebersihan',
           pf.persentase_kebersihan,
       'bobot_kebersihan',
           p.bobot_kebersihan,
       'kedisiplinan',
           pf.persentase_kedisiplinan,
       'bobot_kedisiplinan',
           p.bobot_kedisiplinan,
       'performa_total',
           pf.performa_total,
       'status',
           ps.status_performa,
       'warna',
           ps.warna_performa
   ) AS performa_kepesantrenan,
   -- JSON KPI
   jsonb_build_object(
       'total_santri',
           kp.total_santri,
       'jumlah_l',
           kp.jumlah_l,
       'jumlah_p',
           kp.jumlah_p,
       'hadir',
           kp.hadir,
       'persentase_hadir',
           pf.persentase_kehadiran,
       'izin',
           kp.izin,
       'sakit_uks',
           kp.sakit_uks,
       'sakit_rumah_rujukan',
           kp.sakit_rumah_rujukan,
       'alfa',
           kp.alfa,
       'belum_absen',
           kp.belum_absen,
       'alfa_tidak_absen',
           kp.alfa_tidak_absen,
       'kasus_aktif',
           kt.total_kasus_aktif,
       'persentase_izin',
           kp.persentase_izin,
       'persentase_sakit_uks',
           kp.persentase_sakit_uks,
       'persentase_sakit_rumah_rujukan',
           kp.persentase_sakit_rumah_rujukan,
       'persentase_alfa',
           kp.persentase_alfa,
       'persentase_belum_absen',
           kp.persentase_belum_absen
   ) AS kpi,
   -- JSON KEBERSIHAN
   jsonb_build_object(
       'jumlah_inspeksi',
           ktb.jumlah_inspeksi,
       'jumlah_bersih',
           ktb.jumlah_bersih,
       'jumlah_kotor',
           ktb.jumlah_kotor,
       'persentase_kebersihan',
           pf.persentase_kebersihan
   ) AS kebersihan,
   -- JSON KEDISIPLINAN
   jsonb_build_object(
       'total_santri',
           dt.total_santri,
       'santri_dengan_kasus',
           dt.santri_dengan_kasus,
       'santri_tanpa_kasus',
           dt.santri_tanpa_kasus,
       'persentase_kedisiplinan',
           dt.persentase_kedisiplinan,
       'kasus_aktif',
           kt.total_kasus_aktif,
       'belum_selesai',
           kt.belum_selesai
   ) AS kedisiplinan,
   -- JSON DETAIL
   cj.data AS per_cabang,
   tj.data AS trend_kehadiran_30_hari,
	
   kpj.data AS top5_lokasi_perlu_perhatian,
  
   jsonb_build_object(
       'hadir',
           kh.hadir,
       'izin',
           kh.izin,
       'sakit_uks',
           kh.sakit_uks,
       'sakit_rumah_rujukan',
           kh.sakit_rumah_rujukan,
       'alfa',
           kh.alfa,
       'belum_absen',
           kh.belum_absen,
       'alfa_tidak_absen',
           kh.alfa_tidak_absen
   ) AS komposisi_harian,
   kaj.data AS kebersihan_area,
   kj.data AS kasus_aktif_json
FROM params p
CROSS JOIN performa_status ps
CROSS JOIN performa_final pf
CROSS JOIN kebersihan_total ktb
CROSS JOIN disiplin_total dt
CROSS JOIN kasus_total kt
CROSS JOIN komposisi_harian kh
CROSS JOIN kpi_total kp
CROSS JOIN trend_json tj
CROSS JOIN cabang_json cj
CROSS JOIN kebersihan_area_json kaj
CROSS JOIN kebersihan_prioritas_json kpj
CROSS JOIN kasus_json kj;
