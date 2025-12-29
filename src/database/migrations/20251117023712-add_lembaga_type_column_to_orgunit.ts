import { QueryInterface, DataTypes } from 'sequelize';

export default {
  async up(queryInterface: QueryInterface): Promise<void> {
    await Promise.all([
      queryInterface.removeConstraint('orgunit', 'orgunit_id_lembaga_fkey'),

      queryInterface.changeColumn('orgunit', 'id_lembaga', {
        type: DataTypes.STRING,
        allowNull: true,
      }),

      queryInterface.addColumn('orgunit', 'lembaga_type', {
        type: DataTypes.ENUM('FORMAL', 'PESANTREN'),
        allowNull: true,
      }),

      queryInterface.changeColumn('orgunit', 'jenis_orgunit', {
        type: DataTypes.ENUM('Biro', 'Bagian', 'Lembaga', 'Sub-Unit', 'Umum'),
        allowNull: true,
      }),

      queryInterface.changeColumn('orgunit', 'keterangan', {
        type: DataTypes.TEXT,
        allowNull: true,
      }),
    ]);
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await Promise.all([
      queryInterface.removeColumn('orgunit', 'lembaga_type'),

      queryInterface.changeColumn('orgunit', 'jenis_orgunit', {
        type: DataTypes.STRING,
        allowNull: true,
      }),

      queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_orgunit_jenis_orgunit";`
      ),

      queryInterface.changeColumn('orgunit', 'keterangan', {
        type: DataTypes.STRING,
        allowNull: true,
      }),
    ]);
  },
};
