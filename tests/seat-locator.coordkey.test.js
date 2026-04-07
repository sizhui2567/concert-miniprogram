const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseSeatInput,
  locateSeat
} = require('../miniprogram/utils/seat-locator');

function buildFixtureSeatMap() {
  return {
    version: 'seat-map-v2',
    areas: [
      {
        id: 'A101',
        name: '101',
        seatModel: {
          mode: 'grid',
          rowStart: 1,
          rowCount: 20,
          seatStart: 1,
          defaultSeatsPerRow: 30,
          anchor: { x: 100, y: 100 },
          rowVector: { x: 0, y: 4 },
          seatVector: { x: 4, y: 0 },
          areaAlias: ['101', '101区', 'A101']
        }
      }
    ],
    seatDetail: {
      enabled: true,
      seats: [
        {
          id: 'A101-R12-S8',
          areaId: 'A101',
          row: 12,
          seat: 8,
          coordKey: '12,8',
          x: 412.2,
          y: 288.6,
          status: 'available'
        }
      ]
    }
  };
}

test('parseSeatInput supports row-seat chinese format', () => {
  const parsed = parseSeatInput('101区12排8座');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.areaToken, '101区');
  assert.equal(parsed.row, 12);
  assert.equal(parsed.seat, 8);
  assert.equal(parsed.coordKey, '12,8');
});

test('parseSeatInput supports area-row,seat format', () => {
  const parsed = parseSeatInput('A101-12,8');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.areaToken, 'A101');
  assert.equal(parsed.coordKey, '12,8');
});

test('locateSeat prefers seatDetail coordKey hit', () => {
  const seatMap = buildFixtureSeatMap();
  const located = locateSeat(seatMap, 'A101-12,8');
  assert.equal(located.ok, true);
  assert.equal(located.areaId, 'A101');
  assert.equal(located.coordKey, '12,8');
  assert.equal(located.x, 412.2);
  assert.equal(located.y, 288.6);
});

test('locateSeat supports coord-only input with defaultAreaId', () => {
  const seatMap = buildFixtureSeatMap();
  const located = locateSeat(seatMap, '12,8', { defaultAreaId: 'A101' });
  assert.equal(located.ok, true);
  assert.equal(located.areaId, 'A101');
  assert.equal(located.coordKey, '12,8');
});

test('locateSeat returns explicit error when area token not found', () => {
  const seatMap = buildFixtureSeatMap();
  const located = locateSeat(seatMap, 'B201-12,8');
  assert.equal(located.ok, false);
  assert.match(located.error, /Area not found/i);
});

test('locateSeat returns explicit error on seat out of range', () => {
  const seatMap = buildFixtureSeatMap();
  const located = locateSeat(seatMap, 'A101-12,999');
  assert.equal(located.ok, false);
  assert.match(located.error, /Seat out of range/i);
});
