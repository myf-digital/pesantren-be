const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { Op, Sequelize } = require('sequelize');
const {
  keuRekapHarianSchema: dailySchema,
} = require('../dist/module/app/keu.rekap.harian/keu.rekap.harian.schema');
const {
  keuBeasiswaSchema: scholarshipSchema,
  updateKeuBeasiswaSchema,
} = require('../dist/module/app/keu.beasiswa/keu.beasiswa.schema');
const {
  validateOperational,
  identityKey,
  saveDailyVersion,
  reconcileDaily,
  OperationalError,
} = require('../dist/module/app/keu.shared/operasional');
const Daily =
  require('../dist/module/app/keu.rekap.harian/keu.rekap.harian.model').default;
const Account = require('../dist/module/app/keu.akun/keu.akun.model').default;
const Target =
  require('../dist/module/app/keu.target/keu.target.model').default;
const Scholarship =
  require('../dist/module/app/keu.beasiswa/keu.beasiswa.model').default;
const Group =
  require('../dist/module/app/keu.kelompok.kas/keu.kelompok.kas.model').default;
const original = [];
const stub = (object, name, replacement) => {
  original.push([object, name, object[name]]);
  object[name] = replacement;
};
afterEach(() => {
  while (original.length) {
    const [object, name, value] = original.pop();
    object[name] = value;
  }
});
const daily = {
  tanggal: '2026-10-27',
  id_akun: 'akun',
  saldo_awal: '100.00',
  masuk: '20.00',
  keluar: '5.00',
  saldo_akhir: '115.00',
  id_batch: 'batch',
};
const scholarship = {
  id_tahunajaran: 'tahun',
  id_jenis_beasiswa: 'jenis',
  jenis_bantuan: 'Beasiswa',
  status_final: 'Disetujui',
  tanggal_data: '2026-10-27',
  nilai_ditetapkan: '100.00',
  id_batch: 'batch',
};
const response = () => ({
  json(value) {
    this.body = value;
  },
  end() {},
  status(value) {
    this.code = value;
    return this;
  },
});

test('rekap rejects negative incoming/outgoing without restricting signed source balances', () => {
  assert.equal(
    dailySchema.safeParse({ ...daily, masuk: '-0.01' }).success,
    false
  );
  assert.equal(
    dailySchema.safeParse({ ...daily, keluar: '-1' }).success,
    false
  );
  assert.equal(
    dailySchema.safeParse({
      ...daily,
      saldo_awal: '-100.00',
      saldo_akhir: '-85.00',
    }).success,
    true
  );
});
test('reconciliation preserves precision beyond JavaScript number range', () => {
  assert.deepEqual(
    reconcileDaily({
      saldo_awal: '9999999999999999.90',
      masuk: '0.09',
      keluar: '0.01',
      saldo_akhir: '9999999999999999.98',
    }),
    []
  );
  const warnings = reconcileDaily({ ...daily, saldo_akhir: '114.99' });
  assert.match(warnings[0], /selisih -0.01/);
  assert.equal(daily.saldo_akhir, '115.00');
});
test('recipient scholarship requires santri, aggregate requires NULL, realisasi must be nonnegative', () => {
  assert.equal(scholarshipSchema.safeParse(scholarship).success, false);
  assert.equal(
    scholarshipSchema.safeParse({ ...scholarship, id_santri: 'santri' })
      .success,
    true
  );
  assert.equal(
    scholarshipSchema.safeParse({
      ...scholarship,
      cakupan_data: 'Agregat',
      id_santri: null,
    }).success,
    true
  );
  assert.equal(
    scholarshipSchema.safeParse({
      ...scholarship,
      cakupan_data: 'Agregat',
      id_santri: 'santri',
    }).success,
    false
  );
  assert.equal(
    scholarshipSchema.safeParse({
      ...scholarship,
      id_santri: 'santri',
      nilai_realisasi: '-1',
    }).success,
    false
  );
  assert.deepEqual(updateKeuBeasiswaSchema.parse({ keterangan: null }), {
    keterangan: null,
  });
});
test('periodic account requires academic year for daily and target records', async () => {
  stub(Account, 'findByPk', async () => ({ is_periodik_tahun_ajaran: true }));
  stub(Daily, 'findOne', async () => null);
  stub(Target, 'findOne', async () => null);
  assert.match(
    (await validateOperational('harian', daily))[0],
    /Tahun Ajaran wajib/
  );
  assert.deepEqual(
    await validateOperational('harian', { ...daily, id_tahunajaran: 'tahun' }),
    []
  );
  assert.match(
    (await validateOperational('target', { id_akun: 'akun' }))[0],
    /Tahun Ajaran wajib/
  );
});
test('duplicate validation treats missing academic year as NULL and excludes corrected UUID', async () => {
  stub(Account, 'findByPk', async () => ({ is_periodik_tahun_ajaran: false }));
  let where;
  stub(Daily, 'findOne', async (options) => {
    where = options.where;
    return {};
  });
  assert.match(
    (await validateOperational('harian', daily, 'old-id'))[0],
    /sudah ada/
  );
  assert.equal(where.id_tahunajaran, null);
  assert.equal(where.id_rekap[Op.ne], 'old-id');
  assert.equal(where.is_current, true);
});
test('target natural key detects equal periods even when names/UUIDs differ', () => {
  const a = {
    id_akun: 'a',
    jenis_target: 'Penerimaan',
    periode_mulai: '2026-01-01',
    periode_selesai: '2026-12-31',
  };
  assert.equal(
    identityKey('target', { ...a, nama_target: 'A' }),
    identityKey('target', { ...a, nama_target: 'B', id_target: 'other' })
  );
});
test('aggregate scholarship key handles empty/null program and includes assistance type', async () => {
  const a = { ...scholarship, cakupan_data: 'Agregat', id_santri: null };
  assert.equal(
    identityKey('beasiswa', { ...a, nama_program: '' }),
    identityKey('beasiswa', { ...a, nama_program: null })
  );
  assert.notEqual(
    identityKey('beasiswa', a),
    identityKey('beasiswa', { ...a, jenis_bantuan: 'Keringanan' })
  );
  stub(Scholarship, 'findOne', async () => ({}));
  assert.match((await validateOperational('beasiswa', a))[0], /sudah ada/);
});
test('daily correction archives locked old row and inserts a fresh UUID without changing source amounts', async () => {
  const calls = [];
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  stub(Daily, 'findByPk', async (id, options) => {
    assert.equal(id, 'old-id');
    assert.equal(options.lock, 'UPDATE');
    return {
      is_current: true,
      update: async (data, options) =>
        calls.push(['archive', data, options.transaction]),
    };
  });
  stub(Daily, 'create', async (data, options) => {
    calls.push(['insert', data, options.transaction]);
    return { id_rekap: 'new-id', ...data };
  });
  const input = {
    ...daily,
    id_rekap: 'old-id',
    created_at: 'old-time',
    saldo_akhir: '114.99',
    is_current: true,
  };
  const result = await saveDailyVersion(input, transaction);
  assert.equal(result.id_rekap, 'new-id');
  assert.deepEqual(calls[0], ['archive', { is_current: false }, transaction]);
  assert.equal(calls[1][1].id_rekap, undefined);
  assert.equal(calls[1][1].created_at, undefined);
  assert.equal(calls[1][1].saldo_akhir, '114.99');
  assert.match(calls[1][1].keterangan, /selisih -0.01/);
  assert.equal(input.is_current, true);
});
test('historical or missing daily version cannot be rewritten', async () => {
  stub(Daily, 'findByPk', async () => ({ is_current: false }));
  stub(Daily, 'create', async () => assert.fail('must not insert'));
  await assert.rejects(
    saveDailyVersion(
      { ...daily, id_rekap: 'old-id' },
      { LOCK: { UPDATE: 'UPDATE' } }
    ),
    OperationalError
  );
});
test('account create rejects inactive group before writing', async () => {
  let condition;
  stub(Group, 'findOne', async (options) => {
    condition = options.where;
    return null;
  });
  const {
    keuAkun,
  } = require('../dist/module/app/keu.akun/keu.akun.controller');
  const res = response();
  await keuAkun.create(
    { body: { kode_akun: 'A', id_kelompok_kas: 'group' } },
    res
  );
  assert.equal(condition.is_active, true);
  assert.equal(res.code, 400);
});
test('group delete returns 400 when FK still references master', async () => {
  const {
    repository,
  } = require('../dist/module/app/keu.kelompok.kas/keu.kelompok.kas.repository');
  stub(repository, 'detail', async () => ({}));
  stub(repository, 'delete', async () => {
    const error = new Error();
    error.name = 'SequelizeForeignKeyConstraintError';
    throw error;
  });
  const {
    keuKelompokKas,
  } = require('../dist/module/app/keu.kelompok.kas/keu.kelompok.kas.controller');
  const res = response();
  await keuKelompokKas.delete({ params: { id: 'group' } }, res);
  assert.equal(res.code, 400);
  assert.match(res.body.message, /direferensikan/);
});
test('migration generates NULL-safe current unique indexes and scholarship scope constraints', async () => {
  const db = new Sequelize('postgres://user:pass@localhost/test', {
    logging: false,
  });
  const sql = [];
  db.transaction = async (fn) => fn(undefined);
  db.query = async (query) => {
    sql.push(typeof query === 'string' ? query : query.query);
    return [];
  };
  const migration = require('../dist/database/migrations/20261027000007-keu-operational-validation');
  await migration.up(db.getQueryInterface());
  const ddl = sql.join('\n');
  assert.match(ddl, /COALESCE\("id_tahunajaran", ''\)/);
  assert.match(ddl, /WHERE "is_current" IS TRUE/);
  assert.match(
    ddl,
    /"cakupan_data" = 'PerPenerima' AND "id_santri" IS NOT NULL/
  );
  assert.match(ddl, /"nilai_realisasi" >= 0/);
  assert.match(ddl, /"status_sumber" VARCHAR\(100\)/);
  await migration.down(db.getQueryInterface());
  assert.equal(sql.filter((value) => value.startsWith('DROP INDEX')).length, 3);
});

test('daily file preview rejects duplicate natural keys and exposes reconciliation warnings', async () => {
  const { helper } = require('../dist/helpers/helper');
  const Batch =
    require('../dist/module/app/keu.import.batch/keu.import.batch.model').default;
  const {
    keuRekapHarian,
  } = require('../dist/module/app/keu.rekap.harian/keu.rekap.harian.controller');
  stub(Account, 'findByPk', async () => ({ is_periodik_tahun_ajaran: false }));
  stub(Account, 'findOne', async () => ({ id_akun: 'akun' }));
  stub(Daily, 'findOne', async () => null);
  stub(Batch, 'findByPk', async () => ({
    jenis_data: 'RekapHarian',
    status_batch: 'Draft',
  }));
  const row = {
    Tanggal: '2026-10-27',
    'Kode Akun': 'A',
    'Saldo Awal': '100.00',
    Masuk: '20.00',
    Keluar: '5.00',
    'Saldo Akhir': '114.99',
    'ID Batch': 'batch',
    Current: 'Ya',
    __row: 2,
  };
  stub(helper, 'parseImportFile', async () => [row, { ...row, __row: 3 }]);
  const res = response();
  await keuRekapHarian.import(
    {
      body: { mode: 'preview' },
      files: { file_import: { name: 'test.csv', data: Buffer.from('') } },
    },
    res
  );
  assert.equal(res.body.data.valid, 1);
  assert.equal(res.body.data.invalid, 1);
  assert.match(res.body.data.data[1].error, /Identitas data duplikat/);
  assert.match(res.body.data.data[0].warnings[0], /selisih -0.01/);
});
test('target batch rejects duplicate identities even with different UUIDs', async () => {
  const {
    keuTarget,
  } = require('../dist/module/app/keu.target/keu.target.controller');
  const value = {
    nama_target: 'Target',
    jenis_target: 'Penerimaan',
    periode_mulai: '2026-01-01',
    periode_selesai: '2026-12-31',
    id_akun: 'akun',
    nilai_target: '100.00',
  };
  const res = response();
  await keuTarget.insert(
    { body: { data: [value, { ...value, nama_target: 'Other' }] } },
    res
  );
  assert.equal(res.code, 400);
  assert.match(res.body.message, /Identitas data duplikat/);
});
test('scholarship partial update enforces recipient scope after merging stored row', async () => {
  const {
    repository,
  } = require('../dist/module/app/keu.beasiswa/keu.beasiswa.repository');
  const {
    keuBeasiswa,
  } = require('../dist/module/app/keu.beasiswa/keu.beasiswa.controller');
  const Tahun =
    require('../dist/module/app/tahun.ajaran/tahun.ajaran.model').default;
  const Jenis =
    require('../dist/module/app/jenis.beasiswa/jenis.beasiswa.model').default;
  const Batch =
    require('../dist/module/app/keu.import.batch/keu.import.batch.model').default;
  stub(repository, 'detail', async () => ({
    get: () => ({
      ...scholarship,
      cakupan_data: 'PerPenerima',
      id_santri: 'santri',
    }),
  }));
  stub(repository, 'update', async () => assert.fail('must not write'));
  stub(Tahun, 'findByPk', async () => ({}));
  stub(Jenis, 'findByPk', async () => ({}));
  stub(Batch, 'findByPk', async () => ({
    jenis_data: 'Beasiswa',
    status_batch: 'Draft',
  }));
  stub(Scholarship, 'findOne', async () => null);
  const res = response();
  await keuBeasiswa.update(
    { params: { id: 'id' }, body: { id_santri: null } },
    res
  );
  assert.equal(res.code, 400);
  assert.match(res.body.message, /Santri wajib/);
});

test('budget per-account form requires account and retains source status', () => {
  const {
    keuAnggaranSchema,
  } = require('../dist/module/app/keu.anggaran/keu.anggaran.schema');
  const value = {
    nama_anggaran: 'Anggaran',
    periode_mulai: '2026-01-01',
    periode_selesai: '2026-12-31',
    nilai_disetujui: '100.00',
    id_batch: 'batch',
    status_sumber: 'Final sumber',
  };
  assert.equal(
    keuAnggaranSchema.safeParse({ ...value, per_akun: true }).success,
    false
  );
  assert.equal(
    keuAnggaranSchema.parse({ ...value, per_akun: true, id_akun: 'akun' })
      .status_sumber,
    'Final sumber'
  );
  assert.equal(
    keuAnggaranSchema.safeParse({ ...value, per_akun: false }).success,
    true
  );
});
test('scholarship aggregate Excel export round-trips scope and precise amounts', async () => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const { helper } = require('../dist/helpers/helper');
  const {
    repository,
  } = require('../dist/module/app/keu.beasiswa/keu.beasiswa.repository');
  const {
    keuBeasiswa,
  } = require('../dist/module/app/keu.beasiswa/keu.beasiswa.controller');
  const Tahun =
    require('../dist/module/app/tahun.ajaran/tahun.ajaran.model').default;
  const Jenis =
    require('../dist/module/app/jenis.beasiswa/jenis.beasiswa.model').default;
  const Batch =
    require('../dist/module/app/keu.import.batch/keu.import.batch.model').default;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'keuangan-test-'));
  stub(repository, 'list', async () => [
    {
      ...scholarship,
      cakupan_data: 'Agregat',
      id_rekap_beasiswa: '11111111-1111-4111-8111-111111111111',
      nilai_diajukan: '0.00',
      nilai_ditetapkan: '9999999999999999.99',
      tahun_ajaran: { tahun_ajaran: '2026/2027' },
      jenis_beasiswa: { kode_beasiswa: 'J01' },
      is_current: true,
    },
  ]);
  stub(helper, 'checkDirExport', async () => ({ dir: '/export', path: dir }));
  stub(Tahun, 'findOne', async () => ({ id_tahunajaran: 'tahun' }));
  stub(Tahun, 'findByPk', async () => ({}));
  stub(Jenis, 'findOne', async () => ({ id_beasiswa: 'jenis' }));
  stub(Jenis, 'findByPk', async () => ({}));
  stub(Batch, 'findByPk', async () => ({
    jenis_data: 'Beasiswa',
    status_batch: 'Draft',
  }));
  stub(Scholarship, 'findOne', async () => null);
  const exported = response();
  await keuBeasiswa.export({ body: {} }, exported);
  assert.equal(exported.body.status, true);
  const name = path.basename(exported.body.data);
  const data = await fs.readFile(path.join(dir, name));
  const preview = response();
  await keuBeasiswa.import(
    { body: { mode: 'preview' }, files: { file_import: { name, data } } },
    preview
  );
  assert.equal(preview.body.data.valid, 1);
  const payload = preview.body.data.data[0].payload;
  assert.equal(payload.cakupan_data, 'Agregat');
  assert.equal(payload.id_santri, null);
  assert.equal(payload.nilai_diajukan, '0.00');
  assert.equal(payload.nilai_ditetapkan, '9999999999999999.99');
  assert.equal(payload.nilai_realisasi, null);
});
