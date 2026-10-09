import { Model, DataTypes, Optional, Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import Cabang from '../cabang/cabang.model';

// 1. Definisikan Interface untuk atribut Model
interface LokasiAttributes {
  id_lokasi: string;
  nama_lokasi: string;
  jenis_lokasi:
    | 'Cabang'
    | 'Asrama'
    | 'Kamar'
    | 'Masjid'
    | 'AreaMasjid'
    | 'SekolahFormal'
    | 'SekolahMDA'
    | 'RuangKelas'
    | 'RuangGuru'
    | 'RuangTU'
    | 'Perpustakaan'
    | 'Laboratorium'
    | 'GuestHouse'
    | 'Klinik'
    | 'UKS'
    | 'Dapur'
    | 'Kantin'
    | 'Koperasi'
    | 'Kantor'
    | 'Aula'
    | 'Gudang'
    | 'Lapangan'
    | 'Parkiran'
    | 'PosSatpam'
    | 'RuangRapat'
    | 'RuangSerbaguna'
    | 'Taman'
    | 'AreaUmum'
    | 'RuangMakan'
    | 'Lahan'
    | 'Workshop'
    | 'Studio'
    | 'RuangIT'
    | 'GedungLain'
    | 'AreaLain'
    | 'Lorong'
    | 'Lingkungan'
    | 'PosJaga';
  parent_id?: string | null;
  id_cabang?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  map_zoom?: number | null;
  kode_lokasi?: string | null;
  qr_code?: string | null;
  kapasitas?: number | null;
  lantai?: number | null;
  keterangan?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

// 2. Tentukan atribut mana yang opsional saat proses 'create' (seperti ID jika manual atau timestamps)
interface LokasiCreationAttributes extends Optional<
  LokasiAttributes,
  'created_at' | 'updated_at'
> {}

// 3. Class Model
class Lokasi
  extends Model<LokasiAttributes, LokasiCreationAttributes>
  implements LokasiAttributes
{
  declare id_lokasi: string;
  declare nama_lokasi: string;
  declare jenis_lokasi: LokasiAttributes['jenis_lokasi'];
  declare parent_id: string | null;
  declare id_cabang: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare map_zoom: number | null;
  declare kode_lokasi: string | null;
  declare qr_code: string | null;
  declare kapasitas: number | null;
  declare lantai: number | null;
  declare keterangan: string | null;

  // timestamps
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  declare cabang?: Cabang;
}

// 4. Inisialisasi Model
export function initLokasi(sequelize: Sequelize) {
  Lokasi.init(
    {
      id_lokasi: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      nama_lokasi: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      jenis_lokasi: {
        type: DataTypes.ENUM(
          'Cabang',
          'Asrama',
          'Kamar',
          'Masjid',
          'AreaMasjid',
          'SekolahFormal',
          'SekolahMDA',
          'RuangKelas',
          'RuangGuru',
          'RuangTU',
          'Perpustakaan',
          'Laboratorium',
          'GuestHouse',
          'Klinik',
          'UKS',
          'Dapur',
          'Kantin',
          'Koperasi',
          'Kantor',
          'Aula',
          'Gudang',
          'Lapangan',
          'Parkiran',
          'PosSatpam',
          'RuangRapat',
          'RuangSerbaguna',
          'Taman',
          'AreaUmum',
          'RuangMakan',
          'Lahan',
          'Workshop',
          'Studio',
          'RuangIT',
          'GedungLain',
          'AreaLain',
          'Lorong',
          'Lingkungan',
          'PosJaga',
        ),
        allowNull: false,
      },
      parent_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      id_cabang: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      map_zoom: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      kode_lokasi: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      qr_code: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      kapasitas: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      lantai: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      keterangan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'lokasi',
      underscored: true, // Ini akan otomatis memetakan created_at database ke createdAt model
      timestamps: true,
      createdAt: 'created_at', // Memastikan Sequelize menulis ke kolom yang tepat
      updatedAt: 'updated_at',
    }
  );

  Lokasi.beforeCreate((lokasi) => {
    lokasi?.setDataValue('id_lokasi', uuidv4());
  });

  Lokasi.beforeBulkCreate((lokasiInstances) => {
    lokasiInstances.forEach((lokasi) => {
      lokasi.setDataValue('id_lokasi', uuidv4()); // Assign a UUID to each instance
    });
  });

  return Lokasi;
}

// 5. Definisi Relasi (Self-Referencing)
export function associateLokasi() {
  Lokasi.hasMany(Lokasi, { foreignKey: 'parent_id', as: 'sub_lokasi' });
  Lokasi.belongsTo(Lokasi, { foreignKey: 'parent_id', as: 'parent' });
  Lokasi.belongsTo(Cabang, { foreignKey: 'id_cabang', as: 'cabang' });
}

export default Lokasi;
