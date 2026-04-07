// utils/seat-locator.js
// 座位输入解析 + 座位坐标定位模板

function normalizeText(input) {
  return String(input || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[（(]/g, '(')
    .replace(/[）)]/g, ')')
    .toUpperCase();
}

function normalizeAreaToken(area) {
  return normalizeText(area)
    .replace(/区$/i, '')
    .replace(/^看台/i, '')
    .replace(/^内场/i, '内场')
    .replace(/^FLOOR[-_]?/i, 'FLOOR-');
}

function parseSeatInput(rawInput) {
  const input = normalizeText(rawInput);
  if (!input) {
    return { ok: false, error: '座位输入为空' };
  }

  // 例：101区12排8座 / 内场A区3排12 / FLOOR-A3排12
  let match = input.match(/^(.*?)(\d{1,3})排(\d{1,3})(?:座|号)?$/i);
  if (match) {
    return {
      ok: true,
      areaToken: match[1],
      row: Number(match[2]),
      seat: Number(match[3]),
      source: rawInput
    };
  }

  // 例：101-12-8 / FLOOR-A-3-12 / 内场A区_3_12
  match = input.match(/^(.*?)[-_\/](\d{1,3})[-_\/](\d{1,3})$/i);
  if (match) {
    return {
      ok: true,
      areaToken: match[1],
      row: Number(match[2]),
      seat: Number(match[3]),
      source: rawInput
    };
  }

  // 例：A101R12S8 / FLOOR-AR3S12
  match = input.match(/^(.*?)R(\d{1,3})S(\d{1,3})$/i);
  if (match) {
    return {
      ok: true,
      areaToken: match[1],
      row: Number(match[2]),
      seat: Number(match[3]),
      source: rawInput
    };
  }

  return {
    ok: false,
    error: '格式不支持，请用 101区12排8座 或 101-12-8'
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

  // 兜底：包含匹配
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
    return { ok: false, error: '缺少网格座位模型' };
  }

  const rowStart = Number(gridModel.rowStart || 1);
  const rowCount = Number(gridModel.rowCount || 0);
  const seatStart = Number(gridModel.seatStart || 1);
  const rowMax = rowStart + rowCount - 1;

  if (row < rowStart || row > rowMax) {
    return {
      ok: false,
      error: `排号超出范围：${row}（可用 ${rowStart}-${rowMax}）`
    };
  }

  const seatsPerRow = getSeatsPerRow(gridModel, row);
  const seatMax = seatStart + seatsPerRow - 1;
  if (seat < seatStart || seat > seatMax) {
    return {
      ok: false,
      error: `座号超出范围：${seat}（第 ${row} 排可用 ${seatStart}-${seatMax}）`
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
    seatsPerRow
  };
}

function findPointSeat(pointSeats, row, seat) {
  const list = Array.isArray(pointSeats) ? pointSeats : [];
  const key = `${row}-${seat}`;

  for (const p of list) {
    if (!p) continue;
    if (String(p.seatKey || '').toUpperCase() === key.toUpperCase()) {
      return {
        ok: true,
        x: Number(Number(p.x || 0).toFixed(1)),
        y: Number(Number(p.y || 0).toFixed(1)),
        row,
        seat,
        from: 'point'
      };
    }
  }

  return { ok: false };
}

function locateSeatInArea(area, row, seat) {
  const model = area && area.seatModel;
  if (!model || !model.mode) {
    return { ok: false, error: `区域 ${area && area.name} 未配置 seatModel` };
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
      error: `区域 ${area.name} 未找到 ${row}排${seat}座`
    };
  }

  return { ok: false, error: `不支持的 seatModel.mode: ${model.mode}` };
}

function locateSeat(seatMap, seatInput) {
  const parsed = parseSeatInput(seatInput);
  if (!parsed.ok) {
    return parsed;
  }

  const area = resolveAreaByToken(seatMap, parsed.areaToken);
  if (!area) {
    return {
      ok: false,
      error: `未匹配到区域：${parsed.areaToken}`,
      parsed
    };
  }

  const pos = locateSeatInArea(area, parsed.row, parsed.seat);
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
    row: parsed.row,
    seat: parsed.seat,
    rawInput: seatInput
  };
}

function toUserDot(locateResult, options = {}) {
  if (!locateResult || !locateResult.ok) return null;

  return {
    id: options.id || `seat-${locateResult.areaId}-${locateResult.row}-${locateResult.seat}`,
    x: locateResult.x,
    y: locateResult.y,
    r: options.r || 5,
    color: options.color || '#ff4f6a',
    isMe: options.isMe !== false
  };
}

module.exports = {
  parseSeatInput,
  resolveAreaByToken,
  locateSeat,
  toUserDot
};
