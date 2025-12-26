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
import { semester } from './semester/semester.ajaran.controller';
import { semesterSchema } from './semester/semester.schema';
import { statusAwalSantri } from './status.awal.santri/status.awal.santri.controller';
import { statusAwalSantriSchema } from './status.awal.santri/status.awal.santri.schema';
import { jenisBeasiswa } from './jenis.beasiswa/jenis.beasiswa.controller';
import { jenisBeasiswaSchema } from './jenis.beasiswa/jenis.beasiswa.schema';
import { kelompokPejaran } from './kelompok.pelajaran/kelompok.pelajaran.controller';
import { jenisJamPelajaran } from './jenis.jampel/jenis.jampel.controller';
import { jenisGuru } from './jenis.guru/jenis.guru.controller';
import { mataPelajaran } from './mata.pelajaran/mata.pelajaran.controller';
import { jamPelajaran } from './jam.pelajaran/jam.pelajaran.controller';
import { cabang } from './cabang/cabang.controller';
import { LembagaPendidikanKepesantrenan } from './lembaga.pendidikan.kepesantrenan/lembaga.pendidikan.kepesantrenan.controller';
import { OrganitationUnit } from './organitation.unit/organitation.unit.controller';
import { Jabatan } from './jabatan/jabatan.controller';
import { JenisPenilaian } from './jenis.penilaian/jenis.penilaian.controller';
import { Asrama } from './asrama/asrama.controller';
import { kegiatanAkademik } from './kegiatan.akademik/kegiatan.akademik.controller';
import { programPesantren } from './program.pesantren/program.pesantren.controller';
import { santriProgram } from './santri.program/santri.program.controller';
import { orangTuaWali } from './orang.tua.wali/orang.tua.wali.controller';
import { LembagaPendidikanFormal } from './lembaga.pendidikan.formal/lembaga.pendidikan.formal.controller';
import { Pegawai } from './pegawai/pegawai.controller';
import { inventarisUmum } from './inventaris.umum/inventaris.umum.controller';
import { inventarisAsetHarian } from './inventaris.aset.harian/inventaris.aset.harian.controller';

const router: Router = Router();

router.get('/role/all-data', auth.checkBearerToken, role.list);
router.get('/role', auth.checkBearerToken, role.index);
router.get('/role/:id', auth.checkBearerToken, role.detail);
router.post('/role', auth.checkBearerToken, role.create);
router.put('/role/:id', auth.checkBearerToken, role.update);
router.delete('/role/:id', auth.checkBearerToken, role.delete);

router.get('/menu/all-data', auth.checkBearerToken, menu.list);
router.get('/menu', auth.checkBearerToken, menu.index);
router.get('/menu/:id', auth.checkBearerToken, menu.detail);
router.post('/menu', auth.checkBearerToken, menu.create);
router.put('/menu/:id', auth.checkBearerToken, menu.update);
router.delete('/menu/:id', auth.checkBearerToken, menu.delete);

router.get('/role-menu/all-data', auth.checkBearerToken, roleMenu.list);
router.get('/role-menu', auth.checkBearerToken, roleMenu.index);
router.get('/role-menu/:id', auth.checkBearerToken, roleMenu.detail);
router.post('/role-menu', auth.checkBearerToken, roleMenu.create);

router.get('/param-global/all-data', auth.checkToken, paramGlobal.list);
router.get('/param-global', auth.checkToken, paramGlobal.index);
router.get('/param-global/detail', auth.checkToken, paramGlobal.detail);
router.get('/param-global/:id', auth.checkBearerToken, paramGlobal.detailById);
router.post('/param-global', auth.checkBearerToken, paramGlobal.create);
router.put('/param-global/:id', auth.checkBearerToken, paramGlobal.update);
router.delete('/param-global/:id', auth.checkBearerToken, paramGlobal.delete);

router.get('/resource', auth.checkBearerToken, resource.index);
router.get('/resource/check/:username', auth.checkBearerToken, resource.check);
router.get('/resource/:id', auth.checkBearerToken, resource.detail);
router.post('/resource', auth.checkBearerToken, resource.create);
router.put('/resource/:id', auth.checkBearerToken, resource.update);
router.delete('/resource/:id', auth.checkBearerToken, resource.delete);

router.get(
  '/tahun-angkatan/all-data',
  auth.checkBearerToken,
  tahunAngkatan.list
);
router.get('/tahun-angkatan', auth.checkBearerToken, tahunAngkatan.index);
router.get('/tahun-angkatan/:id', auth.checkBearerToken, tahunAngkatan.detail);
router.post('/tahun-angkatan', auth.checkBearerToken, tahunAngkatan.create);
router.put('/tahun-angkatan/:id', auth.checkBearerToken, tahunAngkatan.update);
router.delete(
  '/tahun-angkatan/:id',
  auth.checkBearerToken,
  tahunAngkatan.delete
);

router.get('/tingkat/all-data', auth.checkBearerToken, tingkat.list);
router.get('/tingkat', auth.checkBearerToken, tingkat.index);
router.get('/tingkat/:id', auth.checkBearerToken, tingkat.detail);
router.post('/tingkat', auth.checkBearerToken, sanitizeBody, validate(tingkatSchema), tingkat.create);
router.put('/tingkat/:id', auth.checkBearerToken, sanitizeBody, validate(tingkatSchema), tingkat.update);
router.delete('/tingkat/:id', auth.checkBearerToken, tingkat.delete);
router.post(
  '/tingkat/export',
  auth.checkBearerToken,
  tingkat.export
);

router.get('/tahun-ajaran/all-data', auth.checkBearerToken, tahunAjaran.list);
router.get('/tahun-ajaran', auth.checkBearerToken, tahunAjaran.index);
router.get('/tahun-ajaran/:id', auth.checkBearerToken, tahunAjaran.detail);
router.post('/tahun-ajaran', auth.checkBearerToken, sanitizeBody, validate(tahunAjaranSchema), tahunAjaran.create);
router.put('/tahun-ajaran/:id', auth.checkBearerToken, sanitizeBody, validate(tahunAjaranSchema), tahunAjaran.update);
router.delete('/tahun-ajaran/:id', auth.checkBearerToken, tahunAjaran.delete);
router.post(
  '/tahun-ajaran/export',
  auth.checkBearerToken,
  tahunAjaran.export
);

router.get('/semester/all-data', auth.checkBearerToken, semester.list);
router.get('/semester', auth.checkBearerToken, semester.index);
router.get('/semester/:id', auth.checkBearerToken, semester.detail);
router.post('/semester', auth.checkBearerToken, sanitizeBody, validate(semesterSchema), semester.create);
router.put('/semester/:id', auth.checkBearerToken, sanitizeBody, validate(semesterSchema), semester.update);
router.delete('/semester/:id', auth.checkBearerToken, semester.delete);
router.post(
  '/semester/export',
  auth.checkBearerToken,
  semester.export
);

router.get(
  '/status-awal-santri/all-data',
  auth.checkBearerToken,
  statusAwalSantri.list
);
router.get(
  '/status-awal-santri',
  auth.checkBearerToken,
  statusAwalSantri.index
);
router.get(
  '/status-awal-santri/:id',
  auth.checkBearerToken,
  statusAwalSantri.detail
);
router.post(
  '/status-awal-santri',
  auth.checkBearerToken,
  sanitizeBody,
  validate(statusAwalSantriSchema),
  statusAwalSantri.create
);
router.put(
  '/status-awal-santri/:id',
  auth.checkBearerToken,
  sanitizeBody,
  validate(statusAwalSantriSchema),
  statusAwalSantri.update
);
router.delete(
  '/status-awal-santri/:id',
  auth.checkBearerToken,
  statusAwalSantri.delete
);
router.post(
  '/status-awal-santri/export',
  auth.checkBearerToken,
  statusAwalSantri.export
);

router.get(
  '/jenis-beasiswa/all-data',
  auth.checkBearerToken,
  jenisBeasiswa.list
);
router.get('/jenis-beasiswa', auth.checkBearerToken, jenisBeasiswa.index);
router.get(
  '/jenis-beasiswa/:id',
  auth.checkBearerToken,
  jenisBeasiswa.detail
);
router.post('/jenis-beasiswa', auth.checkBearerToken, sanitizeBody, validate(jenisBeasiswaSchema), jenisBeasiswa.create);
router.put(
  '/jenis-beasiswa/:id',
  auth.checkBearerToken,
  sanitizeBody,
  validate(jenisBeasiswaSchema),
  jenisBeasiswa.update
);
router.delete(
  '/jenis-beasiswa/:id',
  auth.checkBearerToken,
  jenisBeasiswa.delete
);
router.post(
  '/jenis-beasiswa/export',
  auth.checkBearerToken,
  jenisBeasiswa.export
);

router.get(
  '/kelompok-pelajaran/all-data',
  auth.checkBearerToken,
  kelompokPejaran.list
);
router.get(
  '/kelompok-pelajaran',
  auth.checkBearerToken,
  kelompokPejaran.index
);
router.get(
  '/kelompok-pelajaran/:id',
  auth.checkBearerToken,
  kelompokPejaran.detail
);
router.post(
  '/kelompok-pelajaran',
  auth.checkBearerToken,
  kelompokPejaran.create
);
router.put(
  '/kelompok-pelajaran/:id',
  auth.checkBearerToken,
  kelompokPejaran.update
);
router.delete(
  '/kelompok-pelajaran/:id',
  auth.checkBearerToken,
  kelompokPejaran.delete
);
router.post(
  '/kelompok-pelajaran/export',
  auth.checkBearerToken,
  kelompokPejaran.export
);

router.get(
  '/jenis-jampel/all-data',
  auth.checkBearerToken,
  jenisJamPelajaran.list
);
router.get('/jenis-jampel', auth.checkBearerToken, jenisJamPelajaran.index);
router.get(
  '/jenis-jampel/:id',
  auth.checkBearerToken,
  jenisJamPelajaran.detail
);
router.post('/jenis-jampel', auth.checkBearerToken, jenisJamPelajaran.create);
router.put(
  '/jenis-jampel/:id',
  auth.checkBearerToken,
  jenisJamPelajaran.update
);
router.delete(
  '/jenis-jampel/:id',
  auth.checkBearerToken,
  jenisJamPelajaran.delete
);

router.get('/jenis-guru/all-data', auth.checkBearerToken, jenisGuru.list);
router.get('/jenis-guru', auth.checkBearerToken, jenisGuru.index);
router.get('/jenis-guru/:id', auth.checkBearerToken, jenisGuru.detail);
router.post('/jenis-guru', auth.checkBearerToken, jenisGuru.create);
router.put('/jenis-guru/:id', auth.checkBearerToken, jenisGuru.update);
router.delete('/jenis-guru/:id', auth.checkBearerToken, jenisGuru.delete);

router.get('/mapel/all-data', auth.checkBearerToken, mataPelajaran.list);
router.get('/mapel', auth.checkBearerToken, mataPelajaran.index);
router.get('/mapel/:id', auth.checkBearerToken, mataPelajaran.detail);
router.post('/mapel', auth.checkBearerToken, mataPelajaran.create);
router.put('/mapel/:id', auth.checkBearerToken, mataPelajaran.update);
router.delete('/mapel/:id', auth.checkBearerToken, mataPelajaran.delete);

router.get('/jampel/all-data', auth.checkBearerToken, jamPelajaran.list);
router.get('/jampel', auth.checkBearerToken, jamPelajaran.index);
router.get('/jampel/:id', auth.checkBearerToken, jamPelajaran.detail);
router.post('/jampel', auth.checkBearerToken, jamPelajaran.create);
router.put('/jampel/:id', auth.checkBearerToken, jamPelajaran.update);
router.delete('/jampel/:id', auth.checkBearerToken, jamPelajaran.delete);

router.get('/cabang/all-data', auth.checkBearerToken, cabang.list);
router.get('/cabang', auth.checkBearerToken, cabang.index);
router.get('/cabang/:id', auth.checkBearerToken, cabang.detail);
router.post('/cabang', auth.checkBearerToken, cabang.create);
router.put('/cabang/:id', auth.checkBearerToken, cabang.update);
router.delete('/cabang/:id', auth.checkBearerToken, cabang.delete);

router.get('/lembaga-kepesantrenan/all-data', auth.checkBearerToken, LembagaPendidikanKepesantrenan.list);
router.get('/lembaga-kepesantrenan', auth.checkBearerToken, LembagaPendidikanKepesantrenan.index);
router.get('/lembaga-kepesantrenan/:id', auth.checkBearerToken, LembagaPendidikanKepesantrenan.detail);
router.post('/lembaga-kepesantrenan', auth.checkBearerToken, LembagaPendidikanKepesantrenan.create);
router.put('/lembaga-kepesantrenan/:id', auth.checkBearerToken, LembagaPendidikanKepesantrenan.update);
router.delete('/lembaga-kepesantrenan/:id', auth.checkBearerToken, LembagaPendidikanKepesantrenan.delete);

router.get('/lembaga-formal/all-data', auth.checkBearerToken, LembagaPendidikanFormal.list);
router.get('/lembaga-formal', auth.checkBearerToken, LembagaPendidikanFormal.index);
router.get('/lembaga-formal/:id', auth.checkBearerToken, LembagaPendidikanFormal.detail);
router.post('/lembaga-formal', auth.checkBearerToken, LembagaPendidikanFormal.create);
router.put('/lembaga-formal/:id', auth.checkBearerToken, LembagaPendidikanFormal.update);
router.delete('/lembaga-formal/:id', auth.checkBearerToken, LembagaPendidikanFormal.delete);

router.get('/organitation-unit/all-data', auth.checkBearerToken, OrganitationUnit.list);
router.get('/organitation-unit', auth.checkBearerToken, OrganitationUnit.index);
router.get('/organitation-unit/:id', auth.checkBearerToken, OrganitationUnit.detail);
router.post('/organitation-unit', auth.checkBearerToken, OrganitationUnit.create);
router.put('/organitation-unit/:id', auth.checkBearerToken, OrganitationUnit.update);
router.delete('/organitation-unit/:id', auth.checkBearerToken, OrganitationUnit.delete);

router.get('/jabatan/all-data', auth.checkBearerToken, Jabatan.list);
router.get('/jabatan', auth.checkBearerToken, Jabatan.index);
router.get('/jabatan/:id', auth.checkBearerToken, Jabatan.detail);
router.post('/jabatan', auth.checkBearerToken, Jabatan.create);
router.put('/jabatan/:id', auth.checkBearerToken, Jabatan.update);
router.delete('/jabatan/:id', auth.checkBearerToken, Jabatan.delete);

router.get('/jenis-penilaian/all-data', auth.checkBearerToken, JenisPenilaian.list);
router.get('/jenis-penilaian', auth.checkBearerToken, JenisPenilaian.index);
router.get('/jenis-penilaian/:id', auth.checkBearerToken, JenisPenilaian.detail);
router.post('/jenis-penilaian', auth.checkBearerToken, JenisPenilaian.create);
router.put('/jenis-penilaian/:id', auth.checkBearerToken, JenisPenilaian.update);
router.delete('/jenis-penilaian/:id', auth.checkBearerToken, JenisPenilaian.delete);

router.get('/asrama/all-data', auth.checkBearerToken, Asrama.list);
router.get('/asrama', auth.checkBearerToken, Asrama.index);
router.get('/asrama/:id', auth.checkBearerToken, Asrama.detail);
router.post('/asrama', auth.checkBearerToken, Asrama.create);
router.put('/asrama/:id', auth.checkBearerToken, Asrama.update);
router.delete('/asrama/:id', auth.checkBearerToken, Asrama.delete);

router.get('/pegawai/all-data', auth.checkBearerToken, Pegawai.list);
router.get('/pegawai', auth.checkBearerToken, Pegawai.index);
router.get('/pegawai/:id', auth.checkBearerToken, Pegawai.detail);
router.post('/pegawai', auth.checkBearerToken, Pegawai.create);
router.put('/pegawai/:id', auth.checkBearerToken, Pegawai.update);
router.delete('/pegawai/:id', auth.checkBearerToken, Pegawai.delete);

router.get(
  '/kegiatan-akademik/all-data',
  auth.checkBearerToken,
  kegiatanAkademik.list
);
router.get('/kegiatan-akademik', auth.checkBearerToken, kegiatanAkademik.index);
router.get(
  '/kegiatan-akademik/:id',
  auth.checkBearerToken,
  kegiatanAkademik.detail
);
router.post(
  '/kegiatan-akademik',
  auth.checkBearerToken,
  kegiatanAkademik.create
);
router.put(
  '/kegiatan-akademik/:id',
  auth.checkBearerToken,
  kegiatanAkademik.update
);
router.delete(
  '/kegiatan-akademik/:id',
  auth.checkBearerToken,
  kegiatanAkademik.delete
);

router.get(
  '/program-pesantren/all-data',
  auth.checkBearerToken,
  programPesantren.list
);
router.get('/program-pesantren', auth.checkBearerToken, programPesantren.index);
router.get(
  '/program-pesantren/:id',
  auth.checkBearerToken,
  programPesantren.detail
);
router.post(
  '/program-pesantren',
  auth.checkBearerToken,
  programPesantren.create
);
router.put(
  '/program-pesantren/:id',
  auth.checkBearerToken,
  programPesantren.update
);
router.delete(
  '/program-pesantren/:id',
  auth.checkBearerToken,
  programPesantren.delete
);

router.get(
  '/santri-program/all-data',
  auth.checkBearerToken,
  santriProgram.list
);
router.get('/santri-program', auth.checkBearerToken, santriProgram.index);
router.get('/santri-program/:id', auth.checkBearerToken, santriProgram.detail);
router.post('/santri-program', auth.checkBearerToken, santriProgram.create);
router.put('/santri-program/:id', auth.checkBearerToken, santriProgram.update);
router.delete(
  '/santri-program/:id',
  auth.checkBearerToken,
  santriProgram.delete
);

router.get(
  '/orang-tua-wali/all-data',
  auth.checkBearerToken,
  orangTuaWali.list
);
router.get('/orang-tua-wali', auth.checkBearerToken, orangTuaWali.index);
router.get('/orang-tua-wali/:id', auth.checkBearerToken, orangTuaWali.detail);
router.post('/orang-tua-wali', auth.checkBearerToken, orangTuaWali.create);
router.put('/orang-tua-wali/:id', auth.checkBearerToken, orangTuaWali.update);
router.delete(
  '/orang-tua-wali/:id',
  auth.checkBearerToken,
  orangTuaWali.delete
);

router.get(
  '/inventaris-umum/all-data',
  auth.checkBearerToken,
  inventarisUmum.list
);
router.get('/inventaris-umum', auth.checkBearerToken, inventarisUmum.index);
router.get('/inventaris-umum/:id', auth.checkBearerToken, inventarisUmum.detail);
router.post('/inventaris-umum', auth.checkBearerToken, inventarisUmum.create);
router.put('/inventaris-umum/:id', auth.checkBearerToken, inventarisUmum.update);
router.delete(
  '/inventaris-umum/:id',
  auth.checkBearerToken,
  inventarisUmum.delete
);

router.get(
  '/inventaris-aset-harian/all-data',
  auth.checkBearerToken,
  inventarisAsetHarian.list
);
router.get('/inventaris-aset-harian', auth.checkBearerToken, inventarisAsetHarian.index);
router.get('/inventaris-aset-harian/:id', auth.checkBearerToken, inventarisAsetHarian.detail);
router.post('/inventaris-aset-harian', auth.checkBearerToken, inventarisAsetHarian.create);
router.put('/inventaris-aset-harian/:id', auth.checkBearerToken, inventarisAsetHarian.update);
router.delete(
  '/inventaris-aset-harian/:id',
  auth.checkBearerToken,
  inventarisAsetHarian.delete
);

export default router;
