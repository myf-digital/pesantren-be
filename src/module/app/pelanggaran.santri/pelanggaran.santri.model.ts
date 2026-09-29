'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import AppSantri from '../santri/santri.model';
import MasterPelanggaranRemisi from '../pelanggaran.remisi.master/pelanggaran.remisi.master..model';
import Lokasi from '../location/location.model';
import Pegawai from '../pegawai/pegawai.model';

export class KasusPelanggaranSantri extends Model {
  declare id_kasus: string;
  declare nomor_kasus: string;
  declare id_santri: string;
  declare id_pelanggaran_remisi: string;
  declare id_lokasi: string;
  declare tanggal_kejadian: Date;
  declare skor_master_snapshot: number;
  declare skor_diberikan: number;
  declare alasan_penyesuaian_skor: string | null;
  declare kronologi: string | null;
  declare punishment_detail: string | null;
  declare foto_bukti: string | null;
  declare level_sp: 'SP1' | 'SP2' | 'SP3' | null;
  declare nomor_surat_sp: string | null;
  declare foto_dokumen_sp: string | null;
  declare status_progress: 'Proses' | 'Selesai' | 'Batal';
  declare id_petugas_pelapor: string | null;
  declare id_petugas_penanggung_jawab: string | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

export function initPelanggaranSantri(sequelize: Sequelize) {
  KasusPelanggaranSantri.init(
    {
      id_kasus: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
      },
      nomor_kasus: {
        type: DataTypes.STRING(30),
        unique: true,
        allowNull: false,
      },
      id_santri: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      id_pelanggaran_remisi: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      id_lokasi: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      tanggal_kejadian: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      skor_master_snapshot: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      skor_diberikan: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      alasan_penyesuaian_skor: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      kronologi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      punishment_detail: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      foto_bukti: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      level_sp: {
        type: DataTypes.ENUM('SP1', 'SP2', 'SP3'),
        allowNull: true,
      },
      nomor_surat_sp: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      foto_dokumen_sp: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status_progress: {
        type: DataTypes.ENUM('Proses', 'Selesai', 'Batal'),
        defaultValue: 'Proses',
      },
      id_petugas_pelapor: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      id_petugas_penanggung_jawab: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      jenis: {
        type: DataTypes.VIRTUAL,
        get() {
          const skor = this.getDataValue('skor_diberikan');
          if (skor === undefined || skor === null) return null;
          return skor < 0 ? 'Remisi' : 'Pelanggaran';
        }
      }
    },
    {
      sequelize,
      tableName: 'kasus_pelanggaran_santri',
      timestamps: true,
      paranoid: true, // Untuk soft deletes (deleted_at)
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  KasusPelanggaranSantri.beforeCreate((instance) => {
    instance?.setDataValue('id_kasus', uuidv4());
  });

  KasusPelanggaranSantri.beforeBulkCreate((instances) => {
    instances.forEach((instance) => {
      instance.setDataValue('id_kasus', uuidv4());
    });
  });
}

/**
 * RELASI MODEL
 */
export function associatePelanggaranSantri() {
  KasusPelanggaranSantri.belongsTo(AppSantri, { foreignKey: 'id_santri', as: 'santri' });
  KasusPelanggaranSantri.belongsTo(MasterPelanggaranRemisi, { foreignKey: 'id_pelanggaran_remisi', as: 'master_pelanggaran' });
  KasusPelanggaranSantri.belongsTo(Lokasi , { foreignKey: 'id_lokasi', as: 'lokasi' });
  KasusPelanggaranSantri.belongsTo(Pegawai, { foreignKey: 'id_petugas_pelapor', as: 'pelapor' });
  KasusPelanggaranSantri.belongsTo(Pegawai, { foreignKey: 'id_petugas_penanggung_jawab', as: 'penanggung_jawab' });
}