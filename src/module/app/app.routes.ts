'use strict';

import { Router } from 'express';
import { sanitizeBody } from '../../middlewares/sanitize';
import { validate } from '../../middlewares/validate';
import { role } from './role/role.controller';
import { menu } from './menu/menu.controller';
import { auth } from '../auth/auth.middleware';
import { resource } from './resource/resource.controller';
import { roleMenu } from './role.menu/role.menu.controller';
import { paramGlobal } from './param.global/param.global.controller';
import { tahunAngkatan } from './tahun.angkatan/tahun.angkatan.controller';
import { tingkat } from './tingkat/tingkat.controller';
import { tingkatSchema } from './tingkat/tingkat.schema';
import { tahunAjaran } from './tahun.ajaran/tahun.ajaran.controller';
import { tahunAjaranSchema } from './tahun.ajaran/tahun.ajaran.schema';
import { semester } from './semester/semester.controller';
import { semesterSchema } from './semester/semester.schema';
import { statusAwalSantri } from './status.awal.santri/status.awal.santri.controller';
import { statusAwalSantriSchema } from './status.awal.santri/status.awal.santri.schema';
import { jenisBeasiswa } from './jenis.beasiswa/jenis.beasiswa.controller';
import { jenisBeasiswaSchema } from './jenis.beasiswa/jenis.beasiswa.schema';
import { kelompokPejaran } from './kelompok.pelajaran/kelompok.pelajaran.controller';
import { jenisJamPelajaran } from './jenis.jampel/jenis.jampel.controller';
import { guruMapel } from './jenis.guru/jenis.guru.controller';
import { mataPelajaran } from './mata.pelajaran/mata.pelajaran.controller';
import { jamPelajaran } from './jam.pelajaran/jam.pelajaran.controller';
import { cabang } from './cabang/cabang.controller';
import { LembagaPendidikanKepesantrenan } from './lembaga.pendidikan.kepesantrenan/lembaga.pendidikan.kepesantrenan.controller';
import { OrganizationUnit } from './organization.unit/organization.unit.controller';
import { Jabatan } from './jabatan/jabatan.controller';
import { JenisPenilaian } from './jenis.penilaian/jenis.penilaian.controller';
import { Asrama } from './asrama/asrama.controller';
import { kegiatanAkademik } from './kegiatan.akademik/kegiatan.akademik.controller';
import { programPesantren } from './program.pesantren/program.pesantren.controller';
import { santriProgram } from './santri.program/santri.program.controller';
import { orangTuaWali } from './orang.tua.wali/orang.tua.wali.controller';
import { orangTuaWaliSchema } from './orang.tua.wali/orang.tua.wali.schema';
import { LembagaPendidikanFormal } from './lembaga.pendidikan.formal/lembaga.pendidikan.formal.controller';
import { Pegawai } from './pegawai/pegawai.controller';
import { Kamar } from './kamar/kamar.controller';
import { PenempatanKamarSantri } from './penempatan.kamar.santri/penempatan.kamar.santri..controller';
import { inventarisUmum } from './inventaris.umum/inventaris.umum.controller';
import { inventarisAsetHarian } from './inventaris.aset.harian/inventaris.aset.harian.controller';
import { JenisPenilaianBobot } from './jenis.penilaian.bobot/jenis.penilaian.bobot.controller';
import { kelasMda } from './kelas.mda/kelas.mda.controller';
import { kelasMdaSchema } from './kelas.mda/kelas.mda.schema';
import { kelasFormal } from './kelas.formal/kelas.formal.controller';
import { kelasFormalSchema } from './kelas.formal/kelas.formal.schema';
import { Location } from './location/location.controller';
import { jadwalPelajaran } from './jadwal.pelajaran/jadwal.pelajaran.controller';
import { jadwalPelajaranSchema } from './jadwal.pelajaran/jadwal.pelajaran.schema';
import { shiftPresensi } from './shift.presensi/shift.presensi.controller';
import { shiftPresensiSchema } from './shift.presensi/shift.presensi.schema';
import { GeoArea } from './geo.areas/geo.areas.controller';
import { masterSlotWaktu } from './master.slot.waktu/master.slot.waktu.controller';
import { masterSlotWaktuSchema } from './master.slot.waktu/master.slot.waktu.schema';
import { jadwalInspeksiKebersihan } from './jadwal.inspeksi.kebersihan/jadwal.inspeksi.kebersihan.controller';
import { jadwalInspeksiKebersihanSchema } from './jadwal.inspeksi.kebersihan/jadwal.inspeksi.kebersihan.schema';
import { kebersihanInspeksi } from './kebersihan.inspeksi/kebersihan.inspeksi.controller';
import { kebersihanInspeksiSchema } from './kebersihan.inspeksi/kebersihan.inspeksi.schema';
import { kebersihanTemuan } from './kebersihan.temuan/kebersihan.temuan.controller';
import { kebersihanTemuanSchema } from './kebersihan.temuan/kebersihan.temuan.schema';
import { kebersihanScanLog } from './kebersihan.scan.log/kebersihan.scan.log.controller';
import { kebersihanScanLogSchema } from './kebersihan.scan.log/kebersihan.scan.log.schema';
import { santri } from '../app/santri/santri.controller';
import { AbsenHarianSantriController } from './absen.harian.santri/absen.harian.santri.controller';
import { PerizinanSantriController } from './perizinan.santri/perizinan.santri.controller';
import { LogGateSantriController } from './log.gate.santri/log.gate.santri.controller';
import { AbsenKelasSantriController } from './absen.kelas.santri/absen.kelas.santri.controller';
import { JurnalKelasController } from './jurnal.kelas/jurnal.kelas.controller';
import { notification } from './notification/notification.controller';
import { notificationSchema } from './notification/notification.schema';
import { controller as rapotSantriController } from './rapot.santri/rapot.santri.controller';
import { penempatanKelasSantri } from './penempatan.kelas.santri/penempatan.kelas.santri.controller';
import { JamKerjaPegawai } from './pegawai.jam.kerja/pegawai.jam.kerja.controller';
import { AbsenHarianPegawaiController } from './pegawai.absen.harian/pegawai.absen.harian.controller';
import { activityLog } from './activity.log/activity.log.controller';
import { guruPengganti } from './guru.pengganti/guru.pengganti.controller';
import { guruPenggantiSchema } from './guru.pengganti/guru.pengganti.schema';
import { controller as kesehatanSantri } from './kesehatan.santri/kesehatan.santri.controller';
import {
  createKesehatanSchema,
  updateKesehatanSchema,
} from './kesehatan.santri/kesehatan.santri.schema';
import { institution } from './institution/institution.controller';
import { laporanPresensiController } from './monitoring/monitoring.controller';

const router: Router = Router();

// optional token
router.get('/param-global/all-data', auth.checkToken, paramGlobal.list);
router.get('/param-global', auth.checkToken, paramGlobal.index);
router.get('/param-global/detail', auth.checkToken, paramGlobal.detail);

// required token
router.use(auth.checkBearerToken);

router.get('/role/all-data', role.list);
router.get('/role', role.index);
router.get('/role/:id', role.detail);
router.post('/role', role.create);
router.put('/role/:id', role.update);
router.delete('/role/:id', role.delete);
router.post('/role/export', role.export);
router.post('/role/import', role.import);
router.post('/role/insert', role.insert);

router.get('/menu/all-data', menu.list);
router.get('/menu', menu.index);
router.get('/menu/:id', menu.detail);
router.post('/menu', menu.create);
router.put('/menu/:id', menu.update);
router.delete('/menu/:id', menu.delete);
router.post('/menu/export', menu.export);
router.post('/menu/import', menu.import);
router.post('/menu/insert', menu.insert);

router.get('/role-menu/all-data', roleMenu.list);
router.get('/role-menu', roleMenu.index);
router.get('/role-menu/:id', roleMenu.detail);
router.post('/role-menu', roleMenu.create);

router.get('/param-global/:id', paramGlobal.detailById);
router.post('/param-global', paramGlobal.create);
router.put('/param-global/:id', paramGlobal.update);
router.delete('/param-global/:id', paramGlobal.delete);
router.post('/param-global/export', paramGlobal.export);
router.post('/param-global/import', paramGlobal.import);
router.post('/param-global/insert', paramGlobal.insert);

router.get('/resource', resource.index);
router.get('/resource/check/:username', resource.check);
router.post('/resource/migrate-roles', resource.migrateRoles);
router.post('/resource/roles/:id', resource.updateRoles);
router.get('/resource/:id', resource.detail);
router.post('/resource', resource.create);
router.put('/resource/update-password/:id', resource.updatePassword);
router.put('/resource/:id', resource.update);
router.delete('/resource/:id', resource.delete);

router.get('/tahun-angkatan/all-data', tahunAngkatan.list);
router.get('/tahun-angkatan', tahunAngkatan.index);
router.get('/tahun-angkatan/:id', tahunAngkatan.detail);
router.post('/tahun-angkatan', tahunAngkatan.create);
router.put('/tahun-angkatan/:id', tahunAngkatan.update);
router.delete('/tahun-angkatan/:id', tahunAngkatan.delete);

router.get('/tingkat/all-data', tingkat.list);
router.get('/tingkat', tingkat.index);
router.get('/tingkat/:id', tingkat.detail);
router.post('/tingkat', sanitizeBody, validate(tingkatSchema), tingkat.create);
router.put(
  '/tingkat/:id',
  sanitizeBody,
  validate(tingkatSchema),
  tingkat.update
);
router.delete('/tingkat/:id', tingkat.delete);
router.post('/tingkat/export', tingkat.export);
router.post('/tingkat/import', tingkat.import);
router.post('/tingkat/insert', tingkat.insert);

router.get('/tahun-ajaran/all-data', tahunAjaran.list);
router.get('/tahun-ajaran', tahunAjaran.index);
router.get('/tahun-ajaran/:id', tahunAjaran.detail);
router.post(
  '/tahun-ajaran',
  sanitizeBody,
  validate(tahunAjaranSchema),
  tahunAjaran.create
);
router.put(
  '/tahun-ajaran/:id',
  sanitizeBody,
  validate(tahunAjaranSchema),
  tahunAjaran.update
);
router.delete('/tahun-ajaran/:id', tahunAjaran.delete);
router.post('/tahun-ajaran/export', tahunAjaran.export);
router.post('/tahun-ajaran/import', tahunAjaran.import);
router.post('/tahun-ajaran/insert', tahunAjaran.insert);

router.get('/semester/all-data', semester.list);
router.get('/semester', semester.index);
router.get('/semester/:id', semester.detail);
router.post(
  '/semester',
  sanitizeBody,
  validate(semesterSchema),
  semester.create
);
router.put(
  '/semester/:id',
  sanitizeBody,
  validate(semesterSchema),
  semester.update
);
router.delete('/semester/:id', semester.delete);
router.post('/semester/export', semester.export);
router.post('/semester/import', semester.import);
router.post('/semester/insert', semester.insert);

router.get('/status-awal-santri/all-data', statusAwalSantri.list);
router.get('/status-awal-santri', statusAwalSantri.index);
router.get('/status-awal-santri/:id', statusAwalSantri.detail);
router.post(
  '/status-awal-santri',
  sanitizeBody,
  validate(statusAwalSantriSchema),
  statusAwalSantri.create
);
router.put(
  '/status-awal-santri/:id',
  sanitizeBody,
  validate(statusAwalSantriSchema),
  statusAwalSantri.update
);
router.delete('/status-awal-santri/:id', statusAwalSantri.delete);
router.post('/status-awal-santri/export', statusAwalSantri.export);
router.post('/status-awal-santri/import', statusAwalSantri.import);
router.post('/status-awal-santri/insert', statusAwalSantri.insert);

router.get('/jenis-beasiswa/all-data', jenisBeasiswa.list);
router.get('/jenis-beasiswa', jenisBeasiswa.index);
router.get('/jenis-beasiswa/:id', jenisBeasiswa.detail);
router.post(
  '/jenis-beasiswa',
  sanitizeBody,
  validate(jenisBeasiswaSchema),
  jenisBeasiswa.create
);
router.put(
  '/jenis-beasiswa/:id',
  sanitizeBody,
  validate(jenisBeasiswaSchema),
  jenisBeasiswa.update
);
router.delete('/jenis-beasiswa/:id', jenisBeasiswa.delete);
router.post('/jenis-beasiswa/export', jenisBeasiswa.export);
router.post('/jenis-beasiswa/import', jenisBeasiswa.import);
router.post('/jenis-beasiswa/insert', jenisBeasiswa.insert);

router.get('/kelompok-pelajaran/all-data', kelompokPejaran.list);
router.get('/kelompok-pelajaran', kelompokPejaran.index);
router.get('/kelompok-pelajaran/:id', kelompokPejaran.detail);
router.post('/kelompok-pelajaran', kelompokPejaran.create);
router.put('/kelompok-pelajaran/:id', kelompokPejaran.update);
router.delete('/kelompok-pelajaran/:id', kelompokPejaran.delete);
router.post('/kelompok-pelajaran/export', kelompokPejaran.export);
router.post('/kelompok-pelajaran/import', kelompokPejaran.import);
router.post('/kelompok-pelajaran/insert', kelompokPejaran.insert);

router.get('/jenis-jam-pelajaran/all-data', jenisJamPelajaran.list);
router.get('/jenis-jam-pelajaran', jenisJamPelajaran.index);
router.get('/jenis-jam-pelajaran/:id', jenisJamPelajaran.detail);
router.post('/jenis-jam-pelajaran', jenisJamPelajaran.create);
router.put('/jenis-jam-pelajaran/:id', jenisJamPelajaran.update);
router.delete('/jenis-jam-pelajaran/:id', jenisJamPelajaran.delete);
router.post('/jenis-jam-pelajaran/export', jenisJamPelajaran.export);
router.post('/jenis-jam-pelajaran/import', jenisJamPelajaran.import);
router.post('/jenis-jam-pelajaran/insert', jenisJamPelajaran.insert);

router.get('/guru-mata-pelajaran/all-data', guruMapel.list);
router.get('/guru-mata-pelajaran', guruMapel.index);
router.get('/guru-mata-pelajaran/:id', guruMapel.detail);
router.post('/guru-mata-pelajaran', guruMapel.create);
router.put('/guru-mata-pelajaran/:id', guruMapel.update);
router.delete('/guru-mata-pelajaran/:id', guruMapel.delete);
router.delete('/guru-mata-pelajaran/:id', guruMapel.delete);
router.post('/guru-mata-pelajaran/export', guruMapel.export);
router.post('/guru-mata-pelajaran/import', guruMapel.import);
router.post('/guru-mata-pelajaran/insert', guruMapel.insert);

router.get('/mata-pelajaran/all-data', mataPelajaran.list);
router.get('/mata-pelajaran', mataPelajaran.index);
router.get('/mata-pelajaran/:id', mataPelajaran.detail);
router.post('/mata-pelajaran', mataPelajaran.create);
router.put('/mata-pelajaran/:id', mataPelajaran.update);
router.delete('/mata-pelajaran/:id', mataPelajaran.delete);
router.post('/mata-pelajaran/export', mataPelajaran.export);
router.post('/mata-pelajaran/import', mataPelajaran.import);
router.post('/mata-pelajaran/insert', mataPelajaran.insert);

router.get('/jam-pelajaran/all-data', jamPelajaran.list);
router.get('/jam-pelajaran', jamPelajaran.index);
router.get('/jam-pelajaran/:id', jamPelajaran.detail);
router.post('/jam-pelajaran', jamPelajaran.create);
router.put('/jam-pelajaran/:id', jamPelajaran.update);
router.delete('/jam-pelajaran/:id', jamPelajaran.delete);
router.post('/jam-pelajaran/export', jamPelajaran.export);
router.post('/jam-pelajaran/import', jamPelajaran.import);
router.post('/jam-pelajaran/insert', jamPelajaran.insert);

router.get('/cabang/all-data', cabang.list);
router.get('/cabang', cabang.index);
router.get('/cabang/:id', cabang.detail);
router.post('/cabang', cabang.create);
router.put('/cabang/:id', cabang.update);
router.delete('/cabang/:id', cabang.delete);
router.post('/cabang/export', cabang.export);
router.post('/cabang/import', cabang.import);
router.post('/cabang/insert', cabang.insert);

router.get(
  '/lembaga-kepesantrenan/all-data',
  LembagaPendidikanKepesantrenan.list
);
router.get('/lembaga-kepesantrenan', LembagaPendidikanKepesantrenan.index);
router.get('/lembaga-kepesantrenan/:id', LembagaPendidikanKepesantrenan.detail);
router.post('/lembaga-kepesantrenan', LembagaPendidikanKepesantrenan.create);
router.put('/lembaga-kepesantrenan/:id', LembagaPendidikanKepesantrenan.update);
router.delete(
  '/lembaga-kepesantrenan/:id',
  LembagaPendidikanKepesantrenan.delete
);
router.post(
  '/lembaga-kepesantrenan/export',
  LembagaPendidikanKepesantrenan.export
);
router.post(
  '/lembaga-kepesantrenan/import',
  LembagaPendidikanKepesantrenan.import
);
router.post(
  '/lembaga-kepesantrenan/insert',
  LembagaPendidikanKepesantrenan.insert
);

router.get('/lembaga-formal/all-data', LembagaPendidikanFormal.list);
router.get('/lembaga-formal', LembagaPendidikanFormal.index);
router.get('/lembaga-formal/:id', LembagaPendidikanFormal.detail);
router.post('/lembaga-formal', LembagaPendidikanFormal.create);
router.put('/lembaga-formal/:id', LembagaPendidikanFormal.update);
router.delete('/lembaga-formal/:id', LembagaPendidikanFormal.delete);
router.post('/lembaga-formal/export', LembagaPendidikanFormal.export);
router.post('/lembaga-formal/import', LembagaPendidikanFormal.import);
router.post('/lembaga-formal/insert', LembagaPendidikanFormal.insert);

router.get('/institution/all-data', institution.list);
router.get('/institution', institution.index);
router.get('/institution/:id', institution.detail);

router.get('/organization-unit/all-data', OrganizationUnit.list);
router.get('/organization-unit', OrganizationUnit.index);
router.get('/organization-unit/:id', OrganizationUnit.detail);
router.post('/organization-unit', OrganizationUnit.create);
router.put('/organization-unit/:id', OrganizationUnit.update);
router.delete('/organization-unit/:id', OrganizationUnit.delete);
router.post('/organization-unit/export', OrganizationUnit.export);
router.post('/organization-unit/import', OrganizationUnit.import);
router.post('/organization-unit/insert', OrganizationUnit.insert);

router.get('/jabatan/all-data', Jabatan.list);
router.get('/jabatan', Jabatan.index);
router.get('/jabatan/:id', Jabatan.detail);
router.post('/jabatan', Jabatan.create);
router.put('/jabatan/:id', Jabatan.update);
router.delete('/jabatan/:id', Jabatan.delete);
router.post('/jabatan/export', Jabatan.export);
router.post('/jabatan/import', Jabatan.import);
router.post('/jabatan/insert', Jabatan.insert);

router.get('/jenis-penilaian/all-data', JenisPenilaian.list);
router.get('/jenis-penilaian', JenisPenilaian.index);
router.get('/jenis-penilaian/:id', JenisPenilaian.detail);
router.post('/jenis-penilaian', JenisPenilaian.create);
router.put('/jenis-penilaian/:id', JenisPenilaian.update);
router.delete('/jenis-penilaian/:id', JenisPenilaian.delete);
router.post('/jenis-penilaian/export', JenisPenilaian.export);
router.post('/jenis-penilaian/import', JenisPenilaian.import);
router.post('/jenis-penilaian/insert', JenisPenilaian.insert);

router.get('/bobot-penilaian/all-data', JenisPenilaianBobot.list);
router.get('/bobot-penilaian', JenisPenilaianBobot.index);
router.get('/bobot-penilaian/:id', JenisPenilaianBobot.detail);
router.post('/bobot-penilaian', JenisPenilaianBobot.create);
router.put('/bobot-penilaian/:id', JenisPenilaianBobot.update);
router.delete('/bobot-penilaian/:id', JenisPenilaianBobot.delete);
router.post('/bobot-penilaian/export', JenisPenilaianBobot.export);
router.post('/bobot-penilaian/import', JenisPenilaianBobot.import);
router.post('/bobot-penilaian/insert', JenisPenilaianBobot.insert);

router.get('/asrama/all-data', Asrama.list);
router.get('/asrama', Asrama.index);
router.get('/asrama/:id', Asrama.detail);
router.post('/asrama', Asrama.create);
router.put('/asrama/:id', Asrama.update);
router.delete('/asrama/:id', Asrama.delete);

router.get('/pegawai/all-data', Pegawai.list);
router.get('/pegawai', Pegawai.index);
router.get('/pegawai/:id', Pegawai.detail);
router.post('/pegawai', Pegawai.create);
router.put('/pegawai/:id', Pegawai.update);
router.delete('/pegawai/:id', Pegawai.delete);
router.post('/pegawai/export', Pegawai.export);
router.post('/pegawai/import', Pegawai.import);
router.post('/pegawai/insert', Pegawai.insert);

router.get('/pegawai-jam-kerja/all-data', JamKerjaPegawai.list);
router.get('/pegawai-jam-kerja', JamKerjaPegawai.index);
router.get('/pegawai-jam-kerja/:id', JamKerjaPegawai.detail);
router.post('/pegawai-jam-kerja', JamKerjaPegawai.create);
router.put('/pegawai-jam-kerja/:id', JamKerjaPegawai.update);
router.delete('/pegawai-jam-kerja/:id', JamKerjaPegawai.delete);
router.post('/pegawai-jam-kerja/export', JamKerjaPegawai.export);
router.post('/pegawai-jam-kerja/import', JamKerjaPegawai.import);
router.post('/pegawai-jam-kerja/insert', JamKerjaPegawai.insert);

router.post(
  '/pegawai-absen-harian/clock-in',
  AbsenHarianPegawaiController.clockIn
);
router.post(
  '/pegawai-absen-harian/clock-out',
  AbsenHarianPegawaiController.clockOut
);
router.get(
  '/pegawai-absen-harian/today',
  AbsenHarianPegawaiController.getAttendanceToday
);
router.get('/pegawai-absen-harian', AbsenHarianPegawaiController.index);
router.get('/pegawai-absen-harian/:id', AbsenHarianPegawaiController.detail);
// router.post('/pegawai-absen-harian', AbsenHarianPegawaiController.create);
router.delete('/pegawai-absen-harian/:id', AbsenHarianPegawaiController.delete);
router.post(
  '/pegawai-absen-harian/export',
  AbsenHarianPegawaiController.export
);
router.post(
  '/pegawai-absen-harian/import',
  AbsenHarianPegawaiController.import
);
router.post(
  '/pegawai-absen-harian/insert',
  AbsenHarianPegawaiController.insert
);

router.get('/kamar/all-data', Kamar.list);
router.get('/kamar', Kamar.index);
router.get('/kamar/:id', Kamar.detail);
router.post('/kamar', Kamar.create);
router.put('/kamar/:id', Kamar.update);
router.delete('/kamar/:id', Kamar.delete);

router.get('/penempatan-kamar-santri/all-data', PenempatanKamarSantri.list);
router.get('/penempatan-kamar-santri', PenempatanKamarSantri.index);
router.get('/penempatan-kamar-santri/:id', PenempatanKamarSantri.detail);
router.post('/penempatan-kamar-santri', PenempatanKamarSantri.create);
router.put('/penempatan-kamar-santri/:id', PenempatanKamarSantri.update);
router.delete('/penempatan-kamar-santri/:id', PenempatanKamarSantri.delete);
router.post('/penempatan-kamar-santri/export', PenempatanKamarSantri.export);
router.post('/penempatan-kamar-santri/import', PenempatanKamarSantri.import);
router.post('/penempatan-kamar-santri/insert', PenempatanKamarSantri.insert);

router.get('/absen-harian-santri', AbsenHarianSantriController.index);
router.get(
  '/absen-harian-santri/santri-kamar',
  AbsenHarianSantriController.getSantriKamarReady
);
router.get(
  '/absen-harian-santri/shift-presensi',
  AbsenHarianSantriController.findAsramaShift
);
router.post(
  '/absen-harian-santri',
  AbsenHarianSantriController.saveKamarPresensi
);
router.post(
  '/absen-harian-santri/scan-qr',
  AbsenHarianSantriController.scanQrPresensi
);
router.post('/absen-harian-santri/export', AbsenHarianSantriController.export);
router.post('/absen-harian-santri/import', AbsenHarianSantriController.import);
router.post('/absen-harian-santri/insert', AbsenHarianSantriController.insert);
router.get('/absen-harian-santri/:id', AbsenHarianSantriController.detail);
router.put('/absen-harian-santri/:id', AbsenHarianSantriController.update);

router.get('/absen-kelas-santri', AbsenKelasSantriController.index);
router.get(
  '/absen-kelas-santri/jam-pelajaran',
  AbsenKelasSantriController.findJamPelajaran
);
router.get(
  '/absen-kelas-santri/kelas-santri',
  AbsenKelasSantriController.findKelasSantri
);
router.get(
  '/absen-kelas-santri/kelas-list',
  AbsenKelasSantriController.findKelasList
);
router.get('/absen-kelas-santri/:id', AbsenKelasSantriController.detail);
router.post(
  '/absen-kelas-santri',
  AbsenKelasSantriController.saveKelasPresensi
);
router.post(
  '/absen-kelas-santri/scan-qr',
  AbsenKelasSantriController.scanQrPresensi
);
router.post('/absen-kelas-santri/export', AbsenKelasSantriController.export);
router.post('/absen-kelas-santri/import', AbsenKelasSantriController.import);
router.post('/absen-kelas-santri/insert', AbsenKelasSantriController.insert);
router.put('/absen-kelas-santri/:id', AbsenKelasSantriController.update);

router.get('/jurnal-kelas/active', JurnalKelasController.getActiveJurnal);
router.post('/jurnal-kelas/end', JurnalKelasController.endJurnal);
router.get('/jurnal-kelas/rekap-guru', JurnalKelasController.getRekapGuru);
router.post(
  '/jurnal-kelas/rekap-guru/export',
  JurnalKelasController.exportRekapGuru
);
router.get('/jurnal-kelas', JurnalKelasController.index);
router.post('/jurnal-kelas/export', JurnalKelasController.export);

router.get('/kegiatan-akademik/all-data', kegiatanAkademik.list);
router.get('/kegiatan-akademik', kegiatanAkademik.index);
router.get('/kegiatan-akademik/:id', kegiatanAkademik.detail);
router.post('/kegiatan-akademik', kegiatanAkademik.create);
router.put('/kegiatan-akademik/:id', kegiatanAkademik.update);
router.delete('/kegiatan-akademik/:id', kegiatanAkademik.delete);

router.get('/program-pesantren/all-data', programPesantren.list);
router.get('/program-pesantren', programPesantren.index);
router.get('/program-pesantren/:id', programPesantren.detail);
router.post('/program-pesantren', programPesantren.create);
router.put('/program-pesantren/:id', programPesantren.update);
router.delete('/program-pesantren/:id', programPesantren.delete);

router.get('/santri-program/all-data', santriProgram.list);
router.get('/santri-program', santriProgram.index);
router.get('/santri-program/:id', santriProgram.detail);
router.post('/santri-program', santriProgram.create);
router.put('/santri-program/:id', santriProgram.update);
router.delete('/santri-program/:id', santriProgram.delete);

router.get('/orang-tua-wali/all-data', orangTuaWali.list);
router.get('/orang-tua-wali', orangTuaWali.index);
router.get('/orang-tua-wali/:id', orangTuaWali.detail);
router.post(
  '/orang-tua-wali',
  sanitizeBody,
  validate(orangTuaWaliSchema),
  orangTuaWali.create
);
router.put(
  '/orang-tua-wali/:id',
  sanitizeBody,
  validate(orangTuaWaliSchema),
  orangTuaWali.update
);
router.delete('/orang-tua-wali/:id', orangTuaWali.delete);
router.post('/orang-tua-wali/export', orangTuaWali.export);
router.post('/orang-tua-wali/import', orangTuaWali.import);
router.post('/orang-tua-wali/insert', orangTuaWali.insert);

router.get('/inventaris-umum/all-data', inventarisUmum.list);
router.get('/inventaris-umum', inventarisUmum.index);
router.get('/inventaris-umum/:id', inventarisUmum.detail);
router.post('/inventaris-umum', inventarisUmum.create);
router.put('/inventaris-umum/:id', inventarisUmum.update);
router.delete('/inventaris-umum/:id', inventarisUmum.delete);

router.get('/inventaris-aset-harian/all-data', inventarisAsetHarian.list);
router.get('/inventaris-aset-harian', inventarisAsetHarian.index);
router.get('/inventaris-aset-harian/:id', inventarisAsetHarian.detail);
router.post('/inventaris-aset-harian', inventarisAsetHarian.create);
router.put('/inventaris-aset-harian/:id', inventarisAsetHarian.update);
router.delete('/inventaris-aset-harian/:id', inventarisAsetHarian.delete);

router.get('/kelas-mda/all-data', kelasMda.list);
router.get('/kelas-mda', kelasMda.index);
router.get('/kelas-mda/:id', kelasMda.detail);
router.post(
  '/kelas-mda',
  sanitizeBody,
  validate(kelasMdaSchema),
  kelasMda.create
);
router.put(
  '/kelas-mda/:id',
  sanitizeBody,
  validate(kelasMdaSchema),
  kelasMda.update
);
router.delete('/kelas-mda/:id', kelasMda.delete);
router.post('/kelas-mda/export', kelasMda.export);
router.post('/kelas-mda/import', kelasMda.import);
router.post('/kelas-mda/insert', kelasMda.insert);

router.get('/kelas-formal/all-data', kelasFormal.list);
router.get('/kelas-formal', kelasFormal.index);
router.get('/kelas-formal/:id', kelasFormal.detail);
router.post(
  '/kelas-formal',
  sanitizeBody,
  validate(kelasFormalSchema),
  kelasFormal.create
);
router.put(
  '/kelas-formal/:id',
  sanitizeBody,
  validate(kelasFormalSchema),
  kelasFormal.update
);
router.delete('/kelas-formal/:id', kelasFormal.delete);
router.post('/kelas-formal/export', kelasFormal.export);
router.post('/kelas-formal/import', kelasFormal.import);
router.post('/kelas-formal/insert', kelasFormal.insert);

router.get('/location/all-data', Location.list);
router.get('/location', Location.index);
router.get('/location/:id', Location.detail);
router.post('/location', Location.create);
router.put('/location/:id', Location.update);
router.delete('/location/:id', Location.delete);
router.post('/location/export', Location.export);
router.post('/location/import', Location.import);
router.post('/location/insert', Location.insert);

router.get('/geo-area/all-data', GeoArea.list);
router.get('/geo-area', GeoArea.index);
router.get('/geo-area/:id', GeoArea.detail);
router.post('/geo-area', GeoArea.create);
router.put('/geo-area/:id', GeoArea.update);
router.delete('/geo-area/:id', GeoArea.delete);
router.post('/location_qrcode', Location.findQrCode);
router.post('/location_latlong', Location.findAllLocationByLatlong);

router.get('/jadwal-pelajaran/all-data', jadwalPelajaran.list);
router.get('/jadwal-pelajaran', jadwalPelajaran.index);
router.get('/jadwal-pelajaran/:id', jadwalPelajaran.detail);
router.post(
  '/jadwal-pelajaran',
  sanitizeBody,
  validate(jadwalPelajaranSchema),
  jadwalPelajaran.create
);
router.put(
  '/jadwal-pelajaran/:id',
  sanitizeBody,
  validate(jadwalPelajaranSchema),
  jadwalPelajaran.update
);
router.delete('/jadwal-pelajaran/:id', jadwalPelajaran.delete);
router.post('/jadwal-pelajaran/export', jadwalPelajaran.export);
router.post('/jadwal-pelajaran/import', jadwalPelajaran.import);
router.post('/jadwal-pelajaran/insert', jadwalPelajaran.insert);

router.get('/shift-presensi/all-data', shiftPresensi.list);
router.get('/shift-presensi', shiftPresensi.index);
router.get('/shift-presensi/:id', shiftPresensi.detail);
router.post(
  '/shift-presensi',
  sanitizeBody,
  validate(shiftPresensiSchema),
  shiftPresensi.create
);
router.put(
  '/shift-presensi/:id',
  sanitizeBody,
  validate(shiftPresensiSchema),
  shiftPresensi.update
);
router.delete('/shift-presensi/:id', shiftPresensi.delete);
router.post('/shift-presensi/export', shiftPresensi.export);
router.post('/shift-presensi/import', shiftPresensi.import);
router.post('/shift-presensi/insert', shiftPresensi.insert);

router.get('/master-slot-waktu/all-data', masterSlotWaktu.list);
router.get('/master-slot-waktu', masterSlotWaktu.index);
router.get('/master-slot-waktu/:id', masterSlotWaktu.detail);
router.post(
  '/master-slot-waktu',
  sanitizeBody,
  validate(masterSlotWaktuSchema),
  masterSlotWaktu.create
);
router.put(
  '/master-slot-waktu/:id',
  sanitizeBody,
  validate(masterSlotWaktuSchema),
  masterSlotWaktu.update
);
router.delete('/master-slot-waktu/:id', masterSlotWaktu.delete);
router.post('/master-slot-waktu/export', masterSlotWaktu.export);
router.post('/master-slot-waktu/import', masterSlotWaktu.import);
router.post('/master-slot-waktu/insert', masterSlotWaktu.insert);

router.get(
  '/jadwal-inspeksi-kebersihan/all-data',
  jadwalInspeksiKebersihan.list
);
router.get('/jadwal-inspeksi-kebersihan', jadwalInspeksiKebersihan.index);
router.get('/jadwal-inspeksi-kebersihan/:id', jadwalInspeksiKebersihan.detail);
router.post(
  '/jadwal-inspeksi-kebersihan',
  sanitizeBody,
  validate(jadwalInspeksiKebersihanSchema),
  jadwalInspeksiKebersihan.create
);
router.put(
  '/jadwal-inspeksi-kebersihan/:id',
  sanitizeBody,
  validate(jadwalInspeksiKebersihanSchema),
  jadwalInspeksiKebersihan.update
);
router.delete(
  '/jadwal-inspeksi-kebersihan/:id',
  jadwalInspeksiKebersihan.delete
);
router.post(
  '/jadwal-inspeksi-kebersihan/export',
  jadwalInspeksiKebersihan.export
);
router.post(
  '/jadwal-inspeksi-kebersihan/import',
  jadwalInspeksiKebersihan.import
);
router.post(
  '/jadwal-inspeksi-kebersihan/insert',
  jadwalInspeksiKebersihan.insert
);

router.get('/kebersihan-inspeksi/all-data', kebersihanInspeksi.list);
router.get('/kebersihan-inspeksi', kebersihanInspeksi.index);
router.get('/kebersihan-inspeksi/:id', kebersihanInspeksi.detail);
router.post(
  '/kebersihan-inspeksi',
  sanitizeBody,
  validate(kebersihanInspeksiSchema),
  kebersihanInspeksi.create
);
router.put(
  '/kebersihan-inspeksi/:id',
  sanitizeBody,
  validate(kebersihanInspeksiSchema),
  kebersihanInspeksi.update
);
router.delete('/kebersihan-inspeksi/:id', kebersihanInspeksi.delete);
router.post('/kebersihan-inspeksi/export', kebersihanInspeksi.export);
router.get('/kebersihan-inspeksi-petugas', kebersihanInspeksi.indexPetugas);
router.post(
  '/kebersihan-inspeksi-petugas/export',
  kebersihanInspeksi.exportPetugas
);

router.get('/kebersihan-temuan/all-data', kebersihanTemuan.list);
router.get('/kebersihan-temuan', kebersihanTemuan.index);
router.get('/kebersihan-temuan/:id', kebersihanTemuan.detail);
router.post(
  '/kebersihan-temuan',
  sanitizeBody,
  validate(kebersihanTemuanSchema),
  kebersihanTemuan.create
);
router.put(
  '/kebersihan-temuan/:id',
  sanitizeBody,
  validate(kebersihanTemuanSchema),
  kebersihanTemuan.update
);
router.delete('/kebersihan-temuan/:id', kebersihanTemuan.delete);
router.post('/kebersihan-temuan/export', kebersihanTemuan.export);

router.get('/kebersihan-scan-log/all-data', kebersihanScanLog.list);
router.get('/kebersihan-scan-log', kebersihanScanLog.index);
router.get('/kebersihan-scan-log/:id', kebersihanScanLog.detail);
router.post(
  '/kebersihan-scan-log',
  sanitizeBody,
  validate(kebersihanScanLogSchema),
  kebersihanScanLog.create
);
router.put(
  '/kebersihan-scan-log/:id',
  sanitizeBody,
  validate(kebersihanScanLogSchema),
  kebersihanScanLog.update
);
router.delete('/kebersihan-scan-log/:id', kebersihanScanLog.delete);
router.post('/kebersihan-scan-log/export', kebersihanScanLog.export);
router.get('/santri/all-data', santri.list);
router.get('/santri', santri.index);
router.get('/santri/:id', santri.detail);
router.put('/santri/:id', sanitizeBody, santri.update);
router.post('/santri/export', santri.export);

router.get('/notification', notification.index);
router.put(
  '/notification/:id',
  sanitizeBody,
  validate(notificationSchema),
  notification.update
);
router.delete('/notification/:id', notification.delete);

// ROUTE PERIZINAN SANTRI
router.get(
  '/perizinan-santri',
  auth.checkBearerToken,
  PerizinanSantriController.index
);
router.post(
  '/perizinan-santri',
  auth.checkBearerToken,
  PerizinanSantriController.create
);
router.post(
  '/perizinan-santri/approve/:id',
  auth.checkBearerToken,
  PerizinanSantriController.approve
);
router.post(
  '/perizinan-santri/cancel/:id',
  auth.checkBearerToken,
  PerizinanSantriController.cancel
);
router.post(
  '/perizinan-santri/request-cancellation/:id',
  auth.checkBearerToken,
  PerizinanSantriController.requestPembatalan
);
router.post(
  '/perizinan-santri/scan-qr-gate',
  auth.checkBearerToken,
  PerizinanSantriController.scanQrGate
);
router.post(
  '/perizinan-santri/scan-card-gate',
  auth.checkBearerToken,
  PerizinanSantriController.scanCardGate
);
router.post(
  '/perizinan-santri/export',
  auth.checkBearerToken,
  PerizinanSantriController.export
);
router.post(
  '/perizinan-santri/import',
  auth.checkBearerToken,
  PerizinanSantriController.import
);
router.post(
  '/perizinan-santri/insert',
  auth.checkBearerToken,
  PerizinanSantriController.insert
);
router.post(
  '/perizinan-santri/massal',
  auth.checkBearerToken,
  PerizinanSantriController.insertMassalSantri
);
router.get(
  '/perizinan-santri/:id',
  auth.checkBearerToken,
  PerizinanSantriController.detail
);
router.put(
  '/perizinan-santri/:id',
  auth.checkBearerToken,
  PerizinanSantriController.update
);
router.get(
  '/log-gate-santri/all-data',
  auth.checkBearerToken,
  LogGateSantriController.list
);
router.get(
  '/log-gate-santri',
  auth.checkBearerToken,
  LogGateSantriController.index
);
router.get(
  '/log-gate-santri/:id',
  auth.checkBearerToken,
  LogGateSantriController.detail
);
router.post(
  '/log-gate-santri',
  auth.checkBearerToken,
  LogGateSantriController.create
);
router.put(
  '/log-gate-santri/:id',
  auth.checkBearerToken,
  LogGateSantriController.update
);
router.delete(
  '/log-gate-santri/:id',
  auth.checkBearerToken,
  LogGateSantriController.delete
);
router.post(
  '/log-gate-santri/export',
  auth.checkBearerToken,
  LogGateSantriController.export
);
router.post(
  '/log-gate-santri/import',
  auth.checkBearerToken,
  LogGateSantriController.import
);
router.post(
  '/log-gate-santri/insert',
  auth.checkBearerToken,
  LogGateSantriController.insert
);

router.get(
  '/rapot-santri/all-data',
  auth.checkBearerToken,
  rapotSantriController.list
);
router.get('/rapot-santri', auth.checkBearerToken, rapotSantriController.index);
router.post(
  '/rapot-santri/export',
  auth.checkBearerToken,
  rapotSantriController.export
);
router.get(
  '/rapot-santri/:id',
  auth.checkBearerToken,
  rapotSantriController.detail
);
router.post(
  '/rapot-santri',
  auth.checkBearerToken,
  rapotSantriController.create
);
router.put(
  '/rapot-santri/:id',
  auth.checkBearerToken,
  rapotSantriController.update
);
router.delete(
  '/rapot-santri/:id',
  auth.checkBearerToken,
  rapotSantriController.delete
);

router.get(
  '/penempatan-kelas-santri/all-data',
  auth.checkBearerToken,
  penempatanKelasSantri.list
);
router.get(
  '/penempatan-kelas-santri',
  auth.checkBearerToken,
  penempatanKelasSantri.index
);
router.get(
  '/penempatan-kelas-santri/:id',
  auth.checkBearerToken,
  penempatanKelasSantri.detail
);
router.post(
  '/penempatan-kelas-santri',
  auth.checkBearerToken,
  penempatanKelasSantri.create
);
router.put(
  '/penempatan-kelas-santri/:id',
  auth.checkBearerToken,
  penempatanKelasSantri.update
);
router.delete(
  '/penempatan-kelas-santri/:id',
  auth.checkBearerToken,
  penempatanKelasSantri.delete
);
router.post(
  '/penempatan-kelas-santri/export',
  auth.checkBearerToken,
  penempatanKelasSantri.export
);
router.post(
  '/penempatan-kelas-santri/import',
  auth.checkBearerToken,
  penempatanKelasSantri.import
);
router.post(
  '/penempatan-kelas-santri/insert',
  auth.checkBearerToken,
  penempatanKelasSantri.insert
);

router.get('/activity-log', auth.checkBearerToken, activityLog.index);
router.get('/activity-log/:id', auth.checkBearerToken, activityLog.detail);

router.get('/guru-pengganti/all-data', guruPengganti.list);
router.get('/guru-pengganti', guruPengganti.index);
router.get('/guru-pengganti/:id', guruPengganti.detail);
router.post(
  '/guru-pengganti',
  sanitizeBody,
  validate(guruPenggantiSchema),
  guruPengganti.create
);
router.put(
  '/guru-pengganti/:id',
  sanitizeBody,
  validate(guruPenggantiSchema),
  guruPengganti.update
);
router.delete('/guru-pengganti/:id', guruPengganti.delete);
router.post('/guru-pengganti/export', guruPengganti.export);
router.post('/guru-pengganti/import', guruPengganti.import);
router.post('/guru-pengganti/insert', guruPengganti.insert);

// ROUTE KESEHATAN SANTRI
router.get('/kesehatan-santri', auth.checkBearerToken, kesehatanSantri.index);
router.get(
  '/kesehatan-santri/:id',
  auth.checkBearerToken,
  kesehatanSantri.detail
);
router.post(
  '/kesehatan-santri',
  auth.checkBearerToken,
  sanitizeBody,
  validate(createKesehatanSchema),
  kesehatanSantri.create
);
router.put(
  '/kesehatan-santri/:id',
  auth.checkBearerToken,
  sanitizeBody,
  validate(updateKesehatanSchema),
  kesehatanSantri.update
);
router.delete(
  '/kesehatan-santri/:id',
  auth.checkBearerToken,
  kesehatanSantri.delete
);
router.post(
  '/kesehatan-santri/export',
  auth.checkBearerToken,
  kesehatanSantri.export
);

router.get('/notification', notification.index);
router.put(
  '/notification/:id',
  sanitizeBody,
  validate(notificationSchema),
  notification.update
);
router.delete('/notification/:id', notification.delete);

router.get('/kamar-belum-absen', laporanPresensiController.getKamarBelumAbsen);
router.get('/kelas-belum-absen', laporanPresensiController.getKelasBelumAbsen);
router.get('/pegawai-belum-absen', laporanPresensiController.getPegawaiBelumAbsen);
router.get('/guru-belum-absen', laporanPresensiController.getGuruBelumAbsen);
router.get('/inspeksi-belum-dikerjakan', laporanPresensiController.getPetugasInspeksiBelumAbsen);

export default router;
