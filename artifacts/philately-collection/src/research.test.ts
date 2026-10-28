import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCatalog, serializeCatalog, type StampRecord } from './research';

const record: StampRecord = {
  id: 'local-123', displayName: 'Моя марка', country: 'СССР', issueYear: '',
  denomination: '10', denominationCurrency: 'коп.', series: '', subject: 'Птицы',
  condition: 'Надрыв', gumPerforation: '', usedOrMint: '', estimatedValue: '1–2',
  estimateCurrency: 'RUB', valuationSource: 'Личная оценка', history: 'Заметка владельца',
  confidence: 'Со слов владельца', reviewStatus: 'Нужно проверить', sourceAlbumPage: 2,
  crop: { x: -0.2, y: 1.25, width: 24.567, height: 13.89 },
};
const backup = () => JSON.parse(serializeCatalog([record]));

test('round trip preserves every manual field and exact crop coordinates', () => {
  assert.deepEqual(parseCatalog(serializeCatalog([record])), [record]);
});
test('empty catalogs stay empty; UTF-8 BOM is accepted', () => {
  assert.deepEqual(parseCatalog(serializeCatalog([])), []);
  assert.deepEqual(parseCatalog(`\uFEFF${serializeCatalog([record])}`), [record]);
});
test('rejects malformed JSON, raw storage arrays, and incompatible metadata', () => {
  for (const input of ['bad', 'null', '[]', JSON.stringify([record])]) {
    assert.throws(() => parseCatalog(input));
  }
  for (const [key, value] of [
    ['version', 2], ['format', 'other'], ['geometryVersion', 'v2'],
    ['researchVersion', 'v1'], ['exportedAt', 'not-a-date'],
  ]) {
    assert.throws(() => parseCatalog(JSON.stringify({ ...backup(), [key]: value })));
  }
});
test('rejects missing fields, incorrect types, invalid pages, duplicate IDs and unsafe IDs', () => {
  for (const changes of [
    { history: undefined }, { country: 42 }, { sourceAlbumPage: 4 },
    { sourceAlbumPage: 1.5 }, { id: '../x' }, { id: '' },
    { crop: { ...record.crop, width: 0 } },
    { crop: { ...record.crop, x: 101 } },
    { crop: { ...record.crop, height: '10' } },
  ]) {
    const value = backup();
    value.records[0] = { ...record, ...changes };
    assert.throws(() => parseCatalog(JSON.stringify(value)));
  }
  const value = backup();
  value.records.push(record);
  assert.throws(() => parseCatalog(JSON.stringify(value)));
});
test('export validates too, rather than emitting a file that cannot be restored', () => {
  assert.throws(() => serializeCatalog([{ ...record, crop: { ...record.crop, x: NaN } }]));
});
