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
-- 02. SANTRI FORMAL AKTIF
santri_formal AS (
   SELECT DISTINCT ON (s.id_santri)
       s.id_santri,
       s.nis,
       s.fullname AS nama_santri,
       s.gender,
       pks.id_kelas_formal,
       kf.nama_kelas,
       kf.id_tingkat,
       t.tingkat,
       kf.id_lembaga,
       lpf.nama_lembaga,
       lpf.id_cabang,
       cb.nama_cabang
   FROM public.santri s
   INNER JOIN public.penempatan_kelas_santri pks
       ON pks.id_santri = s.id_santri
      AND pks.id_kelas_formal IS NOT NULL
      AND pks.status = 'Aktif'
      AND pks.deleted_at IS NULL
   INNER JOIN public.kelas_formal kf
       ON kf.id_kelas = pks.id_kelas_formal
      AND kf.status = 'Aktif'
   INNER JOIN public.tingkat t
       ON t.id_tingkat = kf.id_tingkat
   INNER JOIN public.lembaga_pendidikan_formal lpf
       ON lpf.id_lembaga = kf.id_lembaga
   LEFT JOIN public.cabang cb
       ON cb.id_cabang = lpf.id_cabang
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
       sf.id_kelas_formal,
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
   FROM santri_formal sf
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
-- 06. DETAIL GURU + MAPEL FORMAL
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
       lpf.id_cabang,
       cb.nama_cabang,
       COALESCE(lpf.nama_lembaga, '') AS nama_lembaga
   FROM public.jenis_guru jg
   LEFT JOIN public.pegawai p
       ON p.id_pegawai = jg.id_guru
      AND p.deleted_at IS NULL
   LEFT JOIN public.mata_pelajaran mp
       ON mp.id_mapel = jg.id_mapel
   LEFT JOIN public.tingkat t
       ON t.id_tingkat = jg.id_tingkat
   INNER JOIN public.lembaga_pendidikan_formal lpf
       ON jg.id_lembaga = lpf.id_lembaga
      AND UPPER(TRIM(jg.lembaga_type)) = 'FORMAL'
   LEFT JOIN public.cabang cb
       ON cb.id_cabang = lpf.id_cabang
),
-- 07. GURU FORMAL UNIK
guru_formal AS (
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
   FROM guru_formal
),
-- 08. JADWAL FORMAL HARI DASHBOARD
jadwal_formal AS (
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
       kf.nama_kelas,
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
   INNER JOIN detail_guru_mapel dgm
       ON jp.id_gmapel = dgm.id_jenisguru
   LEFT JOIN public.kelas_formal kf
       ON jp.id_kelas = kf.id_kelas
      AND UPPER(TRIM(dgm.lembaga_type)) = 'FORMAL'
   LEFT JOIN public.jam_pelajaran jampel
       ON jp.id_jam_pelajaran = jampel.id_jampel
   LEFT JOIN public.semester sem
       ON jp.id_semester = sem.id_semester
   LEFT JOIN public.tahun_ajaran ta
       ON jp.id_tahunajaran = ta.id_tahunajaran
   LEFT JOIN public.lokasi l
       ON jp.id_lokasi = l.id_lokasi
),
-- 09. GURU PENGGANTI
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
   FROM jadwal_formal j
   LEFT JOIN public.guru_pengganti gp
       ON gp.id_jadwal = j.id_jadwal
      AND gp.tanggal = j.tanggal_dashboard
      AND gp.status_approval = 'Disetujui'
   LEFT JOIN public.pegawai pg
       ON pg.id_pegawai = gp.id_guru_pengganti
      AND pg.deleted_at IS NULL
   ORDER BY j.id_jadwal, gp.created_at DESC NULLS LAST
),
-- 10. JURNAL KBM
jurnal AS (
   SELECT DISTINCT ON (jk.id_jadwal, jk.tanggal)
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
       CASE WHEN jk.jam_selesai IS NOT NULL THEN TRUE ELSE FALSE END AS is_end_session
   FROM public.jurnal_kelas jk
   LEFT JOIN public.app_resource ar
       ON ar.resource_id = jk.id_petugas
   LEFT JOIN public.pegawai pj
       ON pj.id_pegawai = ar.id_eksternal
      AND pj.deleted_at IS NULL
   CROSS JOIN param p
   WHERE jk.tanggal = p.tanggal_dashboard
     AND jk.deleted_at IS NULL
   ORDER BY
       jk.id_jadwal,
       jk.tanggal,
       jk.jam_mulai DESC NULLS LAST,
       jk.created_at DESC NULLS LAST
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
     AND p.tanggal_dashboard BETWEEN pi.tanggal_mulai::date AND pi.tanggal_selesai::date
   ORDER BY
       pi.id_pegawai,
       p.tanggal_dashboard,
       pi.tanggal_mulai DESC,
       pi.created_at DESC NULLS LAST
),
-- 12. DETAIL SESI
detail_sesi AS (
   SELECT
       j.id_jadwal,
       j.id_kelas,
       j.id_guru_asli,
       j.nama_guru_asli,
       j.id_guru,
       j.nama_guru,
       j.id_mapel,
       j.nama_mapel,
       j.id_tingkat,
       j.tingkat,
       j.id_lembaga,
       j.nama_lembaga,
       j.id_cabang,
       j.nama_cabang,
       j.nama_kelas,
       j.nama_jampel,
       j.jam_mulai_jadwal,
       j.jam_selesai_jadwal,
       j.durasi_menit_jadwal,
       jr.id_jurnal,
       jr.id_guru_jurnal,
       jr.nama_guru_jurnal,
       jr.jam_mulai AS jam_mulai_aktual,
       CASE
           WHEN jr.id_jurnal IS NULL THEN NULL
           WHEN jr.jam_selesai IS NOT NULL THEN jr.jam_selesai
           ELSE j.jam_selesai_jadwal
       END AS jam_selesai_aktual,
       jr.is_end_session,
       jr.materi,
       jr.catatan,
       CASE
           WHEN jr.id_jurnal IS NOT NULL THEN 'Hadir'
           WHEN ig.id_izin IS NOT NULL AND ig.jenis_izin = 'Sakit' THEN 'Sakit'
           WHEN ig.id_izin IS NOT NULL AND ig.jenis_izin = 'Izin' THEN 'Izin'
           ELSE 'Alfa/Tidak Absen'
       END AS status_kehadiran_guru,
       CASE WHEN jr.id_jurnal IS NOT NULL THEN 1 ELSE 0 END AS is_guru_hadir,
       CASE
           WHEN ig.id_izin IS NOT NULL
            AND ig.jenis_izin = 'Sakit'
            AND jr.id_jurnal IS NULL
           THEN 1 ELSE 0
       END AS is_guru_sakit,
       CASE
           WHEN ig.id_izin IS NOT NULL
            AND ig.jenis_izin = 'Izin'
            AND jr.id_jurnal IS NULL
           THEN 1 ELSE 0
       END AS is_guru_izin,
       CASE
           WHEN jr.id_jurnal IS NULL AND ig.id_izin IS NULL
           THEN 1 ELSE 0
       END AS is_guru_alfa,
       CASE WHEN j.is_pengganti THEN 1 ELSE 0 END AS is_guru_pengganti,
       CASE WHEN jr.id_jurnal IS NOT NULL THEN 1 ELSE 0 END AS is_sesi_terlaksana,
       CASE WHEN jr.id_jurnal IS NULL THEN 1 ELSE 0 END AS is_sesi_tidak_terlaksana,
       CASE
           WHEN jr.id_jurnal IS NULL OR jr.jam_mulai IS NULL THEN 0
           ELSE ROUND(
               (
                   EXTRACT(
                       EPOCH FROM (
                           (CASE
                               WHEN jr.jam_selesai IS NOT NULL THEN jr.jam_selesai
                               ELSE j.jam_selesai_jadwal
                            END) - jr.jam_mulai
                       )
                   ) / 60
               )::numeric,
               0
           )
       END AS durasi_menit_aktual,
       ig.id_izin AS id_izin_guru,
       ig.jenis_izin AS jenis_izin_guru,
       ig.alasan AS alasan_izin_guru
   FROM jadwal_dengan_pengganti j
   LEFT JOIN jurnal jr
       ON jr.id_jadwal = j.id_jadwal
      AND jr.tanggal = j.tanggal_dashboard
   LEFT JOIN izin_guru ig
       ON ig.id_pegawai = j.id_guru
      AND ig.tanggal_dashboard = j.tanggal_dashboard
),
-- 13. REKAP SESI/GURU - BASIS KPI GURU = SESI
rekap_sesi AS (
   SELECT
       COUNT(*) AS sesi_terjadwal,
       COUNT(*) FILTER (WHERE is_sesi_terlaksana = 1) AS sesi_terlaksana,
       COUNT(*) FILTER (WHERE is_sesi_tidak_terlaksana = 1) AS sesi_tidak_terlaksana,
       COUNT(*) FILTER (WHERE is_guru_hadir = 1) AS sesi_guru_hadir,
       COUNT(*) FILTER (WHERE is_guru_izin = 1) AS sesi_guru_izin,
       COUNT(*) FILTER (WHERE is_guru_sakit = 1) AS sesi_guru_sakit,
       COUNT(*) FILTER (WHERE is_guru_alfa = 1) AS sesi_guru_alfa,
       COUNT(*) FILTER (WHERE is_guru_pengganti = 1) AS sesi_dengan_pengganti,
       COALESCE(SUM(durasi_menit_jadwal), 0) AS total_menit_terjadwal,
       COALESCE(SUM(durasi_menit_aktual), 0) AS total_menit_terlaksana
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
               THEN 'Hadir'
           WHEN COUNT(ds.id_jadwal) FILTER (WHERE ds.is_guru_sakit = 1) > 0
               THEN 'Sakit'
           WHEN COUNT(ds.id_jadwal) FILTER (WHERE ds.is_guru_izin = 1) > 0
               THEN 'Izin'
           ELSE 'Alfa'
       END AS status_harian
   FROM guru_formal gf
   LEFT JOIN detail_sesi ds
       ON ds.id_guru = gf.id_guru
   GROUP BY gf.id_guru, gf.nama_guru, gf.jenis_kelamin
),
rekap_guru_unik AS (
   SELECT
       COUNT(*) AS total_guru,
       COUNT(*) FILTER (WHERE status_harian = 'Hadir') AS guru_hadir,
       COUNT(*) FILTER (WHERE status_harian = 'Izin') AS guru_izin,
       COUNT(*) FILTER (WHERE status_harian = 'Sakit') AS guru_sakit,
       COUNT(*) FILTER (WHERE status_harian = 'Alfa') AS guru_alfa
   FROM guru_status_harian
),
-- 15. KELAS FORMAL AKTIF
kelas_formal_aktif AS (
   SELECT
       k.id_kelas,
       k.id_lembaga,
       lpf.nama_lembaga,
       lpf.id_cabang,
       cb.nama_cabang,
       k.id_tingkat,
       t.tingkat
   FROM public.kelas_formal k
   INNER JOIN public.lembaga_pendidikan_formal lpf
       ON lpf.id_lembaga = k.id_lembaga
   INNER JOIN public.tingkat t
       ON t.id_tingkat = k.id_tingkat
   LEFT JOIN public.cabang cb
       ON cb.id_cabang = lpf.id_cabang
   WHERE k.status = 'Aktif'
),
rekap_kelas AS (
   SELECT
       COUNT(*) AS total_kelas,
       COUNT(*) FILTER (WHERE UPPER(TRIM(tingkat)) = 'MTS') AS kelas_mts,
       COUNT(*) FILTER (WHERE UPPER(TRIM(tingkat)) = 'MA') AS kelas_ma,
       COUNT(*) FILTER (WHERE UPPER(TRIM(tingkat)) = 'SMP') AS kelas_smp,
       COUNT(*) FILTER (WHERE UPPER(TRIM(tingkat)) = 'SMK') AS kelas_smk
   FROM kelas_formal_aktif
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
       ru.guru_izin,
       ru.guru_sakit,
       ru.guru_alfa,
       rkls.total_kelas,
       rkls.kelas_mts,
       rkls.kelas_ma,
       rkls.kelas_smp,
       rkls.kelas_smk,
       rse.sesi_terjadwal,
       rse.sesi_terlaksana,
       rse.sesi_tidak_terlaksana,
       rse.sesi_guru_hadir,
       rse.sesi_guru_izin,
       rse.sesi_guru_sakit,
       rse.sesi_guru_alfa,
       rse.sesi_dengan_pengganti,
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
       sf.id_lembaga,
       sf.nama_lembaga,
       sf.id_cabang,
       sf.nama_cabang,
       sf.id_tingkat,
       sf.tingkat,
       COUNT(*) AS total_santri,
       COUNT(*) FILTER (WHERE dks.is_hadir = 1) AS santri_hadir,
       COUNT(*) FILTER (WHERE dks.is_sakit = 1) AS santri_sakit,
       COUNT(*) FILTER (WHERE dks.is_izin = 1) AS santri_izin,
       COUNT(*) FILTER (WHERE dks.is_alfa = 1) AS santri_alfa,
       COUNT(*) FILTER (WHERE dks.is_belum_absen = 1) AS santri_belum_absen
   FROM santri_formal sf
   LEFT JOIN detail_kehadiran_santri dks
       ON dks.id_santri = sf.id_santri
   GROUP BY
       sf.id_lembaga, sf.nama_lembaga, sf.id_cabang, sf.nama_cabang,
       sf.id_tingkat, sf.tingkat
),
-- 20. REKAP UNIT/JENJANG - KELAS
unit_kelas AS (
   SELECT
       k.id_lembaga,
       k.id_tingkat,
       COUNT(*) AS total_kelas
   FROM kelas_formal_aktif k
   GROUP BY k.id_lembaga, k.id_tingkat
),
-- 21. REKAP UNIT/JENJANG - GURU
unit_guru AS (
   SELECT
       dgm.id_lembaga,
       dgm.id_tingkat,
       COUNT(DISTINCT dgm.id_guru) AS total_guru
   FROM detail_guru_mapel dgm
   WHERE dgm.id_guru IS NOT NULL
   GROUP BY dgm.id_lembaga, dgm.id_tingkat
),
-- 22. REKAP UNIT/JENJANG - SESI
unit_sesi AS (
   SELECT
       ds.id_lembaga,
       ds.id_tingkat,
       COUNT(*) AS sesi_terjadwal,
       COUNT(*) FILTER (WHERE ds.is_sesi_terlaksana = 1) AS sesi_terlaksana,
       COUNT(*) FILTER (WHERE ds.is_sesi_tidak_terlaksana = 1) AS sesi_tidak_terlaksana,
       COUNT(*) FILTER (WHERE ds.is_guru_hadir = 1) AS sesi_guru_hadir,
       COUNT(*) FILTER (WHERE ds.is_guru_izin = 1) AS sesi_guru_izin,
       COUNT(*) FILTER (WHERE ds.is_guru_sakit = 1) AS sesi_guru_sakit,
       COUNT(*) FILTER (WHERE ds.is_guru_alfa = 1) AS sesi_guru_alfa,
       COUNT(*) FILTER (WHERE ds.is_guru_pengganti = 1) AS sesi_dengan_pengganti,
       COALESCE(SUM(ds.durasi_menit_jadwal),0) AS total_menit_terjadwal,
       COALESCE(SUM(ds.durasi_menit_aktual),0) AS total_menit_terlaksana
   FROM detail_sesi ds
   GROUP BY ds.id_lembaga, ds.id_tingkat
),
-- 23. DETAIL UNIT FINAL
unit_detail AS (
   SELECT
       us.id_lembaga,
       us.nama_lembaga,
       us.id_cabang,
       us.nama_cabang,
       us.id_tingkat,
       us.tingkat,
       us.total_santri,
       us.santri_hadir,
       us.santri_sakit,
       us.santri_izin,
       us.santri_alfa,
       us.santri_belum_absen,
       COALESCE(uk.total_kelas,0) AS total_kelas,
       COALESCE(ug.total_guru,0) AS total_guru,
       COALESCE(ue.sesi_terjadwal,0) AS sesi_terjadwal,
       COALESCE(ue.sesi_terlaksana,0) AS sesi_terlaksana,
       COALESCE(ue.sesi_tidak_terlaksana,0) AS sesi_tidak_terlaksana,
       COALESCE(ue.sesi_guru_hadir,0) AS sesi_guru_hadir,
       COALESCE(ue.sesi_guru_izin,0) AS sesi_guru_izin,
       COALESCE(ue.sesi_guru_sakit,0) AS sesi_guru_sakit,
       COALESCE(ue.sesi_guru_alfa,0) AS sesi_guru_alfa,
       COALESCE(ue.sesi_dengan_pengganti,0) AS sesi_dengan_pengganti,
       COALESCE(ue.total_menit_terjadwal,0) AS total_menit_terjadwal,
       COALESCE(ue.total_menit_terlaksana,0) AS total_menit_terlaksana,
       CASE
           WHEN us.total_santri > 0
           THEN ROUND(us.santri_hadir::numeric / us.total_santri * 100,1)
           ELSE 0
       END AS persen_kehadiran_santri,
       CASE
           WHEN COALESCE(ue.sesi_terjadwal,0) > 0
           THEN ROUND(ue.sesi_guru_hadir::numeric / ue.sesi_terjadwal * 100,1)
           ELSE 0
       END AS persen_kehadiran_guru,
       CASE
           WHEN COALESCE(ue.sesi_terjadwal,0) > 0
           THEN ROUND(ue.sesi_terlaksana::numeric / ue.sesi_terjadwal * 100,1)
           ELSE 0
       END AS persen_sesi_mengajar
   FROM unit_santri us
   LEFT JOIN unit_kelas uk
       ON uk.id_lembaga = us.id_lembaga
      AND uk.id_tingkat = us.id_tingkat
   LEFT JOIN unit_guru ug
       ON ug.id_lembaga = us.id_lembaga
      AND ug.id_tingkat = us.id_tingkat
   LEFT JOIN unit_sesi ue
       ON ue.id_lembaga = us.id_lembaga
      AND ue.id_tingkat = us.id_tingkat
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
                   'id_lembaga', x.id_lembaga,
                   'nama_lembaga', x.nama_lembaga,
                   'id_cabang', x.id_cabang,
                   'nama_cabang', x.nama_cabang,
                   'jenjang', x.jenjang_json
               )
               ORDER BY x.nama_lembaga
           ),
           '[]'::jsonb
       ) AS data
   FROM (
       SELECT
           u.id_lembaga,
           u.nama_lembaga,
           u.id_cabang,
           u.nama_cabang,
           jsonb_agg(
               jsonb_build_object(
                   'id_tingkat', u.id_tingkat,
                   'tingkat', u.tingkat,
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
                   'sesi_guru_hadir', u.sesi_guru_hadir,
                   'sesi_guru_izin', u.sesi_guru_izin,
                   'sesi_guru_sakit', u.sesi_guru_sakit,
                   'sesi_guru_alfa', u.sesi_guru_alfa,
                   'sesi_dengan_pengganti', u.sesi_dengan_pengganti,
                   'total_menit_terjadwal', u.total_menit_terjadwal,
                   'total_menit_terlaksana', u.total_menit_terlaksana,
                   'persen_sesi_mengajar', u.persen_sesi_mengajar
               )
               ORDER BY u.tingkat
           ) AS jenjang_json
       FROM unit_performa_status u
       GROUP BY
           u.id_lembaga,
           u.nama_lembaga,
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
   CROSS JOIN param p
   WHERE a.tanggal BETWEEN p.tanggal_mulai_trend AND p.tanggal_akhir_trend
     AND COALESCE(a.is_deleted,FALSE) = FALSE
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
       ROUND(
           COUNT(*) FILTER (WHERE at.status_kehadiran = 'Hadir')::numeric
           / NULLIF(COUNT(sf.id_santri),0) * 100,
           1
       ) AS persentase_hadir
   FROM trend_tanggal tt
   CROSS JOIN santri_formal sf
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
                THEN ROUND(rs.santri_hadir::numeric / rs.total_santri * 100,1)
                ELSE 0 END
   ) AS data
   FROM rekap_santri rs
),
-- 28. KOMPOSISI ABSENSI GURU HARI INI - GURU UNIK
absensi_guru_json AS (
   SELECT jsonb_build_object(
       'total', rg.total_guru,
       'hadir', rg.guru_hadir,
       'izin', rg.guru_izin,
       'sakit', rg.guru_sakit,
       'alfa', rg.guru_alfa,
       'persentase_hadir',
           CASE WHEN rg.total_guru > 0
                THEN ROUND(rg.guru_hadir::numeric / rg.total_guru * 100,1)
                ELSE 0 END
   ) AS data
   FROM rekap_guru_unik rg
),
-- 29. SESI MENGAJAR HARI INI
sesi_mengajar_json AS (
   SELECT jsonb_build_object(
       'sesi_terjadwal', r.sesi_terjadwal,
       'sesi_terlaksana', r.sesi_terlaksana,
       'sesi_tidak_terlaksana', r.sesi_tidak_terlaksana,
       'persentase_terlaksana',
           CASE WHEN r.sesi_terjadwal > 0
                THEN ROUND(r.sesi_terlaksana::numeric / r.sesi_terjadwal * 100,1)
                ELSE 0 END,
       'total_menit_terjadwal', r.total_menit_terjadwal,
       'total_menit_terlaksana', r.total_menit_terlaksana,
       'sesi_dengan_pengganti', r.sesi_dengan_pengganti
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
                   'id_kelas', d.id_kelas,
                   'nama_kelas', d.nama_kelas,
                   'id_lembaga', d.id_lembaga,
                   'nama_lembaga', d.nama_lembaga,
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
       NULLIF(TRIM(r.file_rapot), '') AS file_rapot,
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
       MAX(ra.file_rapot) AS file_rapot,
       MAX(ra.file_rapot_mda) AS file_rapot_mda,
       BOOL_OR(ra.file_rapot IS NOT NULL) AS sudah_upload_formal,
       BOOL_OR(ra.file_rapot_mda IS NOT NULL) AS sudah_upload_mda
   FROM rapot_aktif ra
   GROUP BY
       ra.tahun_ajaran_norm,
       ra.semester_norm,
       ra.id_santri
),
penempatan_formal_rapot AS (
   SELECT
       x.id_santri,
       x.id_kelas_formal,
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
           pks.id_kelas_formal,
           pks.id_tahun_ajaran,
           REGEXP_REPLACE(UPPER(TRIM(ta.tahun_ajaran)), '^AJARAN[[:space:]]+', '') AS tahun_ajaran_norm,
           kf.id_lembaga,
           lpf.nama_lembaga,
           lpf.id_cabang,
           cb.nama_cabang,
           kf.id_tingkat,
           t.tingkat,
           kf.nama_kelas,
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
       INNER JOIN public.kelas_formal kf
           ON kf.id_kelas = pks.id_kelas_formal
       INNER JOIN public.lembaga_pendidikan_formal lpf
           ON lpf.id_lembaga = kf.id_lembaga
       LEFT JOIN public.cabang cb
           ON cb.id_cabang = lpf.id_cabang
       LEFT JOIN public.tingkat t
           ON t.id_tingkat = kf.id_tingkat
       WHERE pks.id_kelas_formal IS NOT NULL
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
           WHERE rps.sudah_upload_formal
       ) AS sudah_upload_formal,
       COUNT(DISTINCT rps.id_santri) FILTER (
           WHERE rps.sudah_upload_mda
       ) AS sudah_upload_mda
   FROM penempatan_formal_rapot pfr
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
           THEN ROUND(rpr.sudah_upload_formal::numeric / rpr.total_santri * 100, 1)
           ELSE 0
       END AS persen_upload_formal,
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
   WHERE rpv.persen_upload_formal >= p.ambang_periode_rapot
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
       pfr.id_kelas_formal,
       pfr.nama_kelas,
       COALESCE(rps.sudah_upload_formal, false) AS sudah_upload_formal,
       COALESCE(rps.sudah_upload_mda, false) AS sudah_upload_mda
   FROM penempatan_formal_rapot pfr
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
       COUNT(DISTINCT rdp.id_santri) FILTER (WHERE rdp.sudah_upload_formal) AS sudah_upload_formal,
       COUNT(DISTINCT rdp.id_santri) FILTER (WHERE NOT rdp.sudah_upload_formal) AS belum_upload_formal,
       COUNT(DISTINCT rdp.id_santri) FILTER (WHERE rdp.sudah_upload_mda) AS sudah_upload_mda,
       COUNT(DISTINCT rdp.id_santri) FILTER (WHERE NOT rdp.sudah_upload_mda) AS belum_upload_mda,
       COUNT(DISTINCT rdp.id_kelas_formal) AS total_kelas
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
               'id_cabang', ru.id_cabang,
               'nama_cabang', ru.nama_cabang,
               'jenjang', ru.tingkat,
               'id_tingkat', ru.id_tingkat,
               'total_kelas', ru.total_kelas,
               'total_santri', ru.total_santri,
               'formal', jsonb_build_object(
                   'sudah_upload', ru.sudah_upload_formal,
                   'belum_upload', ru.belum_upload_formal,
                   'persen', CASE WHEN ru.total_santri > 0
                                  THEN ROUND(ru.sudah_upload_formal::numeric / ru.total_santri * 100, 1)
                                  ELSE 0 END
               ),
               'non_formal', jsonb_build_object(
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
                   'catatan', 'Belum ada periode rapot formal yang mencapai batas minimum upload.'
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
                       'sudah_upload_formal', rpt.sudah_upload_formal,
                       'belum_upload_formal', rpt.total_santri - rpt.sudah_upload_formal,
                       'persen_upload_formal', rpt.persen_upload_formal,
                       'sudah_upload_mda', rpt.sudah_upload_mda,
                       'belum_upload_mda', rpt.total_santri - rpt.sudah_upload_mda,
                       'persen_upload_mda', rpt.persen_upload_mda
                   ),
                   'data', ruj.data,
                   'catatan', 'Periode rapot dipilih berdasarkan periode terbaru yang telah mencapai minimum 20% upload rapot formal.'
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
   ) AS performa_pendidikan_formal,
   /* KPI TOP */
   jsonb_build_object(
       'total_santri', ps.total_santri,
       'santri_l', ps.santri_l,
       'santri_p', ps.santri_p,
       'total_kelas', ps.total_kelas,
       'kelas_mts', ps.kelas_mts,
       'kelas_ma', ps.kelas_ma,
       'kelas_smp', ps.kelas_smp,
       'kelas_smk', ps.kelas_smk,
       'total_guru', ps.total_guru,
       'guru_l', ps.guru_l,
       'guru_p', ps.guru_p,
       'absensi_santri', ps.persen_kehadiran_santri,
       'absensi_guru',
           CASE WHEN ps.total_guru > 0
                THEN ROUND(ps.guru_hadir::numeric / ps.total_guru * 100,1)
                ELSE 0 END,
       'sesi_terjadwal', ps.sesi_terjadwal,
       'sesi_terlaksana', ps.sesi_terlaksana,
       'sesi_tidak_terlaksana', ps.sesi_tidak_terlaksana,
       'persen_sesi_mengajar', ps.persen_sesi_mengajar,
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
   uj.data AS unit_pendidikan_formal,
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
