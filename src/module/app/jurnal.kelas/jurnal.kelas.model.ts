'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';
import AppResource from '../resource/resource.model';
import KelasFormal from '../kelas.formal/kelas.formal.model';
import KelasMda from '../kelas.mda/kelas.mda.model';
import JamPelajaran from '../jam.pelajaran/jam.pelajaran.model';
import JadwalPelajaran from '../jadwal.pelajaran/jadwal.pelajaran.model';

export class JurnalKelas extends Model {
  declare id_jurnal: string;
  declare id_petugas: string;
  declare id_lokasi: string;
  declare id_jam_pelajaran: string;
  declare tanggal: string;
  declare jam_mulai: string;
  declare jam_selesai: string | null;
  declare materi: string | null;
  declare catatan: string | null;
  declare created_by: string | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare id_jadwal: string | null;

  // Relasi Ke Model Lain
  declare petugas?: AppResource;
  declare creator?: AppResource;
  declare kelasFormal?: KelasFormal;
  declare kelasMda?: KelasMda;
  declare jamPelajaran?: JamPelajaran;

  public toJSON(): any {
    const values = super.toJSON() as any;
    values.lokasi = {
      id_lokasi: this.id_lokasi,
      nama_lokasi:
        this.kelasFormal?.nama_kelas || this.kelasMda?.nama_kelas_mda || '-',
    };
    return values;
  }
}

export function initJurnalKelas(sequelize: Sequelize) {
  JurnalKelas.init(
    {
      id_jurnal: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      id_petugas: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      id_lokasi: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      id_jam_pelajaran: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tanggal: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      jam_mulai: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      jam_selesai: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      materi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      catatan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      id_jadwal: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'JurnalKelas',
      tableName: 'jurnal_kelas',
      timestamps: true,
      paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      underscored: true,
    }
  );

  JurnalKelas.beforeCreate((row) => {
    row?.setDataValue('id_jurnal', uuidv4());
  });

  return JurnalKelas;
}

export function associateJurnalKelas() {
  JurnalKelas.belongsTo(AppResource, {
    as: 'petugas',
    foreignKey: 'id_petugas',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  JurnalKelas.belongsTo(AppResource, {
    as: 'creator',
    foreignKey: 'created_by',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  JurnalKelas.belongsTo(KelasFormal, {
    foreignKey: 'id_lokasi',
    as: 'kelasFormal',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  JurnalKelas.belongsTo(KelasMda, {
    foreignKey: 'id_lokasi',
    as: 'kelasMda',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  JurnalKelas.belongsTo(JamPelajaran, {
    foreignKey: 'id_jam_pelajaran',
    as: 'jamPelajaran',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  JurnalKelas.belongsTo(JadwalPelajaran, {
    foreignKey: 'id_jadwal',
    as: 'jadwalPelajaran',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });
}

export default JurnalKelas;
