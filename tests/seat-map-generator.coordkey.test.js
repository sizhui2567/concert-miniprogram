const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSeatMapFromImage,
  resolveSeatMapOptions
} = require('../miniprogram/utils/seat-map-generator');

test('seat-map-generator emits coordKey and seatKey in seatDetail', () => {
  const options = resolveSeatMapOptions({
    presetKey: 'arena_end',
    ringCount: 2,
    sectorCount: 8
  });
  const seatMap = buildSeatMapFromImage({
    width: 620,
    height: 570,
    path: 'fixture.jpg'
  }, options);

  assert.ok(seatMap);
  assert.ok(seatMap.seatDetail);
  assert.equal(seatMap.seatDetail.enabled, true);
  assert.ok(Array.isArray(seatMap.seatDetail.seats));
  assert.ok(seatMap.seatDetail.seats.length > 0);

  const sample = seatMap.seatDetail.seats[0];
  assert.ok(sample.areaId);
  assert.ok(Number.isFinite(Number(sample.row)));
  assert.ok(Number.isFinite(Number(sample.seat)));
  assert.match(sample.coordKey, /^\d+,\d+$/);
  assert.match(sample.seatKey, /^R\d+S\d+$/);
});
