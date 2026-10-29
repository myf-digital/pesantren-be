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
  stub(Batch, 'findOne', async () => null);
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
  stub(Batch, 'findOne', async () => null);
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
  stub(Batch, 'findOne', async () => null);
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

test('automatic import batch previews without writes and saves metadata in the data transaction', async () => {
  const {
    automaticImportBatch,
  } = require('../dist/module/app/keu.shared/import.batch');
  const Batch =
    require('../dist/module/app/keu.import.batch/keu.import.batch.model').default;
  const batch = automaticImportBatch('RekapHarian');
  const transaction = {};
  const calls = [];
  stub(Batch, 'findOne', async () => null);
  stub(Batch, 'create', async (payload, options) =>
    calls.push({ payload, options })
  );
  const rows = [
    { valid: true, payload: { id_batch: batch.id, tanggal: '2026-10-29' } },
    { valid: false, payload: { id_batch: batch.id, tanggal: 'invalid' } },
    { valid: true, payload: { id_batch: 'existing', tanggal: '2026-01-01' } },
  ];
  assert.equal(batch.preview(rows)[0].payload.id_batch, null);
  assert.equal(batch.preview(rows)[2].payload.id_batch, 'existing');
  assert.equal(rows[0].payload.id_batch, batch.id);
  assert.equal(calls.length, 0);
  await batch.save(rows, transaction, 'rekap.xlsx');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.transaction, transaction);
  assert.equal(calls[0].payload.jumlah_baris, 2);
  assert.equal(calls[0].payload.jumlah_valid, 1);
  assert.equal(calls[0].payload.jumlah_error, 1);
  assert.equal(calls[0].payload.periode_awal, '2026-10-29');
  assert.equal(calls[0].payload.nama_file, 'rekap.xlsx');
  assert.equal(batch.created, true);
});

test('explicit import batch does not create automatic metadata', async () => {
  const {
    automaticImportBatch,
  } = require('../dist/module/app/keu.shared/import.batch');
  const batch = automaticImportBatch('Target');
  await batch.save([{ valid: true, payload: { id_batch: 'existing' } }], {});
  assert.equal(batch.created, false);
});

test('duplicate file is rejected before parsing or writing finance rows', async () => {
  const {
    keuRekapHarian,
  } = require('../dist/module/app/keu.rekap.harian/keu.rekap.harian.controller');
  const Batch =
    require('../dist/module/app/keu.import.batch/keu.import.batch.model').default;
  const { helper } = require('../dist/helpers/helper');
  stub(Batch, 'findOne', async ({ where }) => {
    assert.equal(where.hash_file.length, 64);
    return { id_batch: 'previous' };
  });
  stub(helper, 'parseImportFile', async () =>
    assert.fail('duplicate must not be parsed')
  );
  const res = response();
  await keuRekapHarian.import(
    {
      body: { mode: 'commit' },
      files: {
        file_import: { name: 'daily.csv', data: Buffer.from('same file') },
      },
    },
    res
  );
  assert.equal(res.code, 400);
  assert.match(res.body.message, /File yang sama sudah diimpor/);
});

test('target, budget and scholarship corrections archive old versions in the same transaction', async () => {
  const {
    saveFinancialVersion,
  } = require('../dist/module/app/keu.shared/operasional');
  const Budget =
    require('../dist/module/app/keu.anggaran/keu.anggaran.model').default;
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  for (const [model, pk] of [
    [Target, 'id_target'],
    [Budget, 'id_anggaran'],
    [Scholarship, 'id_rekap_beasiswa'],
  ]) {
    const calls = [];
    stub(model, 'findByPk', async (id, options) => {
      assert.equal(id, 'previous');
      assert.equal(options.transaction, transaction);
      assert.equal(options.lock, 'UPDATE');
      return {
        is_current: true,
        update: async (data, options) =>
          calls.push(['archive', data, options.transaction]),
      };
    });
    stub(model, 'create', async (data, options) => {
      calls.push(['new', data, options.transaction]);
      return data;
    });
    const value = await saveFinancialVersion(
      model,
      pk,
      {
        [pk]: 'previous',
        nilai_target: '123.45',
        is_current: true,
        created_at: 'old',
      },
      transaction
    );
    assert.equal(calls[0][0], 'archive');
    assert.equal(calls[0][1].is_current, false);
    assert.equal(calls[1][2], transaction);
    assert.equal(value[pk], undefined);
    assert.equal(value.created_at, undefined);
    assert.equal(value.nilai_target, '123.45');
  }
});

test('manual input resolves business codes, rejects unknown or conflicting identities', async () => {
  const {
    resolveBusinessCodes,
  } = require('../dist/module/app/keu.shared/input');
  stub(Account, 'findAll', async ({ where }) => {
    assert.equal(where.kode_akun, 'KAS');
    return [
      { get: (key) => ({ id_akun: 'account-id', is_active: true })[key] },
    ];
  });
  assert.equal(
    (await resolveBusinessCodes({ kode_akun: ' KAS ' })).id_akun,
    'account-id'
  );
  await assert.rejects(
    resolveBusinessCodes({ kode_akun: 'KAS', id_akun: 'different' }),
    /tidak cocok/
  );
  stub(Account, 'findAll', async () => []);
  await assert.rejects(
    resolveBusinessCodes({ kode_akun: 'typo' }),
    /tidak ditemukan/
  );
});

test('inactive account and group cannot be used for new finance input', async () => {
  stub(Account, 'findByPk', async () => ({ is_active: false }));
  stub(Daily, 'findOne', async () => null);
  assert.match(
    (await validateOperational('harian', daily)).join(','),
    /Akun tidak aktif/
  );
  stub(Account, 'findByPk', async () => ({
    is_active: true,
    id_kelompok_kas: 'group',
  }));
  stub(Group, 'findByPk', async () => ({ is_active: false }));
  assert.match(
    (await validateOperational('harian', daily)).join(','),
    /Kelompok kas tidak aktif/
  );
});

test('used account cannot change group or business code', async () => {
  const {
    validateAccountChange,
  } = require('../dist/module/app/keu.shared/master');
  const previous = {
    id_akun: 'account',
    kode_akun: 'KAS',
    id_kelompok_kas: 'old',
  };
  await assert.rejects(
    validateAccountChange(previous, { kode_akun: 'NEW' }),
    /Kode akun tidak boleh diubah/
  );
  stub(Daily, 'findOne', async () => ({ id_rekap: 'historical' }));
  await assert.rejects(
    validateAccountChange(previous, { id_kelompok_kas: 'new' }),
    /tidak boleh dipindahkan/
  );
});

test('daily report preserves sparse source dates and does not sum daily balance positions', () => {
  const { dailySummary } = require('../dist/module/app/keu.shared/report');
  const summary = dailySummary([
    { ...daily, tanggal: '2026-01-01', saldo_akhir: '100.00' },
    { ...daily, tanggal: '2026-10-29', saldo_akhir: '150.00' },
  ]);
  assert.deepEqual(summary.periode_tersedia, {
    awal: '2026-01-01',
    akhir: '2026-10-29',
  });
  assert.equal(summary.jumlah_baris, 2);
  assert.equal(summary.histori_lengkap, null);
  assert.equal(summary.posisi_terakhir.length, 1);
  assert.equal(summary.posisi_terakhir[0].saldo_akhir, '150.00');
  assert.equal(summary.masuk, '40.00');
});

test('all four financial insert endpoints create and link automatic batches atomically', async () => {
  const connection = require('../dist/database/connection');
  const Batch =
    require('../dist/module/app/keu.import.batch/keu.import.batch.model').default;
  const Budget =
    require('../dist/module/app/keu.anggaran/keu.anggaran.model').default;
  const Tahun =
    require('../dist/module/app/tahun.ajaran/tahun.ajaran.model').default;
  const Jenis =
    require('../dist/module/app/jenis.beasiswa/jenis.beasiswa.model').default;
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  stub(connection, 'sequelize', { transaction: async (fn) => fn(transaction) });
  stub(Account, 'findByPk', async () => ({
    is_periodik_tahun_ajaran: false,
    is_active: true,
  }));
  stub(Tahun, 'findByPk', async () => ({}));
  stub(Jenis, 'findByPk', async () => ({}));
  stub(Batch, 'findOne', async () => null);
  for (const model of [Daily, Target, Budget, Scholarship])
    stub(model, 'findOne', async () => null);
  const cases = [
    [
      'keu.rekap.harian',
      'keuRekapHarian',
      Daily,
      { ...daily, id_batch: undefined },
      'RekapHarian',
    ],
    [
      'keu.target',
      'keuTarget',
      Target,
      {
        nama_target: 'Target',
        jenis_target: 'Penerimaan',
        periode_mulai: '2026-01-01',
        periode_selesai: '2026-12-31',
        id_akun: 'akun',
        nilai_target: '100.00',
      },
      'Target',
    ],
    [
      'keu.anggaran',
      'keuAnggaran',
      Budget,
      {
        nama_anggaran: 'Final',
        periode_mulai: '2026-01-01',
        periode_selesai: '2026-12-31',
        nilai_disetujui: '100.00',
        nilai_realisasi: null,
      },
      'Anggaran',
    ],
    [
      'keu.beasiswa',
      'keuBeasiswa',
      Scholarship,
      {
        ...scholarship,
        id_batch: undefined,
        cakupan_data: 'Agregat',
        id_santri: null,
      },
      'Beasiswa',
    ],
  ];
  for (const [module, controller, model, payload, jenis] of cases) {
    const writes = [];
    stub(Batch, 'create', async (data, options) => {
      assert.equal(options.transaction, transaction);
      assert.equal(data.jenis_data, jenis);
      assert.equal(data.status_batch, 'Dipublikasikan');
      assert.ok(data.waktu_publikasi instanceof Date);
      writes.push(data);
      return data;
    });
    stub(model, 'create', async (data, options) => {
      assert.equal(options.transaction, transaction);
      assert.equal(data.id_batch, writes[0].id_batch);
      writes.push(data);
      return data;
    });
    const handler = require(
      `../dist/module/app/${module}/${module}.controller`
    )[controller];
    const res = response();
    await handler.insert({ body: { data: [payload] } }, res);
    assert.equal(writes.length, 2, `${module}: ${res.body?.message}`);
    assert.equal(res.body.data.id_batch, writes[0].id_batch);
  }
});

test('correction by business identity resolves existing current row without UUID input', async () => {
  const {
    prepareCorrection,
  } = require('../dist/module/app/keu.shared/operasional');
  stub(Daily, 'findOne', async ({ where }) => {
    assert.equal(where.is_current, true);
    assert.equal(where.tanggal, daily.tanggal);
    return { get: () => 'previous-uuid' };
  });
  assert.equal(
    (await prepareCorrection('harian', daily, 'koreksi')).id_rekap,
    'previous-uuid'
  );
  await assert.rejects(
    prepareCorrection('anggaran', {}, 'koreksi'),
    /kode referensi/
  );
  await assert.rejects(
    prepareCorrection('harian', daily, 'replace-all'),
    /Aksi harus/
  );
});

test('new migration guards master identities and enforces source and payload deduplication', async () => {
  const migration = require('../dist/database/migrations/20261029000001-keu-history-and-master-guards');
  const sql = [];
  const db = {
    transaction: async (fn) => fn({}),
    query: async (query) => sql.push(query),
  };
  await migration.up({ sequelize: db });
  assert.match(
    sql.join('\n'),
    /CREATE UNIQUE INDEX keu_anggaran_current_source_unique/
  );
  assert.match(
    sql.join('\n'),
    /CREATE UNIQUE INDEX keu_import_batch_payload_unique/
  );
  assert.match(sql.join('\n'), /NEW.kode_akun IS DISTINCT FROM OLD.kode_akun/);
  assert.match(sql.join('\n'), /SELECT 1 FROM keu_rekap_harian/);
  await migration.down({ sequelize: db });
  assert.match(sql.join('\n'), /DROP COLUMN hash_payload/);
});

test('scholarship import resolves NIS and rejects ambiguous recipient codes', async () => {
  const { helper } = require('../dist/helpers/helper');
  const {
    keuBeasiswa,
  } = require('../dist/module/app/keu.beasiswa/keu.beasiswa.controller');
  const Batch =
    require('../dist/module/app/keu.import.batch/keu.import.batch.model').default;
  const Tahun =
    require('../dist/module/app/tahun.ajaran/tahun.ajaran.model').default;
  const Jenis =
    require('../dist/module/app/jenis.beasiswa/jenis.beasiswa.model').default;
  const Santri = require('../dist/module/app/santri/santri.model').default;
  stub(Batch, 'findOne', async () => null);
  stub(Tahun, 'findOne', async () => ({ id_tahunajaran: 'tahun' }));
  stub(Tahun, 'findByPk', async () => ({}));
  stub(Jenis, 'findOne', async () => ({ id_beasiswa: 'jenis' }));
  stub(Jenis, 'findByPk', async () => ({}));
  stub(Santri, 'findAll', async () => [{ id_santri: 'santri' }]);
  stub(Santri, 'findByPk', async () => ({}));
  stub(Scholarship, 'findOne', async () => null);
  stub(helper, 'parseImportFile', async () => [
    {
      __row: 2,
      'Cakupan Data': 'PerPenerima',
      NIS: '00123',
      'Tahun Ajaran': '2026/2027',
      'Kode Jenis Beasiswa': 'B01',
      'Jenis Bantuan': 'Beasiswa',
      'Status Final': 'Final',
      'Tanggal Data': '2026-10-29',
      'Nilai Ditetapkan': '100.00',
    },
  ]);
  const req = {
    body: { mode: 'preview' },
    files: { file_import: { name: 'data.csv', data: Buffer.from('NIS') } },
  };
  const res = response();
  await keuBeasiswa.import(req, res);
  assert.equal(res.body.data.valid, 1);
  assert.equal(res.body.data.data[0].payload.id_santri, 'santri');
  stub(Santri, 'findAll', async () => [
    { id_santri: 'one' },
    { id_santri: 'two' },
  ]);
  const invalid = response();
  await keuBeasiswa.import(req, invalid);
  assert.equal(invalid.body.data.invalid, 1);
  assert.match(
    invalid.body.data.data[0].error,
    /NIS tidak ditemukan atau tidak unik/
  );
});

test('financial permissions enforce view and import rights for insert, including query strings', async () => {
  const { checkAccess } = require('../dist/module/auth/auth.middleware');
  const {
    repository,
  } = require('../dist/module/app/role.menu/role.menu.repository');
  const permission = {
    view: '1',
    create: '1',
    import: '0',
    menu: { module_name: 'keu-beasiswa' },
  };
  stub(repository, 'detailRole', async () => ({
    dataValues: { role_menu: [permission] },
  }));
  assert.equal(
    (
      await checkAccess(
        { method: 'POST', originalUrl: '/app/keu-beasiswa/insert?x=1' },
        'petugas',
        'keu-beasiswa'
      )
    ).code,
    403
  );
  permission.import = '1';
  assert.equal(
    (
      await checkAccess(
        { method: 'POST', originalUrl: '/app/keu-beasiswa/insert' },
        'petugas',
        'keu-beasiswa'
      )
    ).status,
    true
  );
  permission.view = '0';
  assert.equal(
    (
      await checkAccess(
        { method: 'GET', originalUrl: '/app/keu-beasiswa' },
        'petugas',
        'keu-beasiswa'
      )
    ).code,
    403
  );
});

test('official scholarship template exposes NIS and business codes without UUID columns', async () => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const ExcelJS = require('exceljs');
  const { helper } = require('../dist/helpers/helper');
  const {
    keuBeasiswa,
  } = require('../dist/module/app/keu.beasiswa/keu.beasiswa.controller');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'keu-template-'));
  stub(helper, 'checkDirExport', async () => ({ dir: '/export', path: dir }));
  const res = response();
  await keuBeasiswa.export({ body: { template: '1' } }, res);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(dir, path.basename(res.body.data)));
  const headers = workbook.worksheets[0].getRow(1).values.filter(Boolean);
  assert.ok(headers.includes('NIS'));
  assert.ok(headers.includes('Kode Jenis Beasiswa'));
  assert.equal(
    headers.some((value) => value.startsWith('ID ')),
    false
  );
  await fs.rm(dir, { recursive: true, force: true });
});

test('duplicate normalized payload is rejected in transaction before batch creation', async () => {
  const {
    automaticImportBatch,
  } = require('../dist/module/app/keu.shared/import.batch');
  const Batch =
    require('../dist/module/app/keu.import.batch/keu.import.batch.model').default;
  const batch = automaticImportBatch('Anggaran');
  const transaction = {};
  stub(Batch, 'findOne', async (options) => {
    assert.equal(options.transaction, transaction);
    assert.equal(options.where.hash_payload.length, 64);
    return { id_batch: 'previous' };
  });
  stub(Batch, 'create', async () =>
    assert.fail('duplicate must not create batch')
  );
  await assert.rejects(
    batch.save(
      [
        {
          valid: true,
          payload: { id_batch: batch.id, nilai_disetujui: '100.00' },
        },
      ],
      transaction
    ),
    /Data yang sama sudah diimpor/
  );
});
