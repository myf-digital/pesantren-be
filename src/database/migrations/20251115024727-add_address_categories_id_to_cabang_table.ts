import { QueryInterface, DataTypes } from 'sequelize';

export default {
  async up(queryInterface: QueryInterface): Promise<void> {
    await Promise.all([
      // alamat
      queryInterface.addColumn('cabang', 'province_id', {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'area_provinces',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }),

      queryInterface.addColumn('cabang', 'city_id', {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'area_regencies',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }),

      queryInterface.addColumn('cabang', 'district_id', {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'area_districts',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }),

      queryInterface.addColumn('cabang', 'sub_district_id', {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'area_sub_districts',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }),

      // kontak
      queryInterface.addColumn('cabang', 'contact', {
        type: DataTypes.STRING,
        allowNull: true,
      }),

      queryInterface.addColumn('cabang', 'email', {
        type: DataTypes.STRING,
        allowNull: true,
      }),

      // hapus kolom existing
      queryInterface.removeColumn('cabang', 'nomor_urut'),
    ]);
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await Promise.all([
      // revert alamat + kontak
      queryInterface.removeColumn('cabang', 'province_id'),
      queryInterface.removeColumn('cabang', 'city_id'),
      queryInterface.removeColumn('cabang', 'district_id'),
      queryInterface.removeColumn('cabang', 'sub_district_id'),
      queryInterface.removeColumn('cabang', 'contact'),
      queryInterface.removeColumn('cabang', 'email'),

      // re-add nomor_urut
      queryInterface.addColumn('cabang', 'nomor_urut', {
        type: DataTypes.INTEGER,
        allowNull: true,
      }),
    ]);
  },
};
