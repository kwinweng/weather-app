const assert = require('node:assert/strict');
const {
  detectWeatherEvents,
  getLocalDateKey,
  classifyHourRisk,
} = require('../event-rules.js');

function hour(time, overrides = {}) {
  return {
    time,
    temp: 18,
    humidity: 70,
    rainProb: 10,
    code: 3,
    wind: 12,
    ...overrides,
  };
}

const rainHours = [
  hour('2026-05-02T17:00', { rainProb: 42, code: 61 }),
  hour('2026-05-02T18:00', { rainProb: 64, code: 63 }),
  hour('2026-05-02T19:00', { rainProb: 78, code: 63 }),
  hour('2026-05-02T20:00', { rainProb: 88, code: 65 }),
  hour('2026-05-02T21:00', { rainProb: 82, code: 65 }),
  hour('2026-05-02T22:00', { rainProb: 38, code: 51 }),
];

const rainEvents = detectWeatherEvents(rainHours, new Date('2026-05-02T12:00:00+08:00'));
assert.equal(rainEvents.length, 1);
assert.equal(rainEvents[0].type, 'rain');
assert.equal(rainEvents[0].title, '降雨增强');
assert.equal(rainEvents[0].risk, 'high');
assert.equal(rainEvents[0].startLabel, '18:00');
assert.equal(rainEvents[0].endLabel, '21:00');
assert.equal(rainEvents[0].peakLabel, '20:00');
assert.equal(rainEvents[0].status, 'upcoming');

const windRisk = classifyHourRisk(hour('2026-05-02T14:00', { wind: 32 }));
assert.equal(windRisk.key, 'moderate');
assert.match(windRisk.reason, /风速/);

assert.equal(getLocalDateKey('2026-05-02T00:00'), '2026-05-02');

console.log('event-rules tests passed');
