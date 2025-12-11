'use strict';

import { Sequelize, Model } from 'sequelize';
import { helper } from '../../helpers/helper';
import { initAppOtp } from '../auth/otp.model';
import { initAppMenu } from '../app/menu/menu.model';
import { initAreaProvince } from '../area/provinces.model';
import { initAppRole, associateAppRole } from '../app/role/role.model';
import { initParamGlobal } from '../app/param.global/param.global.model';
import { initAreaRegency, associateAreaRegency } from '../area/regencies.model';
import {
  initAreaDistrict,
  associateAreaDistrict,
} from '../area/districts.model';
import {
  initAreaSubDistrict,
  associateAreaSubDistrict,
} from '../area/subdistricts.model';
import {
  initAppRoleMenu,
  associateAppRoleMenu,
} from '../app/role.menu/role.menu.model';
import {
  initAppResourceModel,
  associateAppResource,
} from '../app/resource/resource.model';
import { initTahunAngkatan } from '../app/tahun.angkatan/tahun.angkatan.model';
import { initTingkat } from '../app/tingkat/tingkat.model';
import {
  associateTahunAjaran,
  initTahunAjaran,
} from '../app/tahun.ajaran/tahun.ajaran.model';
import {
  associateSemester,
  initSemester,
} from '../app/semester/semester.model';
import { initStatusAwalSantri } from '../app/status.awal.santri/status.awal.santri.model';
import { initJenisBeasiswa } from '../app/jenis_beasiswa/jenis.beasiswa.model';
import { initKelompokPelajaran } from '../app/kelompok.pelajaran/kelompok.pelajaran.model';
import { initJenisJamPelajaran } from '../app/jenis.jampel/jenis.jampel.model';
import { initJenisGuru } from '../app/jenis.guru/jenis.guru.model';
import {
  initMataPelajaran,
  associateMataPelajaran,
} from '../app/mata.pelajaran/mata.pelajaran.model';
import {
  initJamPelajaran,
  associateJamPelajaran,
} from '../app/jam.pelajaran/jam.pelajaran.model';
import { associateCabang, initCabang } from '../app/cabang/cabang.model';
import { associateLembagaPendidikanKepesantrenan, initLembagaPendidikanKepesantrenan } from '../app/lembaga.pendidikan.kepesantrenan/lembaga.pendidikan.kepesantrenan.model';
import { associateOrganitationUnit, initOrganitationUnit } from '../app/organitation.unit/organitation.unit.model';
import { associateJabatan, initJabatan } from '../app/jabatan/jabatan.model';
import { initJenisPenilaian } from '../app/jenis.penilaian/jenis.penilaian.model';
import { associateAsrama, initAsrama } from '../app/asrama/asrama.model';
import {
  initKegiatanAkademik,
  associateKegiatanAkademik,
} from '../app/kegiatan.akademik/kegiatan.akademik.model';
import { initProgramPesantren } from '../app/program.pesantren/program.pesantren.model';
import {
  initSantriProgram,
  associateSantriProgram,
} from '../app/santri.program/santri.program.model';
import {
  initOrangTuaWali,
  associateOrangTuaWali,
} from '../app/orang.tua.wali/orang.tua.wali.model';
import ActivityLog, {
  initActivityLog,
  associateActivityLog,
} from '../global/activity.log.model';
import { getUserLogin } from '../../context/userContext';
import { associateLembagaPendidikanFormal, initLembagaPendidikanFormal } from '../app/lembaga.pendidikan.formal/lembaga.pendidikan.formal.model';
import { initPegawai, associatePegawai } from '../app/pegawai/pegawai.model';
import { initInventarisUmum, associateInventarisUmum } from '../app/inventaris.umum/inventaris.umum.model';
import { initInventarisAsetHarian, associateInventarisAsetHarian } from '../app/inventaris.aset.harian/inventaris.aset.harian.model';

export function initializeModels(sequelize: Sequelize) {
  // initialize
  initAppOtp(sequelize);
  initAppRole(sequelize);
  initAppMenu(sequelize);
  initParamGlobal(sequelize);
  initAppRoleMenu(sequelize);
  initAreaRegency(sequelize);
  initAreaProvince(sequelize);
  initAppResourceModel(sequelize);
  initTahunAngkatan(sequelize);
  initTingkat(sequelize);
  initTahunAjaran(sequelize);
  initSemester(sequelize);
  initStatusAwalSantri(sequelize);
  initJenisBeasiswa(sequelize);
  initKelompokPelajaran(sequelize);
  initJenisJamPelajaran(sequelize);
  initJenisGuru(sequelize);
  initMataPelajaran(sequelize);
  initJamPelajaran(sequelize);
  initCabang(sequelize);
  initLembagaPendidikanKepesantrenan(sequelize);
  initLembagaPendidikanFormal(sequelize);
  initOrganitationUnit(sequelize);
  initJabatan(sequelize);
  initJenisPenilaian(sequelize);
  initAsrama(sequelize);
  initKegiatanAkademik(sequelize);
  initProgramPesantren(sequelize);
  initSantriProgram(sequelize);
  initOrangTuaWali(sequelize);
  initAreaDistrict(sequelize);
  initAreaSubDistrict(sequelize);
  initActivityLog(sequelize);
  initPegawai(sequelize);
  initInventarisUmum(sequelize);
  initInventarisAsetHarian(sequelize);

  // associate
  associateAppRole();
  associateAppRoleMenu();
  associateAppResource();
  associateAreaRegency();
  associateTahunAjaran();
  associateSemester();
  associateMataPelajaran();
  associateJamPelajaran();
  associateCabang();
  associateLembagaPendidikanKepesantrenan();
  associateLembagaPendidikanFormal();
  associateOrganitationUnit();
  associateJabatan();
  associateAsrama();
  associateKegiatanAkademik();
  associateSantriProgram();
  associateOrangTuaWali();
  associateAreaDistrict();
  associateAreaSubDistrict();
  associateActivityLog();
  associatePegawai();
  associateInventarisAsetHarian()

  addGlobalActivityHooks(sequelize);
}

Model.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  const createdAtDb = values.created_at || values.created_date;
  const updatedAtDb = values.updated_at || values.modified_date;

  values.created_at = createdAtDb ? helper.dateFormat(createdAtDb) : null;

  if (updatedAtDb) {
    values.updated_at = helper.dateFormat(updatedAtDb);
  } else {
    values.updated_at = createdAtDb ? helper.dateFormat(createdAtDb) : null;
  }
  return values;
};

function addGlobalActivityHooks(sequelize: Sequelize) {
  sequelize.addHook('beforeUpdate', (instance: any) => {
    if (instance?.constructor.tableName === 'activity_logs') return;
    instance._previousDataValuesSnapshot = { ...instance?._previousDataValues };
  });

  sequelize.addHook('afterUpdate', async (instance: any) => {
    if (instance?.constructor.tableName === 'activity_logs') return;
    await ActivityLog.create({
      table_name: instance?.constructor.tableName,
      record_id: getPrimaryKey(instance),
      action: 'UPDATE',
      username: getUserLogin(),
      before_data: instance?._previousDataValuesSnapshot,
      after_data: instance?.get(),
    });
  });

  sequelize.addHook('afterCreate', async (instance: any) => {
    if (instance?.constructor.tableName === 'activity_logs') return;
    await ActivityLog.create({
      table_name: instance?.constructor.tableName,
      record_id: getPrimaryKey(instance),
      action: 'CREATE',
      username: getUserLogin(),
      before_data: null,
      after_data: instance?.get(),
    });
  });

  sequelize.addHook('afterDestroy', async (instance: any) => {
    if (instance?.constructor.tableName === 'activity_logs') return;
    await ActivityLog.create({
      table_name: instance?.constructor.tableName,
      record_id: getPrimaryKey(instance),
      action: 'DELETE',
      username: getUserLogin(),
      before_data: instance?.get(),
      after_data: null,
    });
  });
}

function getPrimaryKey(instance: any) {
  const pkFields: string[] = instance.constructor.primaryKeyAttributes || [];

  if (pkFields.length === 0) return null;

  if (pkFields.length === 1) {
    return instance.get(pkFields[0]);
  }

  return pkFields.reduce((acc: any, key: string) => {
    acc[key] = instance.get(key);
    return acc;
  }, {});
}
