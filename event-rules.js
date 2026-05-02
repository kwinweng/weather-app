(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.WeatherEventRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  const RISK_META = {
    normal: { label: '正常', rank: 0, tone: 'normal' },
    mild: { label: '轻度关注', rank: 1, tone: 'mild' },
    moderate: { label: '中度风险', rank: 2, tone: 'moderate' },
    high: { label: '高风险', rank: 3, tone: 'high' },
    extreme: { label: '极端风险', rank: 4, tone: 'extreme' },
  };

  const WEATHER_DESC = {
    0: '晴朗',
    1: '晴间多云',
    2: '多云',
    3: '阴天',
    45: '雾',
    48: '雾凇',
    51: '毛毛雨',
    53: '小雨',
    55: '中雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    80: '阵雨',
    81: '强阵雨',
    82: '暴雨',
    95: '雷雨',
    96: '雷暴',
    99: '强雷暴',
  };

  const WEATHER_ICON = {
    0: '☀️',
    1: '🌤️',
    2: '⛅',
    3: '☁️',
    45: '🌫️',
    48: '🌫️',
    51: '🌦️',
    53: '🌦️',
    55: '🌧️',
    61: '🌧️',
    63: '🌧️',
    65: '🌧️',
    71: '🌨️',
    73: '🌨️',
    75: '🌨️',
    80: '🌦️',
    81: '🌧️',
    82: '⛈️',
    95: '⛈️',
    96: '⛈️',
    99: '⛈️',
  };

  const EVENT_META = {
    rain: { title: '降雨增强', metric: '降水', unit: '' },
    thunder: { title: '雷暴事件', metric: '天气现象', unit: '' },
    wind: { title: '大风增强', metric: '风速', unit: 'km/h' },
    heat: { title: '高温事件', metric: '温度', unit: '°C' },
    cold: { title: '低温事件', metric: '温度', unit: '°C' },
    fog: { title: '低能见度', metric: '天气现象', unit: '' },
    snow: { title: '降雪事件', metric: '天气现象', unit: '' },
  };

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function toDate(value) {
    return value instanceof Date ? value : new Date(value);
  }

  function getLocalDateKey(value) {
    const date = toDate(value);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function getHourLabel(value) {
    return `${pad(toDate(value).getHours())}:00`;
  }

  function getShortDateLabel(value) {
    const date = toDate(value);
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
  }

  function getTimeRangeLabel(start, end) {
    if (getLocalDateKey(start) === getLocalDateKey(end)) {
      return `${getHourLabel(start)} - ${getHourLabel(end)}`;
    }
    return `${getShortDateLabel(start)} ${getHourLabel(start)} - ${getShortDateLabel(end)} ${getHourLabel(end)}`;
  }

  function getDetailRangeLabel(start, end) {
    if (getLocalDateKey(start) === getLocalDateKey(end)) {
      return `${getShortDateLabel(start)} ${getHourLabel(start)} - ${getHourLabel(end)}`;
    }
    return getTimeRangeLabel(start, end);
  }

  function getWeatherDesc(code) {
    return WEATHER_DESC[code] || '多云';
  }

  function getWeatherIcon(code) {
    return WEATHER_ICON[code] || '☁️';
  }

  function getWeatherSkin(code) {
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'rain';
    if ([95, 96, 99].includes(code)) return 'storm';
    if ([71, 73, 75].includes(code)) return 'snow';
    if ([45, 48].includes(code)) return 'fog';
    if ([0, 1].includes(code)) return 'sunny';
    return 'cloudy';
  }

  function maxRisk(a, b) {
    return RISK_META[a].rank >= RISK_META[b].rank ? a : b;
  }

  function hasObservedPrecipitation(hour) {
    return hour.precipitation !== undefined && hour.precipitation !== null && Number.isFinite(Number(hour.precipitation));
  }

  function getPrecipitation(hour) {
    return Number(hour.precipitation || 0);
  }

  function formatMm(value) {
    const rounded = Math.round(Number(value || 0) * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded.toFixed(0)}mm` : `${rounded.toFixed(1)}mm`;
  }

  function shouldUseObservedRain(hour, now) {
    return hasObservedPrecipitation(hour) && toDate(hour.time) < now;
  }

  function classifyHourRisk(hour, now = new Date()) {
    let risk = 'normal';
    const reasons = [];
    const code = Number(hour.code);
    const rainProb = Number(hour.rainProb || 0);
    const precipitation = getPrecipitation(hour);
    const wind = Number(hour.wind || 0);
    const temp = Number(hour.temp || 0);

    if ([95, 96, 99].includes(code)) {
      risk = maxRisk(risk, code === 99 ? 'extreme' : 'high');
      reasons.push(`${getWeatherDesc(code)}天气`);
    }

    if (shouldUseObservedRain(hour, now)) {
      if (precipitation >= 8) {
        risk = maxRisk(risk, 'extreme');
        reasons.push(`降水量${formatMm(precipitation)}`);
      } else if (precipitation >= 4 || [65, 82].includes(code)) {
        risk = maxRisk(risk, 'high');
        reasons.push(`降水量${formatMm(precipitation)}`);
      } else if (precipitation >= 1.5 || [63, 81].includes(code)) {
        risk = maxRisk(risk, 'moderate');
        reasons.push(`降水量${formatMm(precipitation)}`);
      } else if (precipitation > 0 || [51, 53, 55, 61, 80].includes(code)) {
        risk = maxRisk(risk, 'mild');
        reasons.push(`降水量${formatMm(precipitation)}`);
      }
    } else if ([65, 82].includes(code) || rainProb >= 80) {
      risk = maxRisk(risk, rainProb >= 92 ? 'extreme' : 'high');
      reasons.push(`降水概率${Math.round(rainProb)}%`);
    } else if ([63, 81].includes(code) || rainProb >= 60) {
      risk = maxRisk(risk, 'moderate');
      reasons.push(`降水概率${Math.round(rainProb)}%`);
    } else if ([51, 53, 55, 61, 80].includes(code) || rainProb >= 35) {
      risk = maxRisk(risk, 'mild');
      reasons.push(`降水概率${Math.round(rainProb)}%`);
    }

    if (wind >= 46) {
      risk = maxRisk(risk, 'extreme');
      reasons.push(`风速${Math.round(wind)}km/h`);
    } else if (wind >= 38) {
      risk = maxRisk(risk, 'high');
      reasons.push(`风速${Math.round(wind)}km/h`);
    } else if (wind >= 28) {
      risk = maxRisk(risk, 'moderate');
      reasons.push(`风速${Math.round(wind)}km/h`);
    }

    if (temp >= 38 || temp <= -5) {
      risk = maxRisk(risk, 'high');
      reasons.push(`温度${Math.round(temp)}°C`);
    } else if (temp >= 35 || temp <= 0) {
      risk = maxRisk(risk, 'moderate');
      reasons.push(`温度${Math.round(temp)}°C`);
    }

    if ([45, 48].includes(code)) {
      risk = maxRisk(risk, 'moderate');
      reasons.push(getWeatherDesc(code));
    }

    if ([71, 73, 75].includes(code)) {
      risk = maxRisk(risk, code === 75 ? 'high' : 'moderate');
      reasons.push(getWeatherDesc(code));
    }

    return {
      key: risk,
      label: RISK_META[risk].label,
      rank: RISK_META[risk].rank,
      reason: reasons.join('，') || '无明显异常天气指标',
    };
  }

  function getTypeRisk(type, hour, now = new Date()) {
    const code = Number(hour.code);
    const rainProb = Number(hour.rainProb || 0);
    const precipitation = getPrecipitation(hour);
    const wind = Number(hour.wind || 0);
    const temp = Number(hour.temp || 0);

    if (type === 'thunder' && [95, 96, 99].includes(code)) return code === 99 ? 'extreme' : 'high';
    if (type === 'snow' && [71, 73, 75].includes(code)) return code === 75 ? 'high' : 'moderate';
    if (type === 'fog' && [45, 48].includes(code)) return 'moderate';
    if (type === 'wind' && wind >= 28) return wind >= 46 ? 'extreme' : wind >= 38 ? 'high' : 'moderate';
    if (type === 'heat' && temp >= 35) return temp >= 38 ? 'high' : 'moderate';
    if (type === 'cold' && temp <= 0) return temp <= -5 ? 'high' : 'moderate';
    if (type === 'rain') {
      if (shouldUseObservedRain(hour, now)) {
        if (precipitation >= 8) return 'extreme';
        if (precipitation >= 4 || [65, 82].includes(code)) return 'high';
        if (precipitation >= 1.5 || [63, 81].includes(code)) return 'moderate';
        if (precipitation > 0 || [51, 53, 55, 61, 80].includes(code)) return 'mild';
        return null;
      }
      if ([65, 82].includes(code) || rainProb >= 80) return rainProb >= 92 ? 'extreme' : 'high';
      if ([63, 81].includes(code) || rainProb >= 60) return 'moderate';
      if ([51, 53, 55, 61, 80].includes(code) || rainProb >= 35) return 'mild';
    }
    return null;
  }

  function hourMatchesType(type, hour, index, hours, now = new Date()) {
    const code = Number(hour.code);
    const rainProb = Number(hour.rainProb || 0);
    const precipitation = getPrecipitation(hour);
    const temp = Number(hour.temp || 0);
    const wind = Number(hour.wind || 0);
    const prev = hours[index - 3];
    const jump = prev ? rainProb - Number(prev.rainProb || 0) : 0;

    if (type === 'rain') {
      if (shouldUseObservedRain(hour, now)) {
        return precipitation > 0 || [61, 63, 65, 80, 81, 82].includes(code);
      }
      return rainProb >= 60 || jump >= 35 || [63, 65, 81, 82].includes(code);
    }
    if (type === 'thunder') return [95, 96, 99].includes(code);
    if (type === 'wind') return wind >= 28;
    if (type === 'heat') return temp >= 35;
    if (type === 'cold') return temp <= 0;
    if (type === 'fog') return [45, 48].includes(code);
    if (type === 'snow') return [71, 73, 75].includes(code);
    return false;
  }

  function getMetricValue(type, hour, rainMode = 'probability') {
    if (type === 'rain') {
      return rainMode === 'observed' ? getPrecipitation(hour) : Math.round(Number(hour.rainProb || 0));
    }
    if (type === 'wind') return Math.round(Number(hour.wind || 0));
    if (type === 'heat' || type === 'cold') return Math.round(Number(hour.temp || 0));
    return getWeatherDesc(hour.code);
  }

  function getStatus(start, end, now) {
    if (end < now) return 'past';
    if (start > now) return 'upcoming';
    return 'active';
  }

  function createEvent(type, segment, now) {
    const start = toDate(segment[0].time);
    const end = toDate(segment[segment.length - 1].time);
    const status = getStatus(start, end, now);
    const rainMode = type === 'rain' && status === 'past' ? 'observed' : 'probability';
    let risk = 'mild';
    let peak = segment[0];
    let peakRank = -1;
    let peakMetric = -Infinity;

    segment.forEach((hour) => {
      const hourRisk = getTypeRisk(type, hour, now) || 'mild';
      const rank = RISK_META[hourRisk].rank;
      const metric = Number(getMetricValue(type, hour, rainMode));
      risk = maxRisk(risk, hourRisk);
      if (rank > peakRank || (rank === peakRank && Number.isFinite(metric) && metric > peakMetric)) {
        peak = hour;
        peakRank = rank;
        peakMetric = Number.isFinite(metric) ? metric : peakMetric;
      }
    });

    const firstMetric = getMetricValue(type, segment[0], rainMode);
    const peakValue = getMetricValue(type, peak, rainMode);
    const unit = EVENT_META[type].unit;
    const metricText = buildMetricText(type, segment, firstMetric, peakValue, unit, rainMode);

    return {
      id: `${type}-${start.getTime()}-${end.getTime()}`,
      type,
      title: EVENT_META[type].title,
      risk,
      riskLabel: RISK_META[risk].label,
      status,
      rainMode,
      dateKey: getLocalDateKey(start),
      dateLabel: getShortDateLabel(start),
      start,
      end,
      startLabel: getHourLabel(start),
      endLabel: getHourLabel(end),
      timeRangeLabel: getTimeRangeLabel(start, end),
      detailRangeLabel: getDetailRangeLabel(start, end),
      peakLabel: getHourLabel(peak.time),
      durationHours: segment.length,
      metricText,
      reason: buildEventReason(type, segment, peak, rainMode),
      hours: segment.map((hour) => ({
        ...hour,
        risk: classifyHourRisk(hour, now),
        label: getHourLabel(hour.time),
        desc: getWeatherDesc(hour.code),
        icon: getWeatherIcon(hour.code),
      })),
    };
  }

  function buildMetricText(type, segment, firstMetric, peakValue, unit, rainMode) {
    if (type === 'rain' && rainMode === 'observed') {
      const total = segment.reduce((sum, hour) => sum + getPrecipitation(hour), 0);
      return `累计降水 ${formatMm(total)} · 小时峰值 ${formatMm(peakValue)}/h`;
    }
    if (type === 'rain') {
      return `降水概率 ${firstMetric}% → ${peakValue}%`;
    }
    if (type === 'wind' || type === 'heat' || type === 'cold') {
      return `${EVENT_META[type].metric} ${firstMetric}${unit} → ${peakValue}${unit}`;
    }
    return `${EVENT_META[type].metric} ${peakValue}`;
  }

  function buildEventReason(type, segment, peak, rainMode) {
    if (type === 'rain') {
      if (rainMode === 'observed') {
        const total = segment.reduce((sum, hour) => sum + getPrecipitation(hour), 0);
        const peakAmount = Math.max(...segment.map(getPrecipitation));
        return `历史记录显示实际降水累计${formatMm(total)}，小时峰值${formatMm(peakAmount)}/h，并持续${segment.length}小时达到归档阈值。`;
      }
      const start = Math.round(segment[0].rainProb || 0);
      const max = Math.max(...segment.map((hour) => Number(hour.rainProb || 0)));
      return `降水概率从${start}%升至${max}%，并持续${segment.length}小时达到关注阈值。`;
    }
    if (type === 'wind') {
      const max = Math.max(...segment.map((hour) => Number(hour.wind || 0)));
      return `风速峰值达到${Math.round(max)}km/h，连续时段超过大风关注阈值。`;
    }
    if (type === 'heat') return `最高温达到${Math.round(peak.temp)}°C，满足高温事件归档条件。`;
    if (type === 'cold') return `最低温达到${Math.round(peak.temp)}°C，满足低温事件归档条件。`;
    if (type === 'fog') return '天气代码显示雾或雾凇，存在低能见度风险。';
    if (type === 'snow') return '天气代码显示降雪，事件已按降雪强度归档。';
    return '天气代码显示雷暴，事件已按强对流天气归档。';
  }

  function detectWeatherEvents(hours, now = new Date()) {
    const sorted = [...hours].sort((a, b) => toDate(a.time) - toDate(b.time));
    const types = ['thunder', 'rain', 'snow', 'wind', 'heat', 'cold', 'fog'];
    const events = [];

    types.forEach((type) => {
      let segment = [];
      sorted.forEach((hour, index) => {
        if (hourMatchesType(type, hour, index, sorted, now)) {
          segment.push(hour);
        } else if (segment.length) {
          pushSegment(type, segment, events, now);
          segment = [];
        }
      });
      if (segment.length) pushSegment(type, segment, events, now);
    });

    return events.sort((a, b) => a.start - b.start || RISK_META[b.risk].rank - RISK_META[a.risk].rank);
  }

  function pushSegment(type, segment, events, now) {
    const minLength = type === 'thunder' || type === 'fog' ? 1 : 2;
    if (segment.length >= minLength) {
      events.push(createEvent(type, segment, now));
    }
  }

  return {
    RISK_META,
    EVENT_META,
    classifyHourRisk,
    detectWeatherEvents,
    getLocalDateKey,
    getWeatherDesc,
    getWeatherIcon,
    getWeatherSkin,
  };
});
