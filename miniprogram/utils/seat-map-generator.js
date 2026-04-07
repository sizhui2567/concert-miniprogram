// utils/seat-map-generator.js
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
  overlayOpacity: 0.42
};

const SEAT_MAP_PRESETS = [
  {
    key: 'arena_end',
    name: '体育馆端舞台',
    description: '适合常见室内体育馆端舞台演出',
    options: {
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
    }
  },
  {
    key: 'arena_center',
    name: '体育馆中央舞台',
    description: '适合四面台或中央舞台形式',
    options: {
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
    }
  },
  {
    key: 'stadium_end',
    name: '体育场端舞台',
    description: '适合室外体育场大体量演出',
    options: {
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
    }
  },
  {
    key: 'theater_fan',
    name: '剧院扇形',
    description: '适合剧院、音乐厅等扇形看台',
    options: {
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
  }
];

const PRESET_MAP = SEAT_MAP_PRESETS.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toFixedPoint(value) {
  return Number(value.toFixed(1));
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

function getAreaType(ringIndex) {
  if (ringIndex === 0) return 'vip';
  if (ringIndex === 1) return 'premium';
  return 'standard';
}

function getAreaPrice(ringIndex, options) {
  return options.priceTiers[ringIndex] || options.priceTiers[options.priceTiers.length - 1] || 380;
}

function getSectionLabel(ringIndex, sectorIndex) {
  const sectionNumber = ringIndex * 100 + sectorIndex + 1;
  return `${sectionNumber}`;
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

  return {
    id,
    name: label,
    type: areaType,
    shapeType: 'polygon',
    points: buildPolygonPoints([p1, p2, p3, p4]),
    labelX: labelPoint.x,
    labelY: labelPoint.y,
    price,
    rowCount: 6 + ringIndex * 4,
    seatCount: 32 + ringIndex * 12,
    bubblePrice: showBubble ? price : null,
    bubblePosition: showBubble ? { x: bubblePoint.x, y: bubblePoint.y } : null,
    disabled: false,
    users: []
  };
}

function resolveSeatMapOptions(customOptions = {}) {
  const presetKey = customOptions.presetKey || DEFAULT_OPTIONS.presetKey;
  const preset = PRESET_MAP[presetKey];

  return {
    ...DEFAULT_OPTIONS,
    ...(preset ? preset.options : {}),
    ...(customOptions || {}),
    presetKey
  };
}

function buildSeatMapFromImage(imageInfo, customOptions = {}) {
  const options = resolveSeatMapOptions(customOptions);

  const width = Math.max(240, imageInfo.width || 620);
  const height = Math.max(240, imageInfo.height || 570);
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
      areas.push(
        createArea({
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
        })
      );
    }
  }

  return {
    version: 'auto-v2',
    generatedAt: new Date().toISOString(),
    sourceImage: imageInfo.fileID || imageInfo.path || '',
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
    areas,
    options
  };
}

function parsePoints(points) {
  if (!points || typeof points !== 'string') return [];
  return points
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
  if (!points.length) {
    return null;
  }

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

function validateSeatMapQuality(seatMap, customOptions = {}) {
  const options = resolveSeatMapOptions(customOptions || seatMap?.options || {});

  const warnings = [];
  const fatals = [];
  const areas = Array.isArray(seatMap?.areas) ? seatMap.areas : [];
  const width = Number(seatMap?.width || 0);
  const height = Number(seatMap?.height || 0);

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

    const x = Number(area?.labelX);
    const y = Number(area?.labelY);
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

  const stage = seatMap?.stage || {};
  const boundary = seatMap?.boundary || {};
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
      if (ratio > 0.42) {
        overlapHighCount += 1;
      }
    }
    if (checked > maxPairChecks) break;
  }
  if (overlapHighCount > 0) {
    warnings.push(`检测到 ${overlapHighCount} 处分区包围框重叠较高`);
    score -= Math.min(18, overlapHighCount * 2);
  }

  const ringPrice = {};
  areas.forEach((area) => {
    const match = /^r(\d+)s\d+$/.exec(String(area.id || ''));
    if (!match) return;
    const ring = Number(match[1]);
    if (!ringPrice[ring]) ringPrice[ring] = [];
    ringPrice[ring].push(Number(area.price || 0));
  });

  const ringAvg = Object.keys(ringPrice)
    .map((k) => Number(k))
    .sort((a, b) => a - b)
    .map((ring) => {
      const arr = ringPrice[ring].filter((x) => Number.isFinite(x) && x > 0);
      const sum = arr.reduce((acc, x) => acc + x, 0);
      return arr.length ? sum / arr.length : 0;
    });

  let priceOrderIssues = 0;
  for (let i = 1; i < ringAvg.length; i += 1) {
    if (ringAvg[i] > ringAvg[i - 1]) {
      priceOrderIssues += 1;
    }
  }
  if (priceOrderIssues > 0) {
    warnings.push('票价层级存在反向升高，建议检查价格分层');
    score -= Math.min(12, priceOrderIssues * 4);
  }

  score = clamp(Math.round(score), 0, 100);
  const ok = fatals.length === 0 && score >= 72;

  return {
    ok,
    score,
    warnings,
    fatals,
    metrics: {
      areaCount: areas.length,
      expectedAreaCount,
      invalidShapeCount,
      labelOutCount,
      overlapHighCount,
      priceOrderIssues
    }
  };
}

function generateSeatMapWithGuard(imageInfo, customOptions = {}) {
  const options = resolveSeatMapOptions(customOptions);
  const seatMap = buildSeatMapFromImage(imageInfo, options);
  const quality = validateSeatMapQuality(seatMap, options);

  if (quality.ok) {
    return {
      seatMap,
      quality,
      usedFallback: false,
      finalOptions: options
    };
  }

  const fallbackKey = options.fallbackPresetKey || 'arena_end';
  const fallbackOptions = resolveSeatMapOptions({
    ...customOptions,
    presetKey: fallbackKey
  });

  const fallbackMap = buildSeatMapFromImage(imageInfo, fallbackOptions);
  const fallbackQuality = validateSeatMapQuality(fallbackMap, fallbackOptions);

  return {
    seatMap: fallbackMap,
    quality: fallbackQuality,
    usedFallback: true,
    fallbackPresetKey: fallbackKey,
    originalQuality: quality,
    finalOptions: fallbackOptions
  };
}

module.exports = {
  DEFAULT_OPTIONS,
  SEAT_MAP_PRESETS,
  resolveSeatMapOptions,
  buildSeatMapFromImage,
  validateSeatMapQuality,
  generateSeatMapWithGuard
};
