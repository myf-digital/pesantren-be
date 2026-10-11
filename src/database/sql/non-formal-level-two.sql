WITH
-- 01. PARAMETER DASHBOARD
param AS (
   SELECT
       (CURRENT_DATE - 1)::date AS tanggal_dashboard,
       (CURRENT_DATE - 30)::date AS tanggal_mulai_trend,
       (CURRENT_DATE - 1)::date AS tanggal_akhir_trend,
       CASE EXTRACT(ISODOW FROM CURRENT_DATE - 1)
           WHEN 1 THEN 'Senin'
           WHEN 2 THEN 'Selasa'
           WHEN 3 THEN 'Rabu'
           WHEN 4 THEN 'Kamis'
           WHEN 5 THEN 'Jumat'
           WHEN 6 THEN 'Sabtu'
           WHEN 7 THEN 'Ahad'
       END::public."enum_jadwal_pelajaran_hari" AS hari_dashboard,
       /* BOBOT PERFORMA */
       0.50::numeric AS bobot_kehadiran_santri,
       0.50::numeric AS bobot_kehadiran_guru,
       /* THRESHOLD */
       100::numeric AS ambang_istimewa,
       90::numeric  AS ambang_baik_sekali,
       80::numeric  AS ambang_baik,
       75::numeric  AS ambang_cukup,
       /* BATAS VALIDASI PERIODE RAPOT BARU */
       20::numeric AS ambang_periode_rapot,
       /* WARNA */
       '#16A34A'::text AS warna_istimewa,
       '#16A34A'::text AS warna_baik_sekali,
       '#84CC16'::text AS warna_baik,
       '#EAB308'::text AS warna_cukup,
       '#DC2626'::text AS warna_kurang
),
-- 02. SANTRI MDA AKTIF
santri_mda AS (
   SELECT DISTINCT ON (s.id_santri)
       s.id_santri,
       s.nis,
       s.fullname AS nama_santri,
       s.gender,
       pks.id_kelas_mda,
       kf.nama_kelas_mda AS nama_kelas,
       kf.id_tingkat,
       t.tingkat,
       kf.id_lembaga,
       lpk.nama_lembaga,
       lpk.id_cabang,
       cb.nama_cabang,
       lpk.nama_lembaga::text AS jenis_lembaga
   FROM public.santri s
   INNER JOIN public.penempatan_kelas_santri pks
       ON pks.id_santri = s.id_santri
      AND pks.id_kelas_mda IS NOT NULL
      AND pks.status = 'Aktif'
      AND pks.deleted_at IS NULL
   INNER JOIN public.kelas_mda kf
       ON kf.id_kelas_mda = pks.id_kelas_mda
      AND kf.status = 'Aktif'
   INNER JOIN public.tingkat t
       ON t.id_tingkat = kf.id_tingkat
   INNER JOIN public.lembaga_pendidikan_kepesantrenan lpk
       ON lpk.id_lembaga = kf.id_lembaga
   LEFT JOIN public.cabang cb
       ON cb.id_cabang = lpk.id_cabang
   WHERE s.status = 1
   ORDER BY
       s.id_santri,
       pks.updated_at DESC NULLS LAST,
       pks.created_at DESC NULLS LAST
),
-- 03. ABSENSI SANTRI D-1
absensi_santri AS (
   SELECT DISTINCT ON (a.id_santri, a.tanggal)
       a.id_absen,
       a.id_santri,
       a.id_lokasi,
       a.id_jam_pelajaran,
       a.tanggal,
       a.waktu_absen,
       a.status_kehadiran::text AS status_kehadiran,
       a.keterangan,
       a.id_petugas,
       a.id_jurnal
   FROM public.absen_kelas_santri a
   INNER JOIN public.jurnal_kelas jk
       ON jk.id_jurnal = a.id_jurnal
      AND jk.deleted_at IS NULL
   INNER JOIN public.jadwal_pelajaran jp
       ON jp.id_jadwal = jk.id_jadwal
      AND jp.status = 'Aktif'
   INNER JOIN public.kelas_mda km
       ON km.id_kelas_mda = jp.id_kelas
      AND km.status = 'Aktif'
   INNER JOIN public.jenis_guru jg
       ON jg.id_jenisguru = jp.id_gmapel
      AND UPPER(TRIM(jg.lembaga_type)) = 'PESANTREN'
      AND jg.id_lembaga = km.id_lembaga
   CROSS JOIN param p
   WHERE a.tanggal = p.tanggal_dashboard
     AND COALESCE(a.is_deleted, FALSE) = FALSE
     AND a.deleted_at IS NULL
   ORDER BY
       a.id_santri,
       a.tanggal,
       a.created_at DESC NULLS LAST,
       a.id_absen DESC
),
-- 04. DETAIL KEHADIRAN SANTRI
detail_kehadiran_santri AS (
   SELECT
       sf.id_santri,
       sf.nis,
       sf.nama_santri,
       sf.gender,
       sf.id_kelas_mda,
       sf.nama_kelas,
       sf.id_tingkat,
       sf.tingkat,
       sf.id_lembaga,
       sf.nama_lembaga,
       sf.id_cabang,
       sf.nama_cabang,
       a.id_absen,
       a.tanggal,
       a.waktu_absen,
       a.status_kehadiran,
       a.keterangan,
       CASE WHEN a.status_kehadiran = 'Hadir' THEN 1 ELSE 0 END AS is_hadir,
       CASE WHEN a.status_kehadiran = 'Sakit' THEN 1 ELSE 0 END AS is_sakit,
       CASE WHEN a.status_kehadiran = 'Izin' THEN 1 ELSE 0 END AS is_izin,
       CASE WHEN a.status_kehadiran = 'Alfa' THEN 1 ELSE 0 END AS is_alfa,
       CASE WHEN a.id_absen IS NULL THEN 1 ELSE 0 END AS is_belum_absen
   FROM santri_mda sf
   LEFT JOIN absensi_santri a
       ON a.id_santri = sf.id_santri
),
-- 05. REKAP SANTRI
rekap_santri AS (
   SELECT
       COUNT(*) AS total_santri,
       COUNT(*) FILTER (WHERE is_hadir = 1) AS santri_hadir,
       COUNT(*) FILTER (WHERE is_sakit = 1) AS santri_sakit,
       COUNT(*) FILTER (WHERE is_izin = 1) AS santri_izin,
       COUNT(*) FILTER (WHERE is_alfa = 1) AS santri_alfa,
       COUNT(*) FILTER (WHERE is_belum_absen = 1) AS santri_belum_absen,
       COUNT(*) FILTER (
           WHERE UPPER(TRIM(gender::text)) IN ('L','LAKI-LAKI','LAKI LAKI')
       ) AS santri_l,
       COUNT(*) FILTER (
           WHERE UPPER(TRIM(gender::text)) IN ('P','PEREMPUAN')
       ) AS santri_p
   FROM detail_kehadiran_santri
),
-- 06. DETAIL GURU + MAPEL PESANTREN
detail_guru_mapel AS (
   SELECT
       jg.id_jenisguru,
       jg.nama_jenis_guru,
       jg.id_guru,
       p.nama_lengkap AS nama_guru,
       p.jenis_kelamin,
       jg.id_mapel,
       mp.nama_mapel,
       jg.id_tingkat,
       t.tingkat,
       jg.id_lembaga,
       jg.lembaga_type,
       lpk.id_cabang,
       cb.nama_cabang,
       COALESCE(lpk.nama_lembaga, '') AS nama_lembaga
   FROM public.jenis_guru jg
   LEFT JOIN public.pegawai p
       ON p.id_pegawai = jg.id_guru
      AND p.deleted_at IS NULL
   LEFT JOIN public.mata_pelajaran mp
       ON mp.id_mapel = jg.id_mapel
      AND UPPER(TRIM(mp.lembaga_type::text)) = 'PESANTREN'
   LEFT JOIN public.tingkat t
       ON t.id_tingkat = jg.id_tingkat
   INNER JOIN public.lembaga_pendidikan_kepesantrenan lpk
       ON jg.id_lembaga = lpk.id_lembaga
      AND UPPER(TRIM(jg.lembaga_type)) = 'PESANTREN'
   LEFT JOIN public.cabang cb
       ON cb.id_cabang = lpk.id_cabang
),
-- 07. GURU PESANTREN UNIK
guru_mda AS (
   SELECT DISTINCT ON (dgm.id_guru)
       dgm.id_guru,
       dgm.nama_guru,
       dgm.jenis_kelamin
   FROM detail_guru_mapel dgm
   WHERE dgm.id_guru IS NOT NULL
   ORDER BY dgm.id_guru, dgm.id_jenisguru
),
rekap_guru_total AS (
   SELECT
       COUNT(*) AS total_guru,
       COUNT(*) FILTER (
           WHERE UPPER(TRIM(jenis_kelamin::text)) IN ('L','LAKI-LAKI','LAKI LAKI')
       ) AS guru_l,
       COUNT(*) FILTER (
           WHERE UPPER(TRIM(jenis_kelamin::text)) IN ('P','PEREMPUAN')
       ) AS guru_p
   FROM guru_mda
),
-- 08. JADWAL PESANTREN + GROUP JADWAL / SESI MENGAJAR
jadwal_mda AS (
   SELECT
       p.tanggal_dashboard,
       jp.id_jadwal,
       jp.id_kelas,
       jp.id_gmapel,
       jp.id_jam_pelajaran,
       jp.id_semester,
       jp.id_tahunajaran,
       jp.id_lokasi,
       jp.hari,
       jp.status AS status_jadwal,
       jp.keterangan AS keterangan_jadwal,
       dgm.id_guru AS id_guru_asli,
       dgm.nama_guru AS nama_guru_asli,
       dgm.jenis_kelamin AS jenis_kelamin_guru,
       dgm.id_mapel,
       dgm.nama_mapel,
       dgm.id_tingkat,
       dgm.tingkat,
       dgm.id_lembaga,
       dgm.nama_lembaga,
       dgm.lembaga_type,
       dgm.id_cabang,
       dgm.nama_cabang,
       kf.nama_kelas_mda AS nama_kelas,
       jampel.nama_jampel,
       jampel.mulai AS jam_mulai_jadwal,
       jampel.selesai AS jam_selesai_jadwal,
       CASE
           WHEN jampel.mulai IS NOT NULL
            AND jampel.selesai IS NOT NULL
           THEN ROUND(
               (EXTRACT(EPOCH FROM (jampel.selesai - jampel.mulai)) / 60)::numeric,
               0
           )
           ELSE 0
       END AS durasi_menit_jadwal,
       sem.nama_semester,
       ta.tahun_ajaran,
       l.nama_lokasi AS nama_lokasi_kelas
   FROM param p
   INNER JOIN public.jadwal_pelajaran jp
       ON jp.hari = p.hari_dashboard
      AND jp.status = 'Aktif'
   INNER JOIN detail_guru_mapel dgm
       ON jp.id_gmapel = dgm.id_jenisguru
   INNER JOIN public.kelas_mda kf
       ON jp.id_kelas = kf.id_kelas_mda
      AND kf.status = 'Aktif'
   INNER JOIN public.jam_pelajaran jampel
       ON jp.id_jam_pelajaran = jampel.id_jampel
      AND jampel.status = 'A'
      AND UPPER(TRIM(jampel.lembaga_type::text)) = 'PESANTREN'
   LEFT JOIN public.semester sem
       ON jp.id_semester = sem.id_semester
   LEFT JOIN public.tahun_ajaran ta
       ON jp.id_tahunajaran = ta.id_tahunajaran
   LEFT JOIN public.lokasi l
       ON jp.id_lokasi = l.id_lokasi
),
-- 09. GURU PENGGANTI PER SLOT
jadwal_dengan_pengganti AS (
   SELECT DISTINCT ON (j.id_jadwal)
       j.*,
       gp.id_pengganti,
       gp.id_guru_pengganti,
       pg.nama_lengkap AS nama_guru_pengganti,
       CASE
           WHEN gp.id_pengganti IS NOT NULL
            AND gp.status_approval = 'Disetujui'
           THEN gp.id_guru_pengganti
           ELSE j.id_guru_asli
       END AS id_guru,
       CASE
           WHEN gp.id_pengganti IS NOT NULL
            AND gp.status_approval = 'Disetujui'
           THEN pg.nama_lengkap
           ELSE j.nama_guru_asli
       END AS nama_guru,
       CASE
           WHEN gp.id_pengganti IS NOT NULL
            AND gp.status_approval = 'Disetujui'
           THEN TRUE
           ELSE FALSE
       END AS is_pengganti
   FROM jadwal_mda j
   LEFT JOIN public.guru_pengganti gp
       ON gp.id_jadwal = j.id_jadwal
      AND gp.tanggal = j.tanggal_dashboard
      AND gp.status_approval = 'Disetujui'
   LEFT JOIN public.pegawai pg
       ON pg.id_pegawai = gp.id_guru_pengganti
      AND pg.deleted_at IS NULL
   ORDER BY
       j.id_jadwal,
       gp.created_at DESC NULLS LAST
),
-- 09A. URUTKAN SLOT
slot_urut AS (
   SELECT
       jdp.*,
       LAG(jdp.jam_selesai_jadwal) OVER (
           PARTITION BY
               jdp.id_kelas,
               jdp.id_guru_asli,
               jdp.id_mapel,
               jdp.hari,
               jdp.id_semester,
               jdp.id_tahunajaran
           ORDER BY
               jdp.jam_mulai_jadwal,
               jdp.id_jadwal
       ) AS jam_selesai_slot_sebelumnya
   FROM jadwal_dengan_pengganti jdp
),
-- 09B. TANDA AWAL GROUP
slot_tanda_group AS (
   SELECT
       su.*,
       CASE
           WHEN su.jam_selesai_slot_sebelumnya IS NULL THEN 1
           WHEN su.jam_mulai_jadwal = su.jam_selesai_slot_sebelumnya THEN 0
           ELSE 1
       END AS mulai_group
   FROM slot_urut su
),
-- 09C. NOMOR GROUP
slot_group AS (
   SELECT
       stg.*,
       SUM(stg.mulai_group) OVER (
           PARTITION BY
               stg.id_kelas,
               stg.id_guru_asli,
               stg.id_mapel,
               stg.hari,
               stg.id_semester,
               stg.id_tahunajaran
           ORDER BY
               stg.jam_mulai_jadwal,
               stg.id_jadwal
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS no_group
   FROM slot_tanda_group stg
),
-- 09D. GROUP JADWAL FINAL
group_jadwal AS (
   SELECT
       sg.id_kelas,
       sg.id_guru_asli,
       sg.id_mapel,
       sg.hari,
       sg.id_semester,
       sg.id_tahunajaran,
       sg.no_group,
       MIN(sg.id_jadwal) AS id_jadwal,
       ARRAY_AGG(sg.id_jadwal ORDER BY sg.jam_mulai_jadwal, sg.id_jadwal)
           AS id_jadwal_array,
       MIN(sg.jam_mulai_jadwal) AS jam_mulai_jadwal,
       MAX(sg.jam_selesai_jadwal) AS jam_selesai_jadwal,
       COUNT(*) AS jumlah_slot_jadwal,
       SUM(sg.durasi_menit_jadwal) AS durasi_menit_jadwal,
       MIN(sg.id_gmapel) AS id_gmapel,
       MIN(sg.id_tingkat) AS id_tingkat,
       MIN(sg.tingkat) AS tingkat,
       MIN(sg.id_lembaga) AS id_lembaga,
       MIN(sg.nama_lembaga) AS nama_lembaga,
       MIN(sg.id_cabang) AS id_cabang,
       MIN(sg.nama_cabang) AS nama_cabang,
       MIN(sg.nama_kelas) AS nama_kelas,
       MIN(sg.nama_mapel) AS nama_mapel,
       MIN(sg.nama_jampel) AS nama_jampel,
       MIN(sg.nama_guru_asli) AS nama_guru_asli,
       ARRAY_AGG(DISTINCT sg.id_guru) AS id_guru_efektif_array,
       COUNT(DISTINCT sg.id_guru) AS jumlah_guru_efektif,
       BOOL_OR(sg.is_pengganti) AS is_guru_pengganti,
       MIN(sg.nama_guru) AS nama_guru_efektif_min
   FROM slot_group sg
   GROUP BY
       sg.id_kelas,
       sg.id_guru_asli,
       sg.id_mapel,
       sg.hari,
       sg.id_semester,
       sg.id_tahunajaran,
       sg.no_group
),
-- 09E. NORMALISASI GURU EFEKTIF LEVEL GROUP
group_jadwal_final AS (
   SELECT
       gj.*,
       CASE
           WHEN gj.jumlah_guru_efektif = 1
           THEN gj.id_guru_efektif_array[1]
           ELSE gj.id_guru_asli
       END AS id_guru,
       CASE
           WHEN gj.jumlah_guru_efektif = 1
           THEN gj.nama_guru_efektif_min
           ELSE gj.nama_guru_asli
       END AS nama_guru
   FROM group_jadwal gj
),
-- 10. JURNAL KBM
jurnal AS (
   SELECT
       jk.id_jurnal,
       jk.id_jadwal,
       jk.id_petugas,
       ar.id_eksternal AS id_guru_jurnal,
       pj.nama_lengkap AS nama_guru_jurnal,
       jk.id_lokasi,
       jk.id_jam_pelajaran,
       jk.tanggal,
       jk.jam_mulai,
       jk.jam_selesai,
       jk.materi,
       jk.catatan,
       CASE
           WHEN jk.jam_selesai IS NOT NULL THEN TRUE
           ELSE FALSE
       END AS is_end_session,
       CASE
           WHEN jk.jam_mulai IS NOT NULL
            AND jk.jam_selesai IS NOT NULL
           THEN ROUND(
               (EXTRACT(EPOCH FROM (jk.jam_selesai - jk.jam_mulai)) / 60)::numeric,
               0
           )
           ELSE 0
       END AS durasi_menit_aktual
   FROM public.jurnal_kelas jk
   LEFT JOIN public.app_resource ar
       ON ar.resource_id = jk.id_petugas
   LEFT JOIN public.pegawai pj
       ON pj.id_pegawai = ar.id_eksternal
      AND pj.deleted_at IS NULL
   CROSS JOIN param p
   WHERE jk.tanggal = p.tanggal_dashboard
     AND jk.deleted_at IS NULL
),
-- 11. IZIN GURU
izin_guru AS (
   SELECT DISTINCT ON (pi.id_pegawai, p.tanggal_dashboard)
       pi.id_izin,
       pi.id_pegawai,
       pi.jenis_izin,
       pi.kondisi,
       pi.alasan,
       pi.tanggal_mulai,
       pi.tanggal_selesai,
       p.tanggal_dashboard
   FROM public.perizinan_santri pi
   CROSS JOIN param p
   WHERE pi.sumber_pengajuan = 'Pegawai'
     AND pi.id_pegawai IS NOT NULL
     AND pi.status_approval = 'Disetujui'
     AND pi.deleted_at IS NULL
     AND p.tanggal_dashboard BETWEEN pi.tanggal_mulai::date
                                 AND pi.tanggal_selesai::date
   ORDER BY
       pi.id_pegawai,
       p.tanggal_dashboard,
       pi.tanggal_mulai DESC,
       pi.created_at DESC NULLS LAST
),
-- 12. AGREGASI JURNAL PER GROUP
group_jurnal AS (
   SELECT
       gj.id_jadwal,
       COUNT(jr.id_jurnal) AS jumlah_jurnal,
       COUNT(jr.id_jurnal) FILTER (
           WHERE jr.jam_mulai IS NOT NULL
             AND COALESCE(jr.jam_selesai, jr.jam_mulai) IS NOT NULL
             AND jr.jam_mulai < gj.jam_selesai_jadwal
             AND COALESCE(jr.jam_selesai, jr.jam_mulai) > gj.jam_mulai_jadwal
       ) AS jumlah_jurnal_dalam_jadwal,
       COUNT(jr.id_jurnal) FILTER (
           WHERE jr.jam_mulai IS NOT NULL
             AND COALESCE(jr.jam_selesai, jr.jam_mulai) IS NOT NULL
             AND NOT (
                   jr.jam_mulai < gj.jam_selesai_jadwal
               AND COALESCE(jr.jam_selesai, jr.jam_mulai) > gj.jam_mulai_jadwal
             )
       ) AS jumlah_jurnal_di_luar_jadwal,
       COUNT(jr.id_jurnal) FILTER (
           WHERE jr.jam_mulai IS NOT NULL
             AND COALESCE(jr.jam_selesai, jr.jam_mulai) IS NOT NULL
             AND jr.jam_mulai < gj.jam_selesai_jadwal
             AND COALESCE(jr.jam_selesai, jr.jam_mulai) > gj.jam_mulai_jadwal
             AND jr.id_guru_jurnal = ANY(gj.id_guru_efektif_array)
       ) AS jumlah_jurnal_valid,
       COUNT(DISTINCT jr.id_guru_jurnal) FILTER (
           WHERE jr.id_guru_jurnal IS NOT NULL
       ) AS jumlah_guru_jurnal,
       ARRAY_AGG(DISTINCT jr.id_guru_jurnal)
           FILTER (WHERE jr.id_guru_jurnal IS NOT NULL)
           AS id_guru_jurnal_array
   FROM group_jadwal_final gj
   LEFT JOIN jurnal jr
       ON jr.id_jadwal = ANY(gj.id_jadwal_array)
   GROUP BY gj.id_jadwal
),
-- 12A. REPRESENTATIVE JURNAL
representative_jurnal AS (
   SELECT
       gj.id_jadwal,
       jr.id_jurnal,
       jr.id_guru_jurnal,
       jr.nama_guru_jurnal,
       jr.jam_mulai AS jam_mulai_aktual,
       jr.jam_selesai AS jam_selesai_aktual,
       jr.is_end_session,
       jr.materi,
       jr.catatan,
       jr.durasi_menit_aktual
   FROM group_jadwal_final gj
   LEFT JOIN LATERAL (
       SELECT j.*
       FROM jurnal j
       WHERE j.id_jadwal = ANY(gj.id_jadwal_array)
       ORDER BY j.jam_mulai ASC NULLS LAST, j.id_jurnal
       LIMIT 1
   ) jr ON TRUE
),
-- 12B. DETAIL GROUP SESI
detail_sesi AS (
   SELECT
       gj.id_jadwal,
       gj.id_kelas,
       gj.id_guru_asli,
       gj.nama_guru_asli,
       gj.id_guru,
       gj.nama_guru,
       gj.id_mapel,
       gj.nama_mapel,
       gj.id_tingkat,
       gj.tingkat,
       gj.id_lembaga,
       gj.nama_lembaga,
       gj.id_cabang,
       gj.nama_cabang,
       gj.nama_kelas,
       gj.nama_jampel,
       gj.jam_mulai_jadwal,
       gj.jam_selesai_jadwal,
       gj.jumlah_slot_jadwal,
       gj.durasi_menit_jadwal,
       gj.is_guru_pengganti,
       gj.id_jadwal_array,
       gj.id_guru_efektif_array,
       gj.jumlah_guru_efektif,
       gjr.jumlah_jurnal,
       gjr.jumlah_jurnal_dalam_jadwal,
       gjr.jumlah_jurnal_di_luar_jadwal,
       gjr.jumlah_jurnal_valid,
       gjr.jumlah_guru_jurnal,
       gjr.id_guru_jurnal_array,
       rj.id_jurnal,
       rj.id_guru_jurnal,
       rj.nama_guru_jurnal,
       rj.jam_mulai_aktual,
       CASE
           WHEN rj.id_jurnal IS NULL THEN NULL
           WHEN rj.jam_selesai_aktual IS NOT NULL
               THEN rj.jam_selesai_aktual
           ELSE gj.jam_selesai_jadwal
       END AS jam_selesai_aktual,
       rj.is_end_session,
       rj.materi,
       rj.catatan,
       COALESCE(rj.durasi_menit_aktual, 0) AS durasi_menit_aktual,
       ig.id_izin AS id_izin_guru,
       ig.jenis_izin AS jenis_izin_guru,
       ig.alasan AS alasan_izin_guru,
       /* STATUS AUDIT */
       CASE
           WHEN gjr.jumlah_jurnal = 0
               THEN 'TIDAK_ADA_JURNAL'
           WHEN gjr.jumlah_jurnal_dalam_jadwal = 0
               THEN 'JURNAL_DI_LUAR_JADWAL'
           WHEN gjr.jumlah_jurnal_valid = 0
               THEN 'GURU_BERBEDA_TANPA_PENGGANTI'
           WHEN gj.jumlah_guru_efektif > 1
               THEN 'MULTI_GURU_EFEKTIF'
           ELSE 'VALID'
       END AS status_audit,
       /* STATUS GURU */
       CASE
           WHEN gjr.jumlah_jurnal_valid > 0
               THEN 'Hadir'
           WHEN ig.id_izin IS NOT NULL
            AND UPPER(TRIM(ig.jenis_izin::text)) = 'SAKIT'
               THEN 'Sakit'
           WHEN ig.id_izin IS NOT NULL
            AND UPPER(TRIM(ig.jenis_izin::text)) = 'IZIN'
               THEN 'Izin'
           WHEN gjr.jumlah_jurnal = 0
               THEN 'Belum Terverifikasi'
           WHEN gjr.jumlah_jurnal_valid = 0
               THEN 'Perlu Audit'
           ELSE 'Belum Terverifikasi'
       END AS status_kehadiran_guru,
       CASE
           WHEN gjr.jumlah_jurnal_valid > 0 THEN 1
           ELSE 0
       END AS is_guru_hadir,
       CASE
           WHEN gjr.jumlah_jurnal_valid = 0
            AND ig.id_izin IS NOT NULL
            AND UPPER(TRIM(ig.jenis_izin::text)) = 'SAKIT'
           THEN 1 ELSE 0
       END AS is_guru_sakit,
       CASE
           WHEN gjr.jumlah_jurnal_valid = 0
            AND ig.id_izin IS NOT NULL
            AND UPPER(TRIM(ig.jenis_izin::text)) = 'IZIN'
           THEN 1 ELSE 0
       END AS is_guru_izin,
       0 AS is_guru_alfa,
       /* STATUS SESI */
       CASE
           WHEN gjr.jumlah_jurnal_valid > 0
               THEN 1
           ELSE 0
       END AS is_sesi_terlaksana,
       CASE
           WHEN gjr.jumlah_jurnal = 0
               THEN 1
           ELSE 0
       END AS is_sesi_tidak_terlaksana,
       CASE
           WHEN gjr.jumlah_jurnal > 0
            AND gjr.jumlah_jurnal_valid = 0
               THEN 1
           ELSE 0
       END AS is_sesi_anomali
   FROM group_jadwal_final gj
   INNER JOIN group_jurnal gjr
       ON gjr.id_jadwal = gj.id_jadwal
   LEFT JOIN representative_jurnal rj
       ON rj.id_jadwal = gj.id_jadwal
   LEFT JOIN izin_guru ig
       ON ig.id_pegawai = gj.id_guru
      AND ig.tanggal_dashboard = (
          SELECT tanggal_dashboard FROM param
      )
),
-- 13. REKAP SESI/GURU - BASIS KPI GURU = SESI
rekap_sesi AS (
   SELECT
       COUNT(*) AS sesi_terjadwal,
       COUNT(*) FILTER (
           WHERE is_sesi_terlaksana = 1
       ) AS sesi_terlaksana,
       COUNT(*) FILTER (
           WHERE is_sesi_tidak_terlaksana = 1
       ) AS sesi_tidak_terlaksana,
       COUNT(*) FILTER (
           WHERE is_sesi_anomali = 1
       ) AS sesi_anomali,
       COUNT(*) FILTER (
           WHERE status_audit = 'VALID'
       ) AS sesi_valid,
       COUNT(*) FILTER (
           WHERE status_audit = 'JURNAL_DI_LUAR_JADWAL'
       ) AS jurnal_di_luar_jadwal,
       COUNT(*) FILTER (
           WHERE status_audit = 'GURU_BERBEDA_TANPA_PENGGANTI'
       ) AS guru_berbeda_tanpa_pengganti,
       COUNT(*) FILTER (
           WHERE status_audit = 'MULTI_GURU_EFEKTIF'
       ) AS multi_guru_efektif,
       COUNT(*) FILTER (
           WHERE status_audit = 'TIDAK_ADA_JURNAL'
       ) AS tidak_ada_jurnal,
       COUNT(*) FILTER (
           WHERE is_guru_hadir = 1
       ) AS sesi_guru_hadir,
       COUNT(*) FILTER (
           WHERE is_guru_izin = 1
       ) AS sesi_guru_izin,
       COUNT(*) FILTER (
           WHERE is_guru_sakit = 1
       ) AS sesi_guru_sakit,
       COUNT(*) FILTER (
           WHERE is_guru_alfa = 1
       ) AS sesi_guru_alfa,
       COUNT(*) FILTER (
           WHERE is_guru_pengganti IS TRUE
       ) AS sesi_dengan_pengganti,
       COALESCE(SUM(jumlah_slot_jadwal), 0) AS jp_terjadwal,
       COALESCE(SUM(CASE WHEN is_sesi_terlaksana = 1 THEN jumlah_slot_jadwal ELSE 0 END), 0) AS jp_terlaksana,
       COALESCE(SUM(durasi_menit_jadwal), 0) AS total_menit_terjadwal,
       COALESCE(SUM(CASE WHEN is_sesi_terlaksana = 1 THEN durasi_menit_aktual ELSE 0 END), 0) AS total_menit_terlaksana
   FROM detail_sesi
),
-- 14. GURU UNIK - STATUS HARIAN
guru_status_harian AS (
   SELECT
       gf.id_guru,
       gf.nama_guru,
       gf.jenis_kelamin,
       CASE
           WHEN COUNT(ds.id_jadwal) FILTER (WHERE ds.is_guru_hadir = 1) > 0
            AND COUNT(ds.id_jadwal) FILTER (WHERE ds.is_guru_hadir = 0) > 0
               THEN 'Hadir Sebagian'
           WHEN COUNT(ds.id_jadwal) FILTER (WHERE ds.is_guru_hadir = 1) > 0
               THEN 'Hadir Penuh'
           WHEN COUNT(ds.id_jadwal) FILTER (WHERE ds.is_guru_sakit = 1) > 0
               THEN 'Sakit'
           WHEN COUNT(ds.id_jadwal) FILTER (WHERE ds.is_guru_izin = 1) > 0
               THEN 'Izin'
           WHEN COUNT(ds.id_jadwal) FILTER (
                   WHERE ds.status_kehadiran_guru = 'Perlu Audit'
                ) > 0
               THEN 'Perlu Audit'
           ELSE 'Belum Terverifikasi'
       END AS status_harian
   FROM guru_mda gf
   LEFT JOIN detail_sesi ds
       ON ds.id_guru = gf.id_guru
   GROUP BY gf.id_guru, gf.nama_guru, gf.jenis_kelamin
),
rekap_guru_unik AS (
   SELECT
       COUNT(*) AS total_guru,
       COUNT(*) FILTER (WHERE status_harian IN ('Hadir','Hadir Penuh','Hadir Sebagian')) AS guru_hadir,
       COUNT(*) FILTER (WHERE status_harian = 'Hadir Penuh') AS guru_hadir_penuh,
       COUNT(*) FILTER (WHERE status_harian = 'Hadir Sebagian') AS guru_hadir_sebagian,
       COUNT(*) FILTER (WHERE status_harian = 'Izin') AS guru_izin,
       COUNT(*) FILTER (WHERE status_harian = 'Sakit') AS guru_sakit,
       COUNT(*) FILTER (WHERE status_harian = 'Tidak Hadir') AS guru_alfa,
       COUNT(*) FILTER (WHERE status_harian = 'Belum Terverifikasi') AS guru_belum_terverifikasi,
       COUNT(*) FILTER (WHERE status_harian = 'Perlu Audit') AS guru_perlu_audit
   FROM guru_status_harian
),
-- 14B. KEHADIRAN GURU YANG MEMILIKI JADWAL PADA TANGGAL DASHBOARD
guru_terjadwal_status AS (
   SELECT
       ds.id_guru,
       CASE
           WHEN COUNT(*) FILTER (WHERE ds.is_guru_hadir = 1) > 0
            AND COUNT(*) FILTER (WHERE ds.is_guru_hadir = 0) > 0
               THEN 'Hadir Sebagian'
           WHEN COUNT(*) FILTER (WHERE ds.is_guru_hadir = 1) > 0
               THEN 'Hadir Penuh'
           WHEN COUNT(*) FILTER (WHERE ds.is_guru_sakit = 1) > 0 THEN 'Sakit'
           WHEN COUNT(*) FILTER (WHERE ds.is_guru_izin = 1) > 0 THEN 'Izin'
           WHEN COUNT(*) FILTER (WHERE ds.status_kehadiran_guru = 'Perlu Audit') > 0
               THEN 'Perlu Audit'
           ELSE 'Belum Terverifikasi'
       END AS status_harian
   FROM detail_sesi ds
   WHERE ds.id_guru IS NOT NULL
   GROUP BY ds.id_guru
),
rekap_guru_terjadwal AS (
   SELECT
       COUNT(*) AS guru_terjadwal,
       COUNT(*) FILTER (WHERE status_harian IN ('Hadir Penuh','Hadir Sebagian')) AS guru_hadir_terjadwal,
       COUNT(*) FILTER (WHERE status_harian = 'Hadir Penuh') AS guru_hadir_penuh_terjadwal,
       COUNT(*) FILTER (WHERE status_harian = 'Hadir Sebagian') AS guru_hadir_sebagian_terjadwal,
       COUNT(*) FILTER (WHERE status_harian = 'Izin') AS guru_izin_terjadwal,
       COUNT(*) FILTER (WHERE status_harian = 'Sakit') AS guru_sakit_terjadwal,
       COUNT(*) FILTER (WHERE status_harian = 'Tidak Hadir') AS guru_alfa_terjadwal,
       COUNT(*) FILTER (WHERE status_harian = 'Belum Terverifikasi') AS guru_belum_terverifikasi_terjadwal,
       COUNT(*) FILTER (WHERE status_harian = 'Perlu Audit') AS guru_perlu_audit_terjadwal
   FROM guru_terjadwal_status
),
-- 15. KELAS MDA AKTIF + DISTRIBUSI BERDASARKAN LEMBAGA
kelas_mda_aktif AS (
   SELECT
       k.id_kelas_mda,
       k.id_lembaga,
       lpk.nama_lembaga,
       lpk.id_cabang,
       cb.nama_cabang,
       lpk.nama_lembaga::text AS jenis_lembaga,
       k.id_tingkat,
       t.tingkat
   FROM public.kelas_mda k
   INNER JOIN public.lembaga_pendidikan_kepesantrenan lpk
       ON lpk.id_lembaga = k.id_lembaga
      AND lpk.deleted_at IS NULL
   INNER JOIN public.tingkat t
       ON t.id_tingkat = k.id_tingkat
   LEFT JOIN public.cabang cb
       ON cb.id_cabang = lpk.id_cabang
   WHERE k.status = 'Aktif'
),
rekap_kelas AS (
   SELECT
       COUNT(*) AS total_kelas,
       COALESCE(
           (
               SELECT jsonb_agg(
                   jsonb_build_object(
                       'id_cabang', x.id_cabang,
                       'nama_cabang', x.nama_cabang,
                       'id_lembaga', x.id_lembaga,
                       'nama_lembaga', x.nama_lembaga,
                       'label_lembaga_mda', x.label_lembaga_mda,
                       'jumlah_kelas', x.jumlah_kelas
                   )
                   ORDER BY x.nama_cabang, x.nama_lembaga
               )
               FROM (
                   SELECT
                       kma.id_cabang,
                       kma.nama_cabang,
                       kma.id_lembaga,
                       kma.nama_lembaga,
                       CASE
                           WHEN kma.nama_lembaga ILIKE '%Asshiddiqiyah 3 Putra%' THEN 'MDA3'
                           WHEN kma.nama_lembaga ILIKE '%Asshiddiqiyah 3 Putri%' THEN 'MDA3'
                           WHEN kma.nama_lembaga ILIKE '%Asshiddiqiyah 4%' THEN 'MDA4'
                           ELSE kma.nama_lembaga
                       END AS label_lembaga_mda,
                       COUNT(DISTINCT kma.id_kelas_mda)::integer AS jumlah_kelas
                   FROM kelas_mda_aktif kma
                   GROUP BY
                       kma.id_cabang, kma.nama_cabang,
                       kma.id_lembaga, kma.nama_lembaga
               ) x
           ),
           '[]'::jsonb
       ) AS distribusi_lembaga_mda
   FROM kelas_mda_aktif
),
-- 16. KPI UTAMA
kpi AS (
   SELECT
       rs.total_santri,
       rs.santri_hadir,
       rs.santri_sakit,
       rs.santri_izin,
       rs.santri_alfa,
       rs.santri_belum_absen,
       rs.santri_l,
       rs.santri_p,
       rg.total_guru,
       rg.guru_l,
       rg.guru_p,
       ru.guru_hadir,
       ru.guru_hadir_penuh,
       ru.guru_hadir_sebagian,
       ru.guru_izin,
       ru.guru_sakit,
       ru.guru_alfa,
       ru.guru_belum_terverifikasi,
       ru.guru_perlu_audit,
       rgt.guru_terjadwal,
       rgt.guru_hadir_terjadwal,
       rgt.guru_hadir_penuh_terjadwal,
       rgt.guru_hadir_sebagian_terjadwal,
       rgt.guru_izin_terjadwal,
       rgt.guru_sakit_terjadwal,
       rgt.guru_alfa_terjadwal,
       rgt.guru_belum_terverifikasi_terjadwal,
       rgt.guru_perlu_audit_terjadwal,
       rkls.total_kelas,
       rkls.distribusi_lembaga_mda,
       rse.sesi_terjadwal,
       rse.sesi_terlaksana,
       rse.sesi_tidak_terlaksana,
       rse.sesi_anomali,
       rse.sesi_valid,
       rse.sesi_guru_hadir,
       rse.sesi_guru_izin,
       rse.sesi_guru_sakit,
       rse.sesi_guru_alfa,
       rse.sesi_dengan_pengganti,
       rse.jp_terjadwal,
       rse.jp_terlaksana,
       rse.total_menit_terjadwal,
       rse.total_menit_terlaksana,
       CASE
           WHEN rs.total_santri > 0
           THEN ROUND(rs.santri_hadir::numeric / rs.total_santri * 100, 1)
           ELSE 0
       END AS persen_kehadiran_santri,
       CASE
           WHEN rse.sesi_terjadwal > 0
           THEN ROUND(rse.sesi_guru_hadir::numeric / rse.sesi_terjadwal * 100, 1)
           ELSE 0
       END AS persen_kehadiran_guru,
       CASE
           WHEN rse.sesi_terjadwal > 0
           THEN ROUND(rse.sesi_terlaksana::numeric / rse.sesi_terjadwal * 100, 1)
           ELSE 0
       END AS persen_sesi_mengajar
   FROM rekap_santri rs
   CROSS JOIN rekap_guru_total rg
   CROSS JOIN rekap_guru_unik ru
   CROSS JOIN rekap_guru_terjadwal rgt
   CROSS JOIN rekap_kelas rkls
   CROSS JOIN rekap_sesi rse
),
-- 17. PERFORMA TOTAL - 50% SANTRI + 50% GURU
performa AS (
   SELECT
       k.*,
       ROUND(
           (k.persen_kehadiran_santri * p.bobot_kehadiran_santri)
           +
           (k.persen_kehadiran_guru * p.bobot_kehadiran_guru),
           1
       ) AS performa_total
   FROM kpi k
   CROSS JOIN param p
),
-- 18. STATUS PERFORMA
performa_status AS (
   SELECT
       pf.*,
       CASE
           WHEN pf.performa_total >= p.ambang_istimewa THEN 'ISTIMEWA'
           WHEN pf.performa_total >= p.ambang_baik_sekali THEN 'BAIK SEKALI'
           WHEN pf.performa_total >= p.ambang_baik THEN 'BAIK'
           WHEN pf.performa_total >= p.ambang_cukup THEN 'CUKUP'
           ELSE 'KURANG BAIK'
       END AS status_performa,
       CASE
           WHEN pf.performa_total >= p.ambang_istimewa THEN p.warna_istimewa
           WHEN pf.performa_total >= p.ambang_baik_sekali THEN p.warna_baik_sekali
           WHEN pf.performa_total >= p.ambang_baik THEN p.warna_baik
           WHEN pf.performa_total >= p.ambang_cukup THEN p.warna_cukup
           ELSE p.warna_kurang
       END AS warna_performa
   FROM performa pf
   CROSS JOIN param p
),
-- 19. REKAP UNIT/LEMBAGA/JENJANG - SANTRI
unit_santri AS (
   SELECT
       sf.id_cabang,
       sf.nama_cabang,
       sf.jenis_lembaga,
       COUNT(*) AS total_santri,
       COUNT(*) FILTER (WHERE dks.is_hadir = 1) AS santri_hadir,
       COUNT(*) FILTER (WHERE dks.is_sakit = 1) AS santri_sakit,
       COUNT(*) FILTER (WHERE dks.is_izin = 1) AS santri_izin,
       COUNT(*) FILTER (WHERE dks.is_alfa = 1) AS santri_alfa,
       COUNT(*) FILTER (WHERE dks.is_belum_absen = 1) AS santri_belum_absen
   FROM santri_mda sf
   LEFT JOIN detail_kehadiran_santri dks
       ON dks.id_santri = sf.id_santri
   GROUP BY
       sf.id_cabang,
       sf.nama_cabang,
       sf.jenis_lembaga
),
-- 20. REKAP UNIT/LEMBAGA - KELAS
unit_kelas AS (
   SELECT
       k.id_cabang,
       k.jenis_lembaga,
       COUNT(*) AS total_kelas
   FROM kelas_mda_aktif k
   GROUP BY
       k.id_cabang,
       k.jenis_lembaga
),
-- 21. REKAP UNIT/JENJANG - GURU UNIK
unit_guru AS (
   SELECT
       lpk.id_cabang,
       lpk.nama_lembaga::text AS jenis_lembaga,
       COUNT(DISTINCT dgm.id_guru) AS total_guru
   FROM detail_guru_mapel dgm
   INNER JOIN public.lembaga_pendidikan_kepesantrenan lpk
       ON lpk.id_lembaga = dgm.id_lembaga
      AND lpk.deleted_at IS NULL
   WHERE dgm.id_guru IS NOT NULL
     AND UPPER(TRIM(dgm.lembaga_type)) = 'PESANTREN'
   GROUP BY
       lpk.id_cabang,
       lpk.nama_lembaga
),
-- 22. REKAP UNIT/JENJANG - SESI + JP
unit_sesi AS (
   SELECT
       lpk.id_cabang,
       lpk.nama_lembaga::text AS jenis_lembaga,
       COUNT(*) AS sesi_terjadwal,
       COUNT(*) FILTER (WHERE ds.is_sesi_terlaksana = 1) AS sesi_terlaksana,
       COUNT(*) FILTER (WHERE ds.is_sesi_tidak_terlaksana = 1) AS sesi_tidak_terlaksana,
       COUNT(*) FILTER (WHERE ds.is_sesi_anomali = 1) AS sesi_anomali,
       COUNT(*) FILTER (WHERE ds.status_audit = 'JURNAL_DI_LUAR_JADWAL') AS jurnal_di_luar_jadwal,
       COUNT(*) FILTER (WHERE ds.status_audit = 'GURU_BERBEDA_TANPA_PENGGANTI') AS guru_berbeda_tanpa_pengganti,
       COUNT(*) FILTER (WHERE ds.status_audit = 'TIDAK_ADA_JURNAL') AS tidak_ada_jurnal,
       COUNT(*) FILTER (WHERE ds.is_guru_hadir = 1) AS sesi_guru_hadir,
       COUNT(*) FILTER (WHERE ds.is_guru_izin = 1) AS sesi_guru_izin,
       COUNT(*) FILTER (WHERE ds.is_guru_sakit = 1) AS sesi_guru_sakit,
       COUNT(*) FILTER (WHERE ds.is_guru_alfa = 1) AS sesi_guru_alfa,
       COUNT(*) FILTER (WHERE ds.is_guru_pengganti IS TRUE) AS sesi_dengan_pengganti,
       COALESCE(SUM(ds.jumlah_slot_jadwal), 0) AS jp_terjadwal,
       COALESCE(SUM(CASE WHEN ds.is_sesi_terlaksana = 1 THEN ds.jumlah_slot_jadwal ELSE 0 END), 0) AS jp_terlaksana,
       COALESCE(SUM(ds.durasi_menit_jadwal), 0) AS total_menit_terjadwal,
       COALESCE(SUM(CASE WHEN ds.is_sesi_terlaksana = 1 THEN ds.durasi_menit_aktual ELSE 0 END), 0) AS total_menit_terlaksana
   FROM detail_sesi ds
   INNER JOIN public.lembaga_pendidikan_kepesantrenan lpk
       ON lpk.id_lembaga = ds.id_lembaga
      AND lpk.deleted_at IS NULL
   GROUP BY
       lpk.id_cabang,
       lpk.nama_lembaga
),
-- 23. DETAIL UNIT FINAL
unit_detail AS (
   SELECT
       us.id_cabang,
       us.nama_cabang,
       us.jenis_lembaga,
       us.total_santri,
       us.santri_hadir,
       us.santri_sakit,
       us.santri_izin,
       us.santri_alfa,
       us.santri_belum_absen,
       COALESCE(uk.total_kelas, 0) AS total_kelas,
       COALESCE(ug.total_guru, 0) AS total_guru,
       COALESCE(ue.sesi_terjadwal, 0) AS sesi_terjadwal,
       COALESCE(ue.sesi_terlaksana, 0) AS sesi_terlaksana,
       COALESCE(ue.sesi_tidak_terlaksana, 0) AS sesi_tidak_terlaksana,
       COALESCE(ue.sesi_anomali, 0) AS sesi_anomali,
       COALESCE(ue.jurnal_di_luar_jadwal, 0) AS jurnal_di_luar_jadwal,
       COALESCE(ue.guru_berbeda_tanpa_pengganti, 0) AS guru_berbeda_tanpa_pengganti,
       COALESCE(ue.tidak_ada_jurnal, 0) AS tidak_ada_jurnal,
       COALESCE(ue.sesi_guru_hadir, 0) AS sesi_guru_hadir,
       COALESCE(ue.sesi_guru_izin, 0) AS sesi_guru_izin,
       COALESCE(ue.sesi_guru_sakit, 0) AS sesi_guru_sakit,
       COALESCE(ue.sesi_guru_alfa, 0) AS sesi_guru_alfa,
       COALESCE(ue.sesi_dengan_pengganti, 0) AS sesi_dengan_pengganti,
       COALESCE(ue.jp_terjadwal, 0) AS jp_terjadwal,
       COALESCE(ue.jp_terlaksana, 0) AS jp_terlaksana,
       COALESCE(ue.total_menit_terjadwal, 0) AS total_menit_terjadwal,
       COALESCE(ue.total_menit_terlaksana, 0) AS total_menit_terlaksana,
       CASE
           WHEN us.total_santri > 0
           THEN ROUND(us.santri_hadir::numeric / us.total_santri * 100, 1)
           ELSE 0
       END AS persen_kehadiran_santri,
       CASE
           WHEN COALESCE(ue.sesi_terjadwal, 0) > 0
           THEN ROUND(ue.sesi_guru_hadir::numeric / ue.sesi_terjadwal * 100, 1)
           ELSE 0
       END AS persen_kehadiran_guru,
       CASE
           WHEN COALESCE(ue.sesi_terjadwal, 0) > 0
           THEN ROUND(ue.sesi_terlaksana::numeric / ue.sesi_terjadwal * 100, 1)
           ELSE 0
       END AS persen_sesi_mengajar,
       CASE
           WHEN COALESCE(ue.jp_terjadwal, 0) > 0
           THEN ROUND(ue.jp_terlaksana::numeric / ue.jp_terjadwal * 100, 1)
           ELSE 0
       END AS persen_jp_terlaksana
   FROM unit_santri us
   LEFT JOIN unit_kelas uk
       ON uk.id_cabang = us.id_cabang
      AND uk.jenis_lembaga = us.jenis_lembaga
   LEFT JOIN unit_guru ug
       ON ug.id_cabang = us.id_cabang
      AND ug.jenis_lembaga = us.jenis_lembaga
   LEFT JOIN unit_sesi ue
       ON ue.id_cabang = us.id_cabang
      AND ue.jenis_lembaga = us.jenis_lembaga
),
-- 24. PERFORMA UNIT
unit_performa AS (
   SELECT
       ud.*,
       ROUND(
           (ud.persen_kehadiran_santri * p.bobot_kehadiran_santri)
           +
           (ud.persen_kehadiran_guru * p.bobot_kehadiran_guru),
           1
       ) AS performa_unit
   FROM unit_detail ud
   CROSS JOIN param p
),
unit_performa_status AS (
   SELECT
       up.*,
       CASE
           WHEN up.performa_unit >= p.ambang_istimewa THEN 'ISTIMEWA'
           WHEN up.performa_unit >= p.ambang_baik_sekali THEN 'BAIK SEKALI'
           WHEN up.performa_unit >= p.ambang_baik THEN 'BAIK'
           WHEN up.performa_unit >= p.ambang_cukup THEN 'CUKUP'
           ELSE 'KURANG BAIK'
       END AS status_performa_unit,
       CASE
           WHEN up.performa_unit >= p.ambang_istimewa THEN p.warna_istimewa
           WHEN up.performa_unit >= p.ambang_baik_sekali THEN p.warna_baik_sekali
           WHEN up.performa_unit >= p.ambang_baik THEN p.warna_baik
           WHEN up.performa_unit >= p.ambang_cukup THEN p.warna_cukup
           ELSE p.warna_kurang
       END AS warna_performa_unit
   FROM unit_performa up
   CROSS JOIN param p
),
-- 25. JSON UNIT
unit_json AS (
   SELECT
       COALESCE(
           jsonb_agg(
               jsonb_build_object(
                   'id_cabang', x.id_cabang,
                   'nama_cabang', x.nama_cabang,
                   'lembaga_mda', x.lembaga_json
               )
               ORDER BY x.nama_cabang
           ),
           '[]'::jsonb
       ) AS data
   FROM (
       SELECT
           u.id_cabang,
           u.nama_cabang,
           jsonb_agg(
               jsonb_build_object(
                   'nama_lembaga', u.jenis_lembaga,
                   'label_lembaga_mda',
                       CASE
                           WHEN u.jenis_lembaga ILIKE '%Asshiddiqiyah 3 Putra%' THEN 'MDA3'
                           WHEN u.jenis_lembaga ILIKE '%Asshiddiqiyah 3 Putri%' THEN 'MDA3'
                           WHEN u.jenis_lembaga ILIKE '%Asshiddiqiyah 4%' THEN 'MDA4'
                           ELSE u.jenis_lembaga
                       END,
                   'performa', u.performa_unit,
                   'status', u.status_performa_unit,
                   'warna', u.warna_performa_unit,
                   'santri', u.total_santri,
                   'kelas', u.total_kelas,
                   'guru', u.total_guru,
                   'absensi_santri', u.persen_kehadiran_santri,
                   'absensi_guru', u.persen_kehadiran_guru,
                   'sesi_terjadwal', u.sesi_terjadwal,
                   'sesi_terlaksana', u.sesi_terlaksana,
                   'sesi_tidak_terlaksana', u.sesi_tidak_terlaksana,
                   'sesi_anomali', u.sesi_anomali,
                   'jurnal_di_luar_jadwal', u.jurnal_di_luar_jadwal,
                   'guru_berbeda_tanpa_pengganti', u.guru_berbeda_tanpa_pengganti,
                   'tidak_ada_jurnal', u.tidak_ada_jurnal,
                   'sesi_guru_hadir', u.sesi_guru_hadir,
                   'sesi_guru_izin', u.sesi_guru_izin,
                   'sesi_guru_sakit', u.sesi_guru_sakit,
                   'sesi_guru_alfa', u.sesi_guru_alfa,
                   'sesi_dengan_pengganti', u.sesi_dengan_pengganti,
                   'jp_terjadwal', u.jp_terjadwal,
                   'jp_terlaksana', u.jp_terlaksana,
                   'persen_jp_terlaksana', u.persen_jp_terlaksana,
                   'total_menit_terjadwal', u.total_menit_terjadwal,
                   'total_menit_terlaksana', u.total_menit_terlaksana,
                   'persen_sesi_mengajar', u.persen_sesi_mengajar
               )
               ORDER BY u.jenis_lembaga
           ) AS lembaga_json
       FROM unit_performa_status u
       GROUP BY
           u.id_cabang,
           u.nama_cabang
   ) x
),
-- 26. TREND 30 HARI
trend_tanggal AS (
   SELECT gs::date AS tanggal
   FROM param p
   CROSS JOIN LATERAL generate_series(
       p.tanggal_mulai_trend,
       p.tanggal_akhir_trend,
       INTERVAL '1 day'
   ) gs
),
absensi_trend AS (
   SELECT DISTINCT ON (a.id_santri, a.tanggal)
       a.id_santri,
       a.tanggal,
       a.status_kehadiran::text AS status_kehadiran
   FROM public.absen_kelas_santri a
   INNER JOIN public.jurnal_kelas jk
       ON jk.id_jurnal = a.id_jurnal
      AND jk.deleted_at IS NULL
   INNER JOIN public.jadwal_pelajaran jp
       ON jp.id_jadwal = jk.id_jadwal
      AND jp.status = 'Aktif'
   INNER JOIN public.kelas_mda km
       ON km.id_kelas_mda = jp.id_kelas
      AND km.status = 'Aktif'
   INNER JOIN public.jenis_guru jg
       ON jg.id_jenisguru = jp.id_gmapel
      AND UPPER(TRIM(jg.lembaga_type)) = 'PESANTREN'
      AND jg.id_lembaga = km.id_lembaga
   CROSS JOIN param p
   WHERE a.tanggal BETWEEN p.tanggal_mulai_trend AND p.tanggal_akhir_trend
     AND COALESCE(a.is_deleted, FALSE) = FALSE
     AND a.deleted_at IS NULL
   ORDER BY
       a.id_santri,
       a.tanggal,
       a.created_at DESC NULLS LAST,
       a.id_absen DESC
),
trend_rekap AS (
   SELECT
       tt.tanggal,
       COUNT(sf.id_santri) AS total_santri,
       COUNT(*) FILTER (WHERE at.status_kehadiran = 'Hadir') AS hadir,
       COUNT(*) FILTER (WHERE at.status_kehadiran = 'Izin') AS izin,
       COUNT(*) FILTER (WHERE at.status_kehadiran = 'Sakit') AS sakit,
       COUNT(*) FILTER (WHERE at.status_kehadiran = 'Alfa') AS alfa,
       COUNT(*) FILTER (WHERE at.id_santri IS NULL) AS belum_absen,
       CASE
           WHEN EXTRACT(ISODOW FROM tt.tanggal) = 7 THEN NULL
           ELSE ROUND(
               COUNT(*) FILTER (WHERE at.status_kehadiran = 'Hadir')::numeric
               / NULLIF(COUNT(sf.id_santri), 0) * 100,
               1
           )
       END AS persentase_hadir
   FROM trend_tanggal tt
   CROSS JOIN santri_mda sf
   LEFT JOIN absensi_trend at
       ON at.id_santri = sf.id_santri
      AND at.tanggal = tt.tanggal
   GROUP BY tt.tanggal
),
trend_json AS (
   SELECT
       COALESCE(
           jsonb_agg(
               jsonb_build_object(
                   'tanggal', tr.tanggal,
                   'hari', CASE EXTRACT(ISODOW FROM tr.tanggal)
                       WHEN 1 THEN 'Senin'
                       WHEN 2 THEN 'Selasa'
                       WHEN 3 THEN 'Rabu'
                       WHEN 4 THEN 'Kamis'
                       WHEN 5 THEN 'Jumat'
                       WHEN 6 THEN 'Sabtu'
                       WHEN 7 THEN 'Ahad'
                   END,
                   'hari_libur_sekolah', (EXTRACT(ISODOW FROM tr.tanggal) = 7),
                   'hadir', tr.hadir,
                   'izin', tr.izin,
                   'sakit', tr.sakit,
                   'alfa', tr.alfa,
                   'belum_absen', tr.belum_absen,
                   'persentase_hadir', tr.persentase_hadir
               ) ORDER BY tr.tanggal
           ),
           '[]'::jsonb
       ) AS data
   FROM trend_rekap tr
),
-- 27. KOMPOSISI ABSENSI SANTRI HARI INI
absensi_santri_json AS (
   SELECT jsonb_build_object(
       'total', rs.total_santri,
       'hadir', rs.santri_hadir,
       'izin', rs.santri_izin,
       'sakit', rs.santri_sakit,
       'alfa', rs.santri_alfa,
       'belum_absen', rs.santri_belum_absen,
       'persentase_hadir',
           CASE WHEN rs.total_santri > 0
                THEN ROUND(rs.santri_hadir::numeric / rs.total_santri * 100, 1)
                ELSE 0 END
   ) AS data
   FROM rekap_santri rs
),
-- 28. KOMPOSISI ABSENSI GURU HARI INI - JSON COMPATIBLE
absensi_guru_json AS (
   SELECT jsonb_build_object(
       'total', rgt.guru_terjadwal,
       'hadir', rgt.guru_hadir_terjadwal,
       'izin', rgt.guru_izin_terjadwal,
       'sakit', rgt.guru_sakit_terjadwal,
       'alfa', rgt.guru_alfa_terjadwal,
       'hadir_penuh', rgt.guru_hadir_penuh_terjadwal,
       'hadir_sebagian', rgt.guru_hadir_sebagian_terjadwal,
       'belum_terverifikasi', rgt.guru_belum_terverifikasi_terjadwal,
       'perlu_audit', rgt.guru_perlu_audit_terjadwal,
       'persentase_hadir',
           CASE WHEN rgt.guru_terjadwal > 0
                THEN ROUND(rgt.guru_hadir_terjadwal::numeric / rgt.guru_terjadwal * 100, 1)
                ELSE 0 END
   ) AS data
   FROM rekap_guru_terjadwal rgt
),
-- 29. SESI MENGAJAR HARI INI
sesi_mengajar_json AS (
   SELECT jsonb_build_object(
       'sesi_terjadwal', r.sesi_terjadwal,
       'sesi_terlaksana', r.sesi_terlaksana,
       'sesi_tidak_terlaksana', r.sesi_tidak_terlaksana,
       'sesi_anomali', r.sesi_anomali,
       'sesi_valid', r.sesi_valid,
       'jurnal_di_luar_jadwal', r.jurnal_di_luar_jadwal,
       'guru_berbeda_tanpa_pengganti', r.guru_berbeda_tanpa_pengganti,
       'multi_guru_efektif', r.multi_guru_efektif,
       'tidak_ada_jurnal', r.tidak_ada_jurnal,
       'persentase_terlaksana',
           CASE WHEN r.sesi_terjadwal > 0
                THEN ROUND(r.sesi_terlaksana::numeric / r.sesi_terjadwal * 100, 1)
                ELSE 0 END,
       'total_menit_terjadwal', r.total_menit_terjadwal,
       'total_menit_terlaksana', r.total_menit_terlaksana,
       'sesi_dengan_pengganti', r.sesi_dengan_pengganti,
       'jp_terjadwal', r.jp_terjadwal,
       'jp_terlaksana', r.jp_terlaksana,
       'persentase_jp_terlaksana',
           CASE WHEN r.jp_terjadwal > 0
                THEN ROUND(r.jp_terlaksana::numeric / r.jp_terjadwal * 100, 1)
                ELSE 0 END
   ) AS data
   FROM rekap_sesi r
),
-- 30. DETAIL SESI JSON
detail_sesi_json AS (
   SELECT
       COALESCE(
           jsonb_agg(
               jsonb_build_object(
                   'id_jadwal', d.id_jadwal,
                   'id_jadwal_slot', d.id_jadwal_array,
                   'jumlah_slot_jadwal', d.jumlah_slot_jadwal,
                   'jumlah_jurnal', d.jumlah_jurnal,
                   'jumlah_jurnal_dalam_jadwal', d.jumlah_jurnal_dalam_jadwal,
                   'jumlah_jurnal_di_luar_jadwal', d.jumlah_jurnal_di_luar_jadwal,
                   'jumlah_jurnal_valid', d.jumlah_jurnal_valid,
                   'status_audit', d.status_audit,
                   'id_kelas', d.id_kelas,
                   'nama_kelas', d.nama_kelas,
                   'id_lembaga', d.id_lembaga,
                   'nama_lembaga', d.nama_lembaga,
                   'label_lembaga_mda',
                       CASE
                           WHEN d.nama_lembaga ILIKE '%Asshiddiqiyah 3 Putra%' THEN 'MDA3'
                           WHEN d.nama_lembaga ILIKE '%Asshiddiqiyah 3 Putri%' THEN 'MDA3'
                           WHEN d.nama_lembaga ILIKE '%Asshiddiqiyah 4%' THEN 'MDA4'
                           ELSE d.nama_lembaga
                       END,
                   'id_cabang', d.id_cabang,
                   'nama_cabang', d.nama_cabang,
                   'tingkat', d.tingkat,
                   'nama_mapel', d.nama_mapel,
                   'nama_jampel', d.nama_jampel,
                   'jam_mulai_jadwal', d.jam_mulai_jadwal,
                   'jam_selesai_jadwal', d.jam_selesai_jadwal,
                   'durasi_menit_jadwal', d.durasi_menit_jadwal,
                   'id_guru_asli', d.id_guru_asli,
                   'nama_guru_asli', d.nama_guru_asli,
                   'id_guru_efektif', d.id_guru,
                   'nama_guru_efektif', d.nama_guru,
                   'is_pengganti', d.is_guru_pengganti,
                   'status_guru', d.status_kehadiran_guru,
                   'is_guru_hadir', d.is_guru_hadir,
                   'id_jurnal', d.id_jurnal,
                   'id_guru_jurnal', d.id_guru_jurnal,
                   'nama_guru_jurnal', d.nama_guru_jurnal,
                   'jam_mulai_aktual', d.jam_mulai_aktual,
                   'jam_selesai_aktual', d.jam_selesai_aktual,
                   'durasi_menit_aktual', d.durasi_menit_aktual,
                   'is_sesi_terlaksana', d.is_sesi_terlaksana,
                   'is_sesi_tidak_terlaksana', d.is_sesi_tidak_terlaksana,
                   'is_sesi_anomali', d.is_sesi_anomali,
                   'id_izin_guru', d.id_izin_guru,
                   'jenis_izin_guru', d.jenis_izin_guru,
                   'alasan_izin_guru', d.alasan_izin_guru,
                   'materi', d.materi,
                   'catatan', d.catatan
               )
               ORDER BY d.nama_lembaga, d.nama_kelas, d.jam_mulai_jadwal
           ),
           '[]'::jsonb
       ) AS data
   FROM detail_sesi d
),
-- 31. KELENGKAPAN RAPOT
rapot_aktif AS (
   SELECT
       r.id_rapot,
       r.id_santri,
       REGEXP_REPLACE(UPPER(TRIM(r.tahun_ajaran)), '^AJARAN[[:space:]]+', '') AS tahun_ajaran_norm,
       UPPER(TRIM(r.semester)) AS semester_norm,
       NULLIF(TRIM(r.file_rapot_mda), '') AS file_rapot_mda,
       r.created_at,
       r.updated_at
   FROM public.rapot_santri r
   WHERE r.status = 'Aktif'
     AND r.deleted_at IS NULL
),
rapot_per_santri AS (
   SELECT
       ra.tahun_ajaran_norm,
       ra.semester_norm,
       ra.id_santri,
       MAX(ra.file_rapot_mda) AS file_rapot_mda,
       BOOL_OR(ra.file_rapot_mda IS NOT NULL) AS sudah_upload_mda
   FROM rapot_aktif ra
   GROUP BY
       ra.tahun_ajaran_norm,
       ra.semester_norm,
       ra.id_santri
),
penempatan_mda_rapot AS (
   SELECT
       x.id_santri,
       x.id_kelas_mda,
       x.id_tahun_ajaran,
       x.tahun_ajaran_norm,
       x.id_lembaga,
       x.nama_lembaga,
       x.id_cabang,
       x.nama_cabang,
       x.id_tingkat,
       x.tingkat,
       x.nama_kelas
   FROM (
       SELECT
           pks.id_santri,
           pks.id_kelas_mda,
           pks.id_tahun_ajaran,
           REGEXP_REPLACE(UPPER(TRIM(ta.tahun_ajaran)), '^AJARAN[[:space:]]+', '') AS tahun_ajaran_norm,
           kf.id_lembaga,
           lpk.nama_lembaga,
           lpk.id_cabang,
           cb.nama_cabang,
           kf.id_tingkat,
           t.tingkat,
           kf.nama_kelas_mda AS nama_kelas,
           ROW_NUMBER() OVER (
               PARTITION BY pks.id_santri,
                            REGEXP_REPLACE(UPPER(TRIM(ta.tahun_ajaran)), '^AJARAN[[:space:]]+', '')
               ORDER BY pks.tanggal_masuk DESC NULLS LAST,
                        pks.updated_at DESC NULLS LAST,
                        pks.id DESC
           ) AS rn
       FROM public.penempatan_kelas_santri pks
       INNER JOIN public.tahun_ajaran ta
           ON ta.id_tahunajaran = pks.id_tahun_ajaran
       INNER JOIN public.kelas_mda kf
           ON kf.id_kelas_mda = pks.id_kelas_mda
       INNER JOIN public.lembaga_pendidikan_kepesantrenan lpk
           ON lpk.id_lembaga = kf.id_lembaga
       LEFT JOIN public.cabang cb
           ON cb.id_cabang = lpk.id_cabang
       LEFT JOIN public.tingkat t
           ON t.id_tingkat = kf.id_tingkat
       WHERE pks.id_kelas_mda IS NOT NULL
         AND pks.deleted_at IS NULL
   ) x
   WHERE x.rn = 1
),
rapot_periode_rekap AS (
   SELECT
       pfr.tahun_ajaran_norm,
       rps_periode.semester_norm,
       COUNT(DISTINCT pfr.id_santri) AS total_santri,
       COUNT(DISTINCT rps.id_santri) FILTER (
           WHERE rps.sudah_upload_mda
       ) AS sudah_upload_mda
   FROM penempatan_mda_rapot pfr
   INNER JOIN (
       SELECT DISTINCT tahun_ajaran_norm, semester_norm
       FROM rapot_per_santri
   ) rps_periode
       ON rps_periode.tahun_ajaran_norm = pfr.tahun_ajaran_norm
   LEFT JOIN rapot_per_santri rps
       ON rps.tahun_ajaran_norm = pfr.tahun_ajaran_norm
      AND rps.semester_norm = rps_periode.semester_norm
      AND rps.id_santri = pfr.id_santri
   GROUP BY
       pfr.tahun_ajaran_norm,
       rps_periode.semester_norm
),
rapot_periode_valid AS (
   SELECT
       rpr.*,
       CASE
           WHEN rpr.total_santri > 0
           THEN ROUND(rpr.sudah_upload_mda::numeric / rpr.total_santri * 100, 1)
           ELSE 0
       END AS persen_upload_mda
   FROM rapot_periode_rekap rpr
),
rapot_periode_terpilih AS (
   SELECT
       rpv.*
   FROM rapot_periode_valid rpv
   CROSS JOIN param p
   WHERE rpv.persen_upload_mda >= p.ambang_periode_rapot
   ORDER BY
       CASE
           WHEN rpv.tahun_ajaran_norm ~ '^[0-9]{4}/[0-9]{4}$'
           THEN SPLIT_PART(rpv.tahun_ajaran_norm, '/', 2)::int
           ELSE 0
       END DESC,
       CASE rpv.semester_norm
           WHEN 'GENAP' THEN 2
           WHEN 'GANJIL' THEN 1
           ELSE 0
       END DESC
   LIMIT 1
),
rapot_detail_periode AS (
   SELECT
       pfr.id_santri,
       pfr.id_lembaga,
       pfr.nama_lembaga,
       pfr.id_cabang,
       pfr.nama_cabang,
       pfr.id_tingkat,
       pfr.tingkat,
       pfr.id_kelas_mda,
       pfr.nama_kelas,
       COALESCE(rps.sudah_upload_mda, false) AS sudah_upload_mda
   FROM penempatan_mda_rapot pfr
   INNER JOIN rapot_periode_terpilih rpt
       ON rpt.tahun_ajaran_norm = pfr.tahun_ajaran_norm
   LEFT JOIN rapot_per_santri rps
       ON rps.tahun_ajaran_norm = rpt.tahun_ajaran_norm
      AND rps.semester_norm = rpt.semester_norm
      AND rps.id_santri = pfr.id_santri
),
rapot_unit_rekap AS (
   SELECT
       rdp.id_lembaga,
       rdp.nama_lembaga,
       rdp.id_cabang,
       rdp.nama_cabang,
       rdp.id_tingkat,
       rdp.tingkat,
       COUNT(DISTINCT rdp.id_santri) AS total_santri,
       COUNT(DISTINCT rdp.id_santri) FILTER (WHERE rdp.sudah_upload_mda) AS sudah_upload_mda,
       COUNT(DISTINCT rdp.id_santri) FILTER (WHERE NOT rdp.sudah_upload_mda) AS belum_upload_mda,
       COUNT(DISTINCT rdp.id_kelas_mda) AS total_kelas
   FROM rapot_detail_periode rdp
   GROUP BY
       rdp.id_lembaga, rdp.nama_lembaga, rdp.id_cabang, rdp.nama_cabang,
       rdp.id_tingkat, rdp.tingkat
),
rapot_unit_json AS (
   SELECT COALESCE(
       jsonb_agg(
           jsonb_build_object(
               'id_lembaga', ru.id_lembaga,
               'nama_lembaga', ru.nama_lembaga,
               'label_lembaga_mda',
                   CASE
                       WHEN ru.nama_lembaga ILIKE '%Asshiddiqiyah 3 Putra%' THEN 'MDA3'
                       WHEN ru.nama_lembaga ILIKE '%Asshiddiqiyah 3 Putri%' THEN 'MDA3'
                       WHEN ru.nama_lembaga ILIKE '%Asshiddiqiyah 4%' THEN 'MDA4'
                       ELSE ru.nama_lembaga
                   END,
               'id_cabang', ru.id_cabang,
               'nama_cabang', ru.nama_cabang,
               'tingkat', ru.tingkat,
               'id_tingkat', ru.id_tingkat,
               'total_kelas', ru.total_kelas,
               'total_santri', ru.total_santri,
               'mda', jsonb_build_object(
                   'sudah_upload', ru.sudah_upload_mda,
                   'belum_upload', ru.belum_upload_mda,
                   'persen', CASE WHEN ru.total_santri > 0
                                  THEN ROUND(ru.sudah_upload_mda::numeric / ru.total_santri * 100, 1)
                                  ELSE 0 END
               )
           )
           ORDER BY ru.nama_lembaga, ru.tingkat
       ),
       '[]'::jsonb
   ) AS data
   FROM rapot_unit_rekap ru
),
kelengkapan_rapor_json AS (
   SELECT
       CASE
           WHEN rpt.tahun_ajaran_norm IS NULL THEN
               jsonb_build_object(
                   'tersedia', false,
                   'status', 'BELUM_ADA_PERIODE_VALID',
                   'threshold_periode_baru', p.ambang_periode_rapot,
                   'periode_rapot', NULL::jsonb,
                   'data', '[]'::jsonb,
                   'catatan', 'Belum ada periode rapot mda yang mencapai batas minimum upload.'
               )
           ELSE
               jsonb_build_object(
                   'tersedia', true,
                   'status', 'PERIODE_TERAKHIR',
                   'threshold_periode_baru', p.ambang_periode_rapot,
                   'periode_rapot', jsonb_build_object(
                       'tahun_ajaran', rpt.tahun_ajaran_norm,
                       'semester', rpt.semester_norm,
                       'total_santri', rpt.total_santri,
                       'sudah_upload_mda', rpt.sudah_upload_mda,
                       'belum_upload_mda', rpt.total_santri - rpt.sudah_upload_mda,
                       'persen_upload_mda', rpt.persen_upload_mda
                   ),
                   'data', ruj.data,
                   'catatan', 'Periode rapot dipilih berdasarkan periode terbaru yang telah mencapai minimum 20% upload rapot mda.'
               )
       END AS data
   FROM param p
   LEFT JOIN rapot_periode_terpilih rpt ON TRUE
   CROSS JOIN rapot_unit_json ruj
)
-- 32. FINAL OUTPUT - 1 RECORD
SELECT
   2 AS level_summary,
   p.tanggal_dashboard,
   p.tanggal_mulai_trend,
   p.tanggal_akhir_trend,
   p.hari_dashboard::text AS hari_dashboard,
   /* PARAMETER */
   jsonb_build_object(
       'bobot_kehadiran_santri', p.bobot_kehadiran_santri,
       'bobot_kehadiran_guru', p.bobot_kehadiran_guru,
       'ambang_istimewa', p.ambang_istimewa,
       'ambang_baik_sekali', p.ambang_baik_sekali,
       'ambang_baik', p.ambang_baik,
       'ambang_cukup', p.ambang_cukup,
       'ambang_periode_rapot', p.ambang_periode_rapot,
       'warna_istimewa', p.warna_istimewa,
       'warna_baik_sekali', p.warna_baik_sekali,
       'warna_baik', p.warna_baik,
       'warna_cukup', p.warna_cukup,
       'warna_kurang', p.warna_kurang
   ) AS parameter_dashboard,
   /* PERFORMA UTAMA */
   jsonb_build_object(
       'kehadiran_santri', ps.persen_kehadiran_santri,
       'bobot_kehadiran_santri', p.bobot_kehadiran_santri,
       'kehadiran_guru', ps.persen_kehadiran_guru,
       'bobot_kehadiran_guru', p.bobot_kehadiran_guru,
       'sesi_mengajar', ps.persen_sesi_mengajar,
       'performa_total', ps.performa_total,
       'status', ps.status_performa,
       'warna', ps.warna_performa
   ) AS performa_pendidikan_mda,
   /* LABEL DAN DEFINISI INDIKATOR UNTUK UI */
   jsonb_build_object(
       'kehadiran_santri', 'Kehadiran Santri Hari Ini (%)',
       'kehadiran_guru', 'Kehadiran Ust/Usth per Sesi Mengajar (%)',
       'absensi_guru', 'Kehadiran Ust/Usth Terjadwal (%)',
       'guru_terjadwal', 'Jumlah Ust/Usth Unik yang Terjadwal Hari Ini',
       'guru_hadir_terjadwal', 'Jumlah Ust/Usth Terjadwal yang Hadir (Penuh atau Sebagian)',
       'guru_hadir_penuh_terjadwal', 'Jumlah Ust/Usth Terjadwal Hadir Penuh',
       'guru_hadir_sebagian_terjadwal', 'Jumlah Ust/Usth Terjadwal Hadir Sebagian',
       'guru_belum_terverifikasi_terjadwal', 'Ust/Usth Terjadwal Belum Terverifikasi',
       'guru_perlu_audit_terjadwal', 'Ust/Usth Terjadwal Perlu Audit',
       'sesi_terjadwal', 'Sesi Mengajar Terjadwal',
       'sesi_terlaksana', 'Sesi Mengajar Terlaksana',
       'sesi_tidak_terlaksana', 'Sesi Tanpa Jurnal (Belum Terverifikasi)',
       'sesi_anomali', 'Sesi Perlu Audit (Jurnal/Ust Tidak Cocok)',
       'sesi_valid', 'Sesi Terlaksana dan Valid',
       'total_kelas', 'Total Kelas MDA Aktif',
       'distribusi_lembaga_mda', 'Jumlah Kelas per Lembaga MDA'
   ) AS label_indikator,
   /* KPI TOP */
   jsonb_build_object(
       'total_santri', ps.total_santri,
       'santri_l', ps.santri_l,
       'santri_p', ps.santri_p,
       'total_kelas', ps.total_kelas,
       'distribusi_lembaga_mda', ps.distribusi_lembaga_mda,
       'label_total_kelas', 'Total Kelas MDA',
       'label_distribusi_kelas', 'Distribusi Kelas Berdasarkan Lembaga MDA',
       'total_guru', ps.total_guru,
       'guru_l', ps.guru_l,
       'guru_p', ps.guru_p,
       'absensi_santri', ps.persen_kehadiran_santri,
       'absensi_guru',
           CASE WHEN ps.guru_terjadwal > 0
                THEN ROUND(ps.guru_hadir_terjadwal::numeric / ps.guru_terjadwal * 100, 1)
                ELSE 0 END,
       'guru_terjadwal', ps.guru_terjadwal,
       'guru_hadir_terjadwal', ps.guru_hadir_terjadwal,
       'guru_hadir_penuh_terjadwal', ps.guru_hadir_penuh_terjadwal,
       'guru_hadir_sebagian_terjadwal', ps.guru_hadir_sebagian_terjadwal,
       'guru_izin_terjadwal', ps.guru_izin_terjadwal,
       'guru_sakit_terjadwal', ps.guru_sakit_terjadwal,
       'guru_alfa_terjadwal', ps.guru_alfa_terjadwal,
       'guru_belum_terverifikasi_terjadwal', ps.guru_belum_terverifikasi_terjadwal,
       'guru_perlu_audit_terjadwal', ps.guru_perlu_audit_terjadwal,
       'sesi_terjadwal', ps.sesi_terjadwal,
       'sesi_terlaksana', ps.sesi_terlaksana,
       'sesi_tidak_terlaksana', ps.sesi_tidak_terlaksana,
       'sesi_anomali', ps.sesi_anomali,
       'sesi_valid', ps.sesi_valid,
       'persen_sesi_mengajar', ps.persen_sesi_mengajar,
       'jp_terjadwal', ps.jp_terjadwal,
       'jp_terlaksana', ps.jp_terlaksana,
       'persentase_jp_terlaksana',
           CASE WHEN ps.jp_terjadwal > 0
                THEN ROUND(ps.jp_terlaksana::numeric / ps.jp_terjadwal * 100, 1)
                ELSE 0 END,
       'total_menit_terjadwal', ps.total_menit_terjadwal,
       'total_menit_terlaksana', ps.total_menit_terlaksana
   ) AS kpi_utama,
   /* DONUT SANTRI */
   asj.data AS absensi_santri_hari_ini,
   /* DONUT GURU */
   agj.data AS absensi_guru_hari_ini,
   /* SESI MENGAJAR */
   smj.data AS sesi_mengajar_hari_ini,
   /* UNIT */
   uj.data AS unit_pendidikan_mda,
   /* TREND */
   tj.data AS trend_absensi_santri_30_hari,
   /* RAPORT */
   krj.data AS kelengkapan_rapor,
   /* DETAIL SESI */
   dsj.data AS detail_sesi
FROM param p
CROSS JOIN performa_status ps
CROSS JOIN unit_json uj
CROSS JOIN trend_json tj
CROSS JOIN absensi_santri_json asj
CROSS JOIN absensi_guru_json agj
CROSS JOIN sesi_mengajar_json smj
CROSS JOIN kelengkapan_rapor_json krj
CROSS JOIN detail_sesi_json dsj;
