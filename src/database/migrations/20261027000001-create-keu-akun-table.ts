import { QueryInterface, DataTypes, literal } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'keu_akun',
      {
        id_akun: {
          type: DataTypes.STRING(255),
          primaryKey: true,
          allowNull: false,
        },
        kode_akun: {
          type: DataTypes.STRING(50),
          unique: true,
          allowNull: false,
        },
        nama_akun: { type: DataTypes.STRING(200), allowNull: false },
        id_kelompok_kas: {
          type: DataTypes.STRING(255),
          allowNull: false,
          references: { model: 'keu_kelompok_kas', key: 'id_kelompok_kas' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        is_periodik_tahun_ajaran: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        urutan: { type: DataTypes.INTEGER, defaultValue: 0 },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        keterangan: { type: DataTypes.TEXT, allowNull: true },
        created_at: {
          type: DataTypes.DATE,
          defaultValue: literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: DataTypes.DATE,
          defaultValue: literal('CURRENT_TIMESTAMP'),
        },
      },
      { transaction }
    );
  });
};

export const down = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('keu_akun', { transaction });
  });
};
