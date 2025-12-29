'use strict';

import { v4 as uuidv4 } from 'uuid';
import { DataTypes, Model, Sequelize } from 'sequelize';

export class InventarisUmum extends Model {
  public id_aset!: string;
  public kode_aset!: string;
  public nama_aset!: string;
  public kategori!: string;
  public jumlah!: number;
  public kondisi!: string;
  public lokasi!: string;
  public sumber_aset!: string;
  public tanggal_input!: Date;
  public keterangan!: string;
}

export function initInventarisUmum(sequelize: Sequelize) {
  InventarisUmum.init(
    {
      id_aset: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
      },
      kode_aset: {
        type: DataTypes.STRING(255),
        unique: true,
      },
      nama_aset: {
        type: DataTypes.STRING(255),
      },
      kategori: {
        type: DataTypes.STRING(255),
      },
      jumlah: {
        type: DataTypes.INTEGER,
      },
      kondisi: {
        type: DataTypes.ENUM('Baik', 'Kurang Baik', 'Rusak', 'Hilang'),
      },
      lokasi: {
        type: DataTypes.STRING(255),
      },
      sumber_aset: {
        type: DataTypes.ENUM(
          'Rumah Tangga',
          'Kewaliasuhan',
          'Takmir Masjid',
          'Lainnya'
        ),
      },
      tanggal_input: {
        type: DataTypes.DATEONLY,
      },
      keterangan: {
        type: DataTypes.STRING(255),
      },
    },
    {
      sequelize,
      modelName: 'InventarisUmum',
      tableName: 'inventaris_umum',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  InventarisUmum.beforeCreate((row) => {
    row?.setDataValue('id_aset', uuidv4());
  });

  return InventarisUmum;
}

export function associateInventarisUmum() {}

export default InventarisUmum;
