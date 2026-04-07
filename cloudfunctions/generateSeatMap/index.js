const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const DEFAULT_OPTIONS = {
  presetKey: 'arena_end',
  ringCount: 4,
  sectorCount: 24,
  startAngle: -160,
  endAngle: 160,
  ringGapRatio: 0.014,
  angleGapDegree: 1.2,
  stageCenterYRatio: 0.57,
  stageRxRatio: 0.1,
  stageRyRatio: 0.075,
  boundaryRxRatio: 0.47,
  boundaryRyRatio: 0.43,
  priceTiers: [1680, 1280, 880, 680, 580, 480, 380],
  overlayOpacity: 0.42,
  fallbackPresetKey: 'arena_end'
};

const PRESETS = {
  arena_end: {
    ringCount: 4,
    sectorCount: 24,
    startAngle: -160,
    endAngle: 160,
    stageCenterYRatio: 0.57,
    stageRxRatio: 0.1,
    stageRyRatio: 0.075,
    boundaryRxRatio: 0.47,
    boundaryRyRatio: 0.43,
    priceTiers: [1680, 1280, 880, 680, 580, 480, 380]
  },
  arena_center: {
    ringCount: 5,
    sectorCount: 28,
    startAngle: -178,
    endAngle: 178,
    stageCenterYRatio: 0.5,
    stageRxRatio: 0.085,
    stageRyRatio: 0.065,
    boundaryRxRatio: 0.47,
    boundaryRyRatio: 0.45,
    priceTiers: [1980, 1580, 1280, 980, 780, 580]
  },
  stadium_end: {
    ringCount: 6,
    sectorCount: 32,
    startAngle: -165,
    endAngle: 165,
    stageCenterYRatio: 0.62,
    stageRxRatio: 0.09,
    stageRyRatio: 0.06,
    boundaryRxRatio: 0.48,
    boundaryRyRatio: 0.42,
    priceTiers: [2380, 1880, 1380, 980, 680, 480]
  },
  theater_fan: {
    ringCount: 3,
    sectorCount: 18,
    startAngle: -140,
    endAngle: 140,
    stageCenterYRatio: 0.68,
    stageRxRatio: 0.14,
    stageRyRatio: 0.08,
    boundaryRxRatio: 0.44,
    boundaryRyRatio: 0.36,
    priceTiers: [1280, 980, 680, 480]
  }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toFixedPoint(value) {
  return Number(Number(value || 0).toFixed(1));
}

function toPolarPoint(cx, cy, rx, ry, angle) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: toFixedPoint(cx + rx * Math.cos(rad)),
    y: toFixedPoint(cy + ry * Math.sin(rad))
  };
}

function buildPolygonPoints(points) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function resolveOptions(customOptions = {}) {
  const presetKey = customOptions.presetKey || DEFAULT_OPTIONS.presetKey;
  const preset = PRESETS[presetKey] || {};
  return {
    ...DEFAULT_OPTIONS,
    ...preset,
    ...(customOptions || {}),
    presetKey
  };
}

function getAreaType(ringIndex) {
  if (ringIndex === 0) return 'vip';
  if (ringIndex === 1) return 'premium';
  return 'standard';
}

function getLevelId(ringIndex) {
  if (ringIndex === 0) return 'floor';
  if (ringIndex <= 2) return 'stand_low';
  return 'stand_high';
}

function getFillColor(ringIndex) {
  const palette = ['#b88f3d', '#9b6bff', '#6a7890', '#4f607a', '#3e4a5d', '#2f3b4f'];
  return palette[Math.min(ringIndex, palette.length - 1)];
}

function getSectionLabel(ringIndex, sectorIndex) {
  const sectionNumber = ringIndex * 100 + sectorIndex + 1;
  return `${sectionNumber}`;
}

function getAreaPrice(ringIndex, options) {
  return options.priceTiers[ringIndex] || options.priceTiers[options.priceTiers.length - 1] || 380;
}

function calcGridSeatPoint(model, row, seat) {
  const rowStart = Number(model.rowStart || 1);
  const seatStart = Number(model.seatStart || 1);
  const rowIndex = row - rowStart;
  const seatIndex = seat - seatStart;
  const anchor = model.anchor || { x: 0, y: 0 };
  const rowVector = model.rowVector || { x: 0, y: 0 };
  const seatVector = model.seatVector || { x: 0, y: 0 };
  return {
    x: toFixedPoint(Number(anchor.x || 0) + rowIndex * Number(rowVector.x || 0) + seatIndex * Number(seatVector.x || 0)),
    y: toFixedPoint(Number(anchor.y || 0) + rowIndex * Number(rowVector.y || 0) + seatIndex * Number(seatVector.y || 0))
  };
}

function buildCoordKey(row, seat) {
  const rowNum = Number(row);
  const seatNum = Number(seat);
  if (!Number.isFinite(rowNum) || !Number.isFinite(seatNum)) {
    return '';
  }
  return `${rowNum},${seatNum}`;
}

function buildSeatDetail(areas, maxPoints = 6000) {
  const seats = [];
  for (let i = 0; i < areas.length; i += 1) {
    const area = areas[i] || {};
    const model = area.seatModel;
    if (!model || model.mode !== 'grid') continue;
    const rowStart = Number(model.rowStart || 1);
    const rowCount = Number(model.rowCount || 0);
    const seatStart = Number(model.seatStart || 1);
    const perRow = Number(model.defaultSeatsPerRow || 0);
    if (!rowCount || !perRow) continue;
    for (let r = rowStart; r < rowStart + rowCount; r += 1) {
      for (let s = seatStart; s < seatStart + perRow; s += 1) {
        if (seats.length >= maxPoints) {
          return { enabled: true, lodZoomThreshold: 2.4, truncated: true, seats };
        }
        const point = calcGridSeatPoint(model, r, s);
        const hash = `${area.id}-${r}-${s}`.split('').reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) % 9973, 7);
        const status = hash % 11 === 0 ? 'blocked' : (hash % 5 === 0 ? 'sold' : 'available');
        seats.push({
          id: `${area.id}-R${r}-S${s}`,
          areaId: area.id,
          row: r,
          seat: s,
          coordKey: buildCoordKey(r, s),
          seatKey: `R${r}S${s}`,
          x: point.x,
          y: point.y,
          status
        });
      }
    }
  }
  return { enabled: true, lodZoomThreshold: 2.4, truncated: false, seats };
}

function createArea({
  ringIndex,
  sectorIndex,
  sectorCount,
  startAngle,
  stepAngle,
  angleGap,
  innerRx,
  innerRy,
  outerRx,
  outerRy,
  centerX,
  centerY,
  options
}) {
  const a1 = startAngle + sectorIndex * stepAngle + angleGap / 2;
  const a2 = startAngle + (sectorIndex + 1) * stepAngle - angleGap / 2;
  const p1 = toPolarPoint(centerX, centerY, innerRx, innerRy, a1);
  const p2 = toPolarPoint(centerX, centerY, innerRx, innerRy, a2);
  const p3 = toPolarPoint(centerX, centerY, outerRx, outerRy, a2);
  const p4 = toPolarPoint(centerX, centerY, outerRx, outerRy, a1);

  const midAngle = (a1 + a2) / 2;
  const labelRx = (innerRx + outerRx) / 2;
  const labelRy = (innerRy + outerRy) / 2;
  const labelPoint = toPolarPoint(centerX, centerY, labelRx, labelRy, midAngle);
  const bubblePoint = toPolarPoint(centerX, centerY, labelRx, labelRy, midAngle - 3);

  const id = `r${ringIndex + 1}s${sectorIndex + 1}`;
  const label = getSectionLabel(ringIndex, sectorIndex);
  const price = getAreaPrice(ringIndex, options);
  const areaType = getAreaType(ringIndex);
  const bubbleStep = Math.max(3, Math.floor(sectorCount / 6));
  const showBubble = ringIndex <= 2 && sectorIndex % bubbleStep === 0;
  const rowCount = 6 + ringIndex * 4;
  const seatCount = 32 + ringIndex * 12;
  const seatsPerRow = Math.max(10, Math.floor(seatCount / Math.max(1, rowCount)));

  const theta = (midAngle * Math.PI) / 180;
  const radialX = Math.cos(theta);
  const radialY = Math.sin(theta);
  const tangentX = -Math.sin(theta);
  const tangentY = Math.cos(theta);
  const rowSpan = Math.max(1, outerRx - innerRx);
  const seatSpan = Math.max(1, (stepAngle / 180) * Math.PI * Math.max(outerRx, 1));
  const rowStep = clamp(rowSpan / Math.max(1, rowCount), 2, 8);
  const seatStep = clamp(seatSpan / Math.max(6, seatsPerRow), 1.6, 4.5);
  const anchorX = labelPoint.x - (rowCount / 2) * rowStep * radialX - (seatsPerRow / 2) * seatStep * tangentX;
  const anchorY = labelPoint.y - (rowCount / 2) * rowStep * radialY - (seatsPerRow / 2) * seatStep * tangentY;

  return {
    id,
    name: label,
    levelId: getLevelId(ringIndex),
    type: areaType,
    shapeType: 'polygon',
    points: buildPolygonPoints([p1, p2, p3, p4]),
    labelX: labelPoint.x,
    labelY: labelPoint.y,
    price,
    fillColor: getFillColor(ringIndex),
    rowCount,
    seatCount,
    seatModel: {
      mode: 'grid',
      rowStart: 1,
      rowCount,
      seatStart: 1,
      defaultSeatsPerRow: seatsPerRow,
      anchor: { x: toFixedPoint(anchorX), y: toFixedPoint(anchorY) },
      rowVector: { x: toFixedPoint(rowStep * radialX), y: toFixedPoint(rowStep * radialY) },
      seatVector: { x: toFixedPoint(seatStep * tangentX), y: toFixedPoint(seatStep * tangentY) },
      zigzagByRow: false,
      areaAlias: [label, `${label}区`, id]
    },
    bubblePrice: showBubble ? price : null,
    bubblePosition: showBubble ? { x: bubblePoint.x, y: bubblePoint.y } : null,
    disabled: false,
    users: []
  };
}

function buildSeatMap(imageInfo, customOptions = {}) {
  const options = resolveOptions(customOptions);
  const width = Math.max(240, Number(imageInfo.width || 620));
  const height = Math.max(240, Number(imageInfo.height || 570));
  const ringCount = clamp(Number(options.ringCount) || 4, 2, 8);
  const sectorCount = clamp(Number(options.sectorCount) || 24, 8, 64);
  const startAngle = Number(options.startAngle) || -160;
  const endAngle = Number(options.endAngle) || 160;
  const totalAngle = clamp(endAngle - startAngle, 120, 355);

  const centerX = width / 2;
  const centerY = height * clamp(options.stageCenterYRatio || 0.57, 0.35, 0.8);
  const stageRx = width * clamp(options.stageRxRatio || 0.1, 0.05, 0.24);
  const stageRy = height * clamp(options.stageRyRatio || 0.075, 0.04, 0.2);
  const boundaryRx = width * clamp(options.boundaryRxRatio || 0.47, 0.2, 0.5);
  const boundaryRy = height * clamp(options.boundaryRyRatio || 0.43, 0.2, 0.48);
  const innerStartRatio = 0.22;
  const ringRangeRatio = 0.73;
  const ringGapRatio = clamp(options.ringGapRatio || 0.014, 0, 0.05);
  const ringWidthRatio = ringRangeRatio / ringCount;
  const stepAngle = totalAngle / sectorCount;
  const angleGap = clamp(options.angleGapDegree || 1.2, 0, 5);

  const areas = [];
  for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
    const ringInnerRatio = innerStartRatio + ringWidthRatio * ringIndex;
    const ringOuterRatio = innerStartRatio + ringWidthRatio * (ringIndex + 1) - ringGapRatio;
    const innerRx = boundaryRx * ringInnerRatio;
    const innerRy = boundaryRy * ringInnerRatio;
    const outerRx = boundaryRx * ringOuterRatio;
    const outerRy = boundaryRy * ringOuterRatio;

    for (let sectorIndex = 0; sectorIndex < sectorCount; sectorIndex += 1) {
      areas.push(createArea({
        ringIndex,
        sectorIndex,
        sectorCount,
        startAngle,
        stepAngle,
        angleGap,
        innerRx,
        innerRy,
        outerRx,
        outerRy,
        centerX,
        centerY,
        options
      }));
    }
  }

  return {
    version: 'seat-map-v2',
    generatedAt: new Date().toISOString(),
    sourceImage: imageInfo.sourceImage || '',
    overlayOpacity: clamp(options.overlayOpacity, 0.08, 1),
    width,
    height,
    viewBox: `0 0 ${toFixedPoint(width)} ${toFixedPoint(height)}`,
    stage: {
      cx: toFixedPoint(centerX),
      cy: toFixedPoint(centerY),
      rx: toFixedPoint(stageRx),
      ry: toFixedPoint(stageRy),
      label: '舞台'
    },
    boundary: {
      cx: toFixedPoint(centerX),
      cy: toFixedPoint(centerY),
      rx: toFixedPoint(boundaryRx),
      ry: toFixedPoint(boundaryRy)
    },
    levels: [
      { id: 'all', name: '全场', default: true },
      { id: 'stand_high', name: '高看台' },
      { id: 'stand_low', name: '低看台' },
      { id: 'floor', name: '内场' }
    ],
    areas,
    seatDetail: buildSeatDetail(areas),
    options
  };
}

function parsePoints(points) {
  return String(points || '')
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(','))
    .filter((arr) => arr.length === 2)
    .map(([x, y]) => ({ x: Number(x), y: Number(y) }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

function areaBBox(area) {
  if (!area) return null;
  if (area.shapeType === 'rect') {
    const x = Number(area.x || 0);
    const y = Number(area.y || 0);
    const w = Number(area.width || 0);
    const h = Number(area.height || 0);
    return { minX: x, minY: y, maxX: x + w, maxY: y + h };
  }
  const points = parsePoints(area.points);
  if (!points.length) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };
}

function bboxOverlapRatio(a, b) {
  if (!a || !b) return 0;
  const x1 = Math.max(a.minX, b.minX);
  const y1 = Math.max(a.minY, b.minY);
  const x2 = Math.min(a.maxX, b.maxX);
  const y2 = Math.min(a.maxY, b.maxY);
  const w = x2 - x1;
  const h = y2 - y1;
  if (w <= 0 || h <= 0) return 0;
  const overlap = w * h;
  const areaA = Math.max(1, (a.maxX - a.minX) * (a.maxY - a.minY));
  const areaB = Math.max(1, (b.maxX - b.minX) * (b.maxY - b.minY));
  return overlap / Math.min(areaA, areaB);
}

function validateSeatMapQuality(seatMap, customOptions = {}, minScore = 72) {
  const options = resolveOptions(customOptions || seatMap.options || {});
  const scoreLine = clamp(Number(minScore || 72), 60, 95);
  const warnings = [];
  const fatals = [];
  const areas = Array.isArray(seatMap && seatMap.areas) ? seatMap.areas : [];
  const width = Number((seatMap && seatMap.width) || 0);
  const height = Number((seatMap && seatMap.height) || 0);
  let score = 100;

  if (!width || !height || width < 240 || height < 240) {
    fatals.push('底图尺寸异常');
    score -= 35;
  }

  const expectedAreaCount = Number(options.ringCount) * Number(options.sectorCount);
  if (!areas.length) {
    fatals.push('未生成有效分区');
    score -= 45;
  } else {
    const ratio = areas.length / Math.max(1, expectedAreaCount);
    if (ratio < 0.75) {
      warnings.push('分区数量明显少于预期');
      score -= 15;
    }
  }

  let invalidShapeCount = 0;
  let labelOutCount = 0;
  const bboxes = [];
  areas.forEach((area) => {
    if (!area || (!area.points && area.shapeType !== 'rect')) {
      invalidShapeCount += 1;
    }
    const x = Number(area && area.labelX);
    const y = Number(area && area.labelY);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > width || y < 0 || y > height) {
      labelOutCount += 1;
    }
    bboxes.push(areaBBox(area));
  });

  if (invalidShapeCount > 0) {
    fatals.push(`存在 ${invalidShapeCount} 个无效分区形状`);
    score -= Math.min(35, invalidShapeCount * 4);
  }

  if (labelOutCount > 0) {
    warnings.push(`存在 ${labelOutCount} 个分区标签超出可视范围`);
    score -= Math.min(20, labelOutCount * 2);
  }

  const stage = (seatMap && seatMap.stage) || {};
  const boundary = (seatMap && seatMap.boundary) || {};
  const stageOutside =
    Number(stage.cx || 0) - Number(stage.rx || 0) < Number(boundary.cx || 0) - Number(boundary.rx || 0) ||
    Number(stage.cx || 0) + Number(stage.rx || 0) > Number(boundary.cx || 0) + Number(boundary.rx || 0) ||
    Number(stage.cy || 0) - Number(stage.ry || 0) < Number(boundary.cy || 0) - Number(boundary.ry || 0) ||
    Number(stage.cy || 0) + Number(stage.ry || 0) > Number(boundary.cy || 0) + Number(boundary.ry || 0);

  if (stageOutside) {
    fatals.push('舞台区域超出了看台边界');
    score -= 25;
  }

  let overlapHighCount = 0;
  const maxPairChecks = Math.min(420, areas.length * areas.length);
  let checked = 0;
  for (let i = 0; i < bboxes.length; i += 1) {
    for (let j = i + 1; j < bboxes.length; j += 1) {
      if (checked > maxPairChecks) break;
      checked += 1;
      const ratio = bboxOverlapRatio(bboxes[i], bboxes[j]);
      if (ratio > 0.42) overlapHighCount += 1;
    }
    if (checked > maxPairChecks) break;
  }
  if (overlapHighCount > 0) {
    warnings.push(`检测到 ${overlapHighCount} 处分区包围框重叠较高`);
    score -= Math.min(18, overlapHighCount * 2);
  }

  score = clamp(Math.round(score), 0, 100);
  const ok = fatals.length === 0 && score >= scoreLine;

  return {
    ok,
    score,
    warnings,
    fatals,
    minScore: scoreLine,
    metrics: {
      areaCount: areas.length,
      expectedAreaCount,
      invalidShapeCount,
      labelOutCount,
      overlapHighCount
    }
  };
}

function generateWithGuard(imageInfo, customOptions = {}, minScore = 72) {
  const options = resolveOptions(customOptions);
  const seatMap = buildSeatMap(imageInfo, options);
  const quality = validateSeatMapQuality(seatMap, options, minScore);
  if (quality.ok) {
    return {
      seatMap,
      quality,
      usedFallback: false,
      finalOptions: options,
      fallbackPresetKey: ''
    };
  }

  const fallbackKey = options.fallbackPresetKey || 'arena_end';
  const fallbackOptions = resolveOptions({
    ...customOptions,
    presetKey: fallbackKey
  });
  const fallbackMap = buildSeatMap(imageInfo, fallbackOptions);
  const fallbackQuality = validateSeatMapQuality(fallbackMap, fallbackOptions, minScore);
  return {
    seatMap: fallbackMap,
    quality: fallbackQuality,
    usedFallback: true,
    fallbackPresetKey: fallbackKey,
    originalQuality: quality,
    finalOptions: fallbackOptions
  };
}

async function isAdmin(openid) {
  if (!openid) return false;
  const adminRes = await db.collection('admins').where({ openid }).limit(1).get();
  return adminRes.data.length > 0;
}

exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext();
    const admin = await isAdmin(OPENID);
    if (!admin) {
      return { code: -1, message: '无权限操作' };
    }

    const imageInfo = event.imageInfo || {};
    const sourceImage = String(event.sourceImage || imageInfo.sourceImage || '');
    const width = Number(imageInfo.width || event.width || 620);
    const height = Number(imageInfo.height || event.height || 570);
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return { code: -1, message: '缺少有效图片尺寸（width/height）' };
    }

    const options = resolveOptions(event.options || {});
    const minScore = clamp(Number(event.minScore || 72), 60, 95);
    const result = generateWithGuard({
      width,
      height,
      sourceImage
    }, options, minScore);

    result.seatMap.qualityReport = result.quality;
    result.seatMap.finalOptions = result.finalOptions;

    return {
      code: 0,
      data: {
        seatMap: result.seatMap,
        quality: result.quality,
        usedFallback: !!result.usedFallback,
        fallbackPresetKey: result.fallbackPresetKey || '',
        originalQuality: result.originalQuality || null,
        finalOptions: result.finalOptions
      }
    };
  } catch (err) {
    console.error('generateSeatMap error:', err);
    return {
      code: -1,
      message: err.message || '生成座位图失败'
    };
  }
};
