'use strict';

import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.removeConstraint(
    'kelompok_pelajaran',
    'kelompok_pelajaran_nomor_urut_key'
  );
  await queryInterface.removeConstraint(
    'mata_pelajaran',
    'mata_pelajaran_nomor_urut_key'
  );
  await queryInterface.removeConstraint(
    'jenis_jam_pelajaran',
    'jenis_jam_pelajaran_nomor_urut_key'
  );
  await queryInterface.removeConstraint(
    'jenis_guru',
    'jenis_guru_nomor_urut_key'
  );
  await queryInterface.removeConstraint(
    'jam_pelajaran',
    'jam_pelajaran_nomor_urut_key'
  );
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.addConstraint('kelompok_pelajaran', {
    fields: ['nomor_urut'],
    type: 'unique',
    name: 'kelompok_pelajaran_nomor_urut_key',
  });
  await queryInterface.addConstraint('mata_pelajaran', {
    fields: ['nomor_urut'],
    type: 'unique',
    name: 'mata_pelajaran_nomor_urut_key',
  });
  await queryInterface.addConstraint('jenis_jam_pelajaran', {
    fields: ['nomor_urut'],
    type: 'unique',
    name: 'jenis_jam_pelajaran_nomor_urut_key',
  });
  await queryInterface.addConstraint('jenis_guru', {
    fields: ['nomor_urut'],
    type: 'unique',
    name: 'jenis_guru_nomor_urut_key',
  });
  await queryInterface.addConstraint('jam_pelajaran', {
    fields: ['nomor_urut'],
    type: 'unique',
    name: 'jam_pelajaran_nomor_urut_key',
  });
};
