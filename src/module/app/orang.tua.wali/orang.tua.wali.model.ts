'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
//import Santri from '../santri/santri.model';
import AreaProvince from '../../area/provinces.model';
import AreaRegency from '../../area/regencies.model';
import AreaDistrict from '../../area/districts.model';
import AreaSubDistrict from '../../area/subdistricts.model';

export class OrangTuaWali extends Model {
  public id_wali!: string;
  public id_santri!: string;
  public nama_wali!: string;
  public hubungan!: string;
  public nik!: string;
  public pendidikan!: string;
  public pekerjaan!: string;
  public no_hp!: string;
  public alamat!: string;
}

export function initOrangTuaWali(sequelize: Sequelize) {
  OrangTuaWali.init(
    {
      id_wali: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      id_santri: {
        type: DataTypes.STRING,
      },
      nama_wali: {
        type: DataTypes.STRING(255),
      },
      hubungan: {
        type: DataTypes.ENUM('Ayah', 'Ibu', 'Wali'),
      },
      nik: {
        type: DataTypes.STRING(255),
      },
      pendidikan: {
        type: DataTypes.ENUM('Tidak Sekolah','SD / MI','SMP / MTs','SMA / MA','SMK','D1','D2','D3','S1','S2','S3','Lainnya'),
      },
      pekerjaan: {
        type: DataTypes.ENUM('Tidak Bekerja','Ibu Rumah Tangga','Petani','Buruh Harian','Nelayan','Wiraswasta','Pedagang','Karyawan Swasta','PNS','TNI / POLRI','Guru / Dosen','Pekerja Migran','Pensiunan','Lainnya'),
      },
      penghasilan: {
        type: DataTypes.ENUM('< 1 juta','1–2 juta','2–3 juta','3–5 juta','> 5 juta','Tidak berpenghasilan'),
      },
      no_hp: {
        type: DataTypes.STRING(255),
      },
      alamat: {
        type: DataTypes.TEXT,
      },
      keterangan: {
        type: DataTypes.TEXT,
      },
      province_id: {
        type: DataTypes.STRING,
      },
      city_id: {
        type: DataTypes.STRING,
      },
      district_id: {
        type: DataTypes.STRING,
      },
      sub_district_id: {
        type: DataTypes.STRING,
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      deleted_at: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: 'OrangTuaWali',
      tableName: 'orang_tua_wali',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  OrangTuaWali.beforeCreate((row) => {
    row?.setDataValue('id_wali', uuidv4());
  });

  return OrangTuaWali;
}

export function associateOrangTuaWali() {
  // OrangTuaWali.belongsTo(Santri, {
  //   as: 'santri',
  //   foreignKey: 'id_santri',
  // });

  OrangTuaWali.belongsTo(AreaProvince, {
    as: 'province',
    foreignKey: 'province_id',
  });

  OrangTuaWali.belongsTo(AreaRegency, {
    as: 'city',
    foreignKey: 'city_id',
  });

  OrangTuaWali.belongsTo(AreaDistrict, {
    as: 'district',
    foreignKey: 'district_id',
  });

  OrangTuaWali.belongsTo(AreaSubDistrict, {
    as: 'sub_district',
    foreignKey: 'sub_district_id',
  });
}

export default OrangTuaWali;
