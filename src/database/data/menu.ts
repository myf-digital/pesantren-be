'use strict';

export default class DataMenu {
  public menu() {
    return [
      {
        id: 1,
        menu_name: 'Dashboard',
        menu_icon: 'tabler-smart-home',
        module_name: '/dashboards/crm',
        seq_number: 1,
        parent_id: '00000000-0000-0000-0000-000000000000',
        status: 1,
      },
      {
        id: 2,
        menu_name: 'Master',
        menu_icon: 'tabler-book',
        module_name: '#',
        seq_number: 3,
        parent_id: '00000000-0000-0000-0000-000000000000',
        status: 1,
      },
      {
        id: 3,
        menu_name: 'Settings',
        menu_icon: 'tabler-settings',
        module_name: '#',
        seq_number: 2,
        parent_id: '00000000-0000-0000-0000-000000000000',
        status: 1,
      },
    ];
  }

  public childmenu() {
    return [
      {
        parent_id: 2,
        menu_name: 'Tahun Angkatan',
        menu_icon: 'tabler-circle',
        module_name: '/app/tahun-angkatan/list',
        seq_number: 1,
        status: 1,
      },
      {
        parent_id: 2,
        menu_name: 'Tingkat',
        menu_icon: 'tabler-circle',
        module_name: '/app/tingkat/list',
        seq_number: 2,
        status: 1,
      },
      {
        parent_id: 2,
        menu_name: 'Tahun Ajaran',
        menu_icon: 'tabler-circle',
        module_name: '/app/tahun-ajaran/list',
        seq_number: 3,
        status: 1,
      },
      {
        parent_id: 2,
        menu_name: 'Semester',
        menu_icon: 'tabler-circle',
        module_name: '/app/semester/list',
        seq_number: 4,
        status: 1,
      },
      {
        parent_id: 2,
        menu_name: 'Status Awal Santri',
        menu_icon: 'tabler-circle',
        module_name: '/app/status-awal-santri/list',
        seq_number: 5,
        status: 1,
      },
      {
        parent_id: 2,
        menu_name: 'Jenis Beasiswa',
        menu_icon: 'tabler-circle',
        module_name: '/app/jenis-beasiswa/list',
        seq_number: 6,
        status: 1,
      },
      {
        parent_id: 2,
        menu_name: 'Jenis Guru',
        menu_icon: 'tabler-circle',
        module_name: '/app/jenis-guru/list',
        seq_number: 7,
        status: 1,
      },
      {
        parent_id: 2,
        menu_name: 'Kelompok Mata Pelajaran',
        menu_icon: 'tabler-circle',
        module_name: '/app/kelompok-pelajaran/list',
        seq_number: 8,
        status: 1,
      },
      {
        parent_id: 2,
        menu_name: 'Mata Pelajaran',
        menu_icon: 'tabler-circle',
        module_name: '/app/mata-pelajaran/list',
        seq_number: 9,
        status: 1,
      },
      {
        parent_id: 2,
        menu_name: 'Jenis Jam Pelajaran',
        menu_icon: 'tabler-circle',
        module_name: '/app/jenis-jam-pelajaran/list',
        seq_number: 10,
        status: 1,
      },
      {
        parent_id: 2,
        menu_name: 'Jam Pelajaran',
        menu_icon: 'tabler-circle',
        module_name: '/app/jam-pelajaran/list',
        seq_number: 11,
        status: 1,
      },
      {
        parent_id: 2,
        menu_name: 'Orang Tua Wali',
        menu_icon: 'tabler-circle',
        module_name: '/app/orang-tua-wali/list',
        seq_number: 12,
        status: 1,
      },
      {
        parent_id: 3,
        menu_name: 'User',
        menu_icon: 'tabler-circle',
        module_name: '/app/user/list',
        seq_number: 1,
        status: 1,
      },
      {
        parent_id: 3,
        menu_name: 'Role',
        menu_icon: 'tabler-circle',
        module_name: '/app/role/list',
        seq_number: 2,
        status: 1,
      },
      {
        parent_id: 3,
        menu_name: 'Menu',
        menu_icon: 'tabler-circle',
        module_name: '/app/menu/list',
        seq_number: 3,
        status: 1,
      },
      {
        parent_id: 3,
        menu_name: 'Param Global',
        menu_icon: 'tabler-circle',
        module_name: '/app/param-global/list',
        seq_number: 4,
        status: 1,
      },
    ];
  }
}
export const datamenu = new DataMenu();
