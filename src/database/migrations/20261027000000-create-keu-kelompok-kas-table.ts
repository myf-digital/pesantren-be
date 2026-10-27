import { QueryInterface, DataTypes, literal } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  return queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'keu_kelompok_kas',
      {
        id_kelompok_kas: {
          type: DataTypes.STRING(255),
          primaryKey: true,
          allowNull: false,
        },
        kode_kelompok: {
          type: DataTypes.STRING(50),
          unique: true,
          allowNull: false,
        },
        nama_kelompok: { type: DataTypes.STRING(150), allowNull: false },
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
    await queryInterface.dropTable('keu_kelompok_kas', { transaction });
  });
};
