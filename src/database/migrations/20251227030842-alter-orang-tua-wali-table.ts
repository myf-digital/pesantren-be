'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {

  await queryInterface.addColumn('orang_tua_wali', 'keterangan', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await queryInterface.changeColumn('orang_tua_wali', 'hubungan', {
    type: DataTypes.ENUM('Ayah', 'Ibu', 'Wali'),
    allowNull: true,
  });

  await queryInterface.changeColumn('orang_tua_wali', 'pendidikan', {
    type: DataTypes.ENUM('Tidak Sekolah','SD / MI','SMP / MTs','SMA / MA','SMK','D1','D2','D3','S1','S2','S3','Lainnya'),
    allowNull: true,
  });

  await queryInterface.changeColumn('orang_tua_wali', 'pekerjaan', {
    type: DataTypes.ENUM('Tidak Bekerja','Ibu Rumah Tangga','Petani','Buruh Harian','Nelayan','Wiraswasta','Pedagang','Karyawan Swasta','PNS','TNI / POLRI','Guru / Dosen','Pekerja Migran','Pensiunan','Lainnya'),
    allowNull: true,
  });

  await queryInterface.addColumn('orang_tua_wali', 'penghasilan', {
    type: DataTypes.ENUM('< 1 juta','1–2 juta','2–3 juta','3–5 juta','> 5 juta','Tidak berpenghasilan'),
    allowNull: true,
  });

  await queryInterface.addColumn('orang_tua_wali', 'deleted_at', {
    allowNull: true,
    type: DataTypes.DATE
  });

  await queryInterface.addColumn('orang_tua_wali', 'is_deleted', {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  });

  await queryInterface.addColumn('orang_tua_wali', 'province_id', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await queryInterface.addColumn('orang_tua_wali', 'city_id', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await queryInterface.addColumn('orang_tua_wali', 'district_id', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await queryInterface.addColumn('orang_tua_wali', 'sub_district_id', {
    type: DataTypes.STRING,
    allowNull: true,
  });
  
};

export const down = async (queryInterface: QueryInterface) => {

  await queryInterface.removeColumn('orang_tua_wali', 'keterangan');
  await queryInterface.removeColumn('orang_tua_wali', 'deleted_at');
  await queryInterface.removeColumn('orang_tua_wali', 'is_deleted');
  await queryInterface.removeColumn('orang_tua_wali', 'penghasilan');
  await queryInterface.removeColumn('orang_tua_wali', 'province_id');
  await queryInterface.removeColumn('orang_tua_wali', 'city_id');
  await queryInterface.removeColumn('orang_tua_wali', 'district_id');
  await queryInterface.removeColumn('orang_tua_wali', 'sub_district_id');

  await queryInterface.changeColumn('orang_tua_wali', 'pendidikan', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });
  await queryInterface.changeColumn('orang_tua_wali', 'pekerjaan', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });
  await queryInterface.changeColumn('orang_tua_wali', 'hubungan', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  try {
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_orang_tua_wali_hubungan";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_orang_tua_wali_pendidikan";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_orang_tua_wali_pekerjaan";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_orang_tua_wali_penghasilan";'
    );
  } catch (e) {}
};