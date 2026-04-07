// utils/seat-locator.js
// Seat input parser + seat coordinate locator with coordKey support.

const AREA_INDEX_CACHE = new WeakMap();

function normalizeText(input) {
  return String(input || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[\uFF08(]/g, '(')
    .replace(/[\uFF09)]/g, ')')
    .replace(/[\uFF0C]/g, ',')
    .toUpperCase();
}

function normalizeAreaToken(area) {
  return normalizeText(area)
    .replace(/\u533A$/i, '')
    .replace(/^\u770B\u53F0/i, '')
    .replace(/^\u5185\u573A/i, '\u5185\u573A')
    .replace(/^FLOOR[-_]?/i, 'FLOOR-');
}

function buildCoordKey(row, seat) {
  const rowNum = Number(row);
  const seatNum = Number(seat);
  if (!Number.isFinite(rowNum) || !Number.isFinite(seatNum)) return '';
  return `${rowNum},${seatNum}`;
}

function parseCoordKeyText(rawText) {
  const text = normalizeText(rawText);
  if (!text) return { ok: false };

  let match = text.match(/^(\d{1,3}),(\d{1,3})$/);
  if (!match) match = text.match(/^(\d{1,3})[-_\/](\d{1,3})$/);
  if (!match) match = text.match(/^(\d{1,3})\u6392(\d{1,3})(?:\u5EA7|\u53F7)?$/i);
  if (!match) return { ok: false };

  const row = Number(match[1]);
  const seat = Number(match[2]);
  return {
    ok: true,
    row,
    seat,
    coordKey: buildCoordKey(row, seat)
  };
}

function parseSeatInput(rawInput) {
  const input = normalizeText(rawInput);
  if (!input) {
    return { ok: false, error: 'Seat input is empty' };
  }

  // coord-only: 12,8 / 12-8 / 12排8座
  const coordOnly = parseCoordKeyText(input);
  if (coordOnly.ok) {
    return {
      ok: true,
      areaToken: '',
      row: coordOnly.row,
      seat: coordOnly.seat,
      coordKey: coordOnly.coordKey,
      source: rawInput
    };
  }

  // 101区12排8座 / 内场A区3排12座 / FLOOR-A3排12
  let match = input.match(/^(.*?)(\d{1,3})\u6392(\d{1,3})(?:\u5EA7|\u53F7)?$/i);
  if (match) {
    const row = Number(match[2]);
    const seat = Number(match[3]);
    return {
      ok: true,
      areaToken: match[1],
      row,
      seat,
      coordKey: buildCoordKey(row, seat),
      source: rawInput
    };
  }

  // 101-12-8 / FLOOR-A-3-12 / 内场A区_3_12
  match = input.match(/^(.*?)[-_\/](\d{1,3})[-_\/](\d{1,3})$/i);
  if (match) {
    const row = Number(match[2]);
    const seat = Number(match[3]);
    return {
      ok: true,
      areaToken: match[1],
      row,
      seat,
      coordKey: buildCoordKey(row, seat),
      source: rawInput
    };
  }

  // 101-12,8 / FLOOR-A-3,12
  match = input.match(/^(.*?)[-_\/](\d{1,3}),(\d{1,3})$/i);
  if (match) {
    const row = Number(match[2]);
    const seat = Number(match[3]);
    return {
      ok: true,
      areaToken: match[1],
      row,
      seat,
      coordKey: buildCoordKey(row, seat),
      source: rawInput
    };
  }

  // A101R12S8 / FLOOR-AR3S12
  match = input.match(/^(.*?)R(\d{1,3})S(\d{1,3})$/i);
  if (match) {
    const row = Number(match[2]);
    const seat = Number(match[3]);
    return {
      ok: true,
      areaToken: match[1],
      row,
      seat,
      coordKey: buildCoordKey(row, seat),
      source: rawInput
    };
  }

  return {
    ok: false,
    error: 'Unsupported format. Use 101区12排8座 / 101-12-8 / 12,8'
  };
}

function getAreaAliases(area) {
  const aliases = [];
  if (area && area.id) aliases.push(area.id);
  if (area && area.name) aliases.push(area.name);

  const model = area && area.seatModel;
  if (model && Array.isArray(model.areaAlias)) {
    aliases.push(...model.areaAlias);
  }

  return Array.from(new Set(aliases.filter(Boolean)));
}

function resolveAreaByToken(seatMap, areaToken) {
  const normalizedInput = normalizeAreaToken(areaToken);
  if (!normalizedInput) return null;

  const areas = Array.isArray(seatMap && seatMap.areas) ? seatMap.areas : [];

  for (const area of areas) {
    const aliases = getAreaAliases(area);
    for (const alias of aliases) {
      const normalizedAlias = normalizeAreaToken(alias);
      if (!normalizedAlias) continue;
      if (normalizedAlias === normalizedInput) {
        return area;
      }
    }
  }

  // fallback: include match
  for (const area of areas) {
    const aliases = getAreaAliases(area);
    for (const alias of aliases) {
      const normalizedAlias = normalizeAreaToken(alias);
      if (!normalizedAlias) continue;
      if (
        normalizedAlias.includes(normalizedInput) ||
        normalizedInput.includes(normalizedAlias)
      ) {
        return area;
      }
    }
  }

  return null;
}

function resolveAreaById(seatMap, areaId) {
  const areas = Array.isArray(seatMap && seatMap.areas) ? seatMap.areas : [];
  if (!areaId) return null;
  return areas.find((area) => String(area && area.id) === String(areaId)) || null;
}

function getSeatsPerRow(model, row) {
  const rowStart = Number(model.rowStart || 1);
  const rowIndex = row - rowStart;
  const perRow = Array.isArray(model.perRowSeatCounts) ? model.perRowSeatCounts : [];

  if (rowIndex >= 0 && rowIndex < perRow.length && Number(perRow[rowIndex]) > 0) {
    return Number(perRow[rowIndex]);
  }

  return Number(model.defaultSeatsPerRow || 0);
}

function calcGridSeatPosition(gridModel, row, seat) {
  if (!gridModel) {
    return { ok: false, error: 'Missing grid seat model' };
  }

  const rowStart = Number(gridModel.rowStart || 1);
  const rowCount = Number(gridModel.rowCount || 0);
  const seatStart = Number(gridModel.seatStart || 1);
  const rowMax = rowStart + rowCount - 1;

  if (row < rowStart || row > rowMax) {
    return {
      ok: false,
      error: `Row out of range: ${row} (valid ${rowStart}-${rowMax})`
    };
  }

  const seatsPerRow = getSeatsPerRow(gridModel, row);
  const seatMax = seatStart + seatsPerRow - 1;
  if (seat < seatStart || seat > seatMax) {
    return {
      ok: false,
      error: `Seat out of range: ${seat} (row ${row} valid ${seatStart}-${seatMax})`
    };
  }

  const anchor = gridModel.anchor || { x: 0, y: 0 };
  const rowVector = gridModel.rowVector || { x: 0, y: 0 };
  const seatVector = gridModel.seatVector || { x: 0, y: 0 };
  const rowIndex = row - rowStart;
  const seatIndex = seat - seatStart;

  const reverse = !!gridModel.zigzagByRow && rowIndex % 2 === 1;
  const visualSeatIndex = reverse ? seatsPerRow - 1 - seatIndex : seatIndex;

  const x =
    Number(anchor.x) +
    rowIndex * Number(rowVector.x || 0) +
    visualSeatIndex * Number(seatVector.x || 0);
  const y =
    Number(anchor.y) +
    rowIndex * Number(rowVector.y || 0) +
    visualSeatIndex * Number(seatVector.y || 0);

  return {
    ok: true,
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
    row,
    seat,
    coordKey: buildCoordKey(row, seat),
    seatsPerRow
  };
}

function parseSeatKeyToCoordKey(seatKey) {
  const normalized = normalizeText(seatKey);
  if (!normalized) return '';

  // R12S8
  let match = normalized.match(/^R(\d{1,3})S(\d{1,3})$/i);
  if (match) return buildCoordKey(match[1], match[2]);

  // 12-8 / 12_8 / 12,8
  match = normalized.match(/^(\d{1,3})[-_,\/](\d{1,3})$/);
  if (match) return buildCoordKey(match[1], match[2]);

  return '';
}

function getPointCoordKey(point) {
  if (!point || typeof point !== 'object') return '';
  if (point.coordKey) {
    const parsed = parseCoordKeyText(point.coordKey);
    if (parsed.ok) return parsed.coordKey;
  }
  const fromRowSeat = buildCoordKey(point.row, point.seat);
  if (fromRowSeat) return fromRowSeat;
  if (point.seatKey) return parseSeatKeyToCoordKey(point.seatKey);
  return '';
}

function findPointSeat(pointSeats, row, seat) {
  const list = Array.isArray(pointSeats) ? pointSeats : [];
  const targetCoordKey = buildCoordKey(row, seat);

  for (const p of list) {
    if (!p) continue;
    const coordKey = getPointCoordKey(p);
    if (coordKey && coordKey === targetCoordKey) {
      return {
        ok: true,
        x: Number(Number(p.x || 0).toFixed(1)),
        y: Number(Number(p.y || 0).toFixed(1)),
        row,
        seat,
        coordKey,
        status: String(p.status || 'available'),
        from: 'point'
      };
    }
  }

  return { ok: false };
}

function getAreaCache(seatMap) {
  if (!seatMap || typeof seatMap !== 'object') return null;
  let cache = AREA_INDEX_CACHE.get(seatMap);
  if (!cache) {
    cache = {};
    AREA_INDEX_CACHE.set(seatMap, cache);
  }
  return cache;
}

function buildAreaSeatIndex(area, seatMap) {
  if (!area || !area.id) return {};

  const cache = getAreaCache(seatMap);
  const cacheKey = String(area.id);
  if (cache && cache[cacheKey]) {
    return cache[cacheKey];
  }

  const index = {};

  const pushSeat = (item) => {
    if (!item || typeof item !== 'object') return;
    const coordKey = getPointCoordKey(item);
    if (!coordKey) return;
    const x = Number(item.x);
    const y = Number(item.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    if (!index[coordKey]) {
      const parsed = parseCoordKeyText(coordKey);
      index[coordKey] = {
        coordKey,
        row: parsed.ok ? parsed.row : Number(item.row || 0),
        seat: parsed.ok ? parsed.seat : Number(item.seat || 0),
        x: Number(x.toFixed(1)),
        y: Number(y.toFixed(1)),
        status: String(item.status || 'available')
      };
    }
  };

  const seatDetail = seatMap && seatMap.seatDetail;
  if (seatDetail && seatDetail.enabled && Array.isArray(seatDetail.seats)) {
    seatDetail.seats.forEach((item) => {
      if (String(item && item.areaId) !== String(area.id)) return;
      pushSeat(item);
    });
  }

  const model = area.seatModel || {};
  if (Array.isArray(model.pointSeats)) {
    model.pointSeats.forEach(pushSeat);
  }

  if (cache) {
    cache[cacheKey] = index;
  }

  return index;
}

function locateSeatInArea(area, row, seat, seatMap) {
  const model = area && area.seatModel;
  if (!model || !model.mode) {
    return { ok: false, error: `Area ${area && area.name} has no seatModel` };
  }

  const coordKey = buildCoordKey(row, seat);
  const seatIndex = buildAreaSeatIndex(area, seatMap);
  if (coordKey && seatIndex[coordKey]) {
    const hit = seatIndex[coordKey];
    return {
      ok: true,
      x: hit.x,
      y: hit.y,
      row: hit.row,
      seat: hit.seat,
      coordKey: hit.coordKey,
      status: hit.status,
      from: 'index'
    };
  }

  if (model.mode === 'grid') {
    return calcGridSeatPosition(model, row, seat);
  }

  if (model.mode === 'hybrid') {
    const pointHit = findPointSeat(model.pointSeats, row, seat);
    if (pointHit.ok) return pointHit;
    return calcGridSeatPosition(model.rule || {}, row, seat);
  }

  if (model.mode === 'custom_points') {
    const pointHit = findPointSeat(model.pointSeats, row, seat);
    if (pointHit.ok) return pointHit;
    return {
      ok: false,
      error: `Area ${area.name} cannot find seat ${row},${seat}`
    };
  }

  return { ok: false, error: `Unsupported seatModel.mode: ${model.mode}` };
}

function locateSeat(seatMap, seatInput, options = {}) {
  const parsed = parseSeatInput(seatInput);
  if (!parsed.ok) return parsed;

  const areas = Array.isArray(seatMap && seatMap.areas) ? seatMap.areas : [];
  let area = null;
  if (parsed.areaToken) {
    area = resolveAreaByToken(seatMap, parsed.areaToken);
  } else if (options.defaultAreaId) {
    area = resolveAreaById(seatMap, options.defaultAreaId);
  } else if (areas.length === 1) {
    area = areas[0];
  }

  if (!area) {
    return {
      ok: false,
      error: parsed.areaToken
        ? `Area not found: ${parsed.areaToken}`
        : 'Please provide area token, or select area first then input row/seat',
      parsed
    };
  }

  const pos = locateSeatInArea(area, parsed.row, parsed.seat, seatMap);
  if (!pos.ok) {
    return {
      ok: false,
      error: pos.error,
      parsed,
      areaId: area.id,
      areaName: area.name
    };
  }

  return {
    ok: true,
    parsed,
    areaId: area.id,
    areaName: area.name,
    x: pos.x,
    y: pos.y,
    row: Number(pos.row || parsed.row),
    seat: Number(pos.seat || parsed.seat),
    coordKey: pos.coordKey || parsed.coordKey || buildCoordKey(parsed.row, parsed.seat),
    status: pos.status || 'available',
    rawInput: seatInput
  };
}

function toUserDot(locateResult, options = {}) {
  if (!locateResult || !locateResult.ok) return null;

  return {
    id: options.id || `seat-${locateResult.areaId}-${locateResult.coordKey || `${locateResult.row}-${locateResult.seat}`}`,
    x: locateResult.x,
    y: locateResult.y,
    r: options.r || 5,
    color: options.color || '#ff4f6a',
    isMe: options.isMe !== false
  };
}

module.exports = {
  parseSeatInput,
  parseCoordKeyText,
  resolveAreaByToken,
  buildCoordKey,
  locateSeat,
  toUserDot
};
