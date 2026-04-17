import {
  formatPrometheusDuration,
  parsePrometheusDuration,
} from './prometheus';

describe('formatPrometheusDuration', () => {
  it('should format milliseconds to Prometheus duration string', () => {
    expect(formatPrometheusDuration(1000)).toBe('1s');
    expect(formatPrometheusDuration(60000)).toBe('1m');
    expect(formatPrometheusDuration(3600000)).toBe('1h');
    expect(formatPrometheusDuration(86400000)).toBe('1d');
    expect(formatPrometheusDuration(604800000)).toBe('1w');
  });

  it('should format complex durations with multiple units', () => {
    expect(formatPrometheusDuration(65000)).toBe('1m 5s');
    expect(formatPrometheusDuration(3665000)).toBe('1h 1m 5s');
    expect(formatPrometheusDuration(90061000)).toBe('1d 1h 1m 1s');
  });

  it('should handle zero', () => {
    expect(formatPrometheusDuration(0)).toBe('');
  });

  it('should handle negative numbers', () => {
    expect(formatPrometheusDuration(-1000)).toBe('');
  });

  it('should handle non-finite numbers', () => {
    expect(formatPrometheusDuration(NaN)).toBe('');
    expect(formatPrometheusDuration(Infinity)).toBe('');
    expect(formatPrometheusDuration(-Infinity)).toBe('');
  });

  it('should handle partial units correctly', () => {
    // 1500ms should be "1s" (not "1s 500ms" since ms is not a unit)
    expect(formatPrometheusDuration(1500)).toBe('1s');
    // 90000ms should be "1m 30s"
    expect(formatPrometheusDuration(90000)).toBe('1m 30s');
  });
});

describe('parsePrometheusDuration', () => {
  it('should parse single unit durations', () => {
    expect(parsePrometheusDuration('1s')).toBe(1000);
    expect(parsePrometheusDuration('1m')).toBe(60000);
    expect(parsePrometheusDuration('1h')).toBe(3600000);
    expect(parsePrometheusDuration('1d')).toBe(86400000);
    expect(parsePrometheusDuration('1w')).toBe(604800000);
  });

  it('should parse multi-unit durations', () => {
    expect(parsePrometheusDuration('1m 5s')).toBe(65000);
    expect(parsePrometheusDuration('1h 1m 5s')).toBe(3665000);
    expect(parsePrometheusDuration('1d 1h 1m 1s')).toBe(90061000);
  });

  it('should handle multiple values of same unit', () => {
    expect(parsePrometheusDuration('2m 3m')).toBe(300000); // 5 minutes
    expect(parsePrometheusDuration('1h 2h')).toBe(10800000); // 3 hours
  });

  it('should handle extra whitespace', () => {
    expect(parsePrometheusDuration('  1m   5s  ')).toBe(65000);
    expect(parsePrometheusDuration('1h  1m  5s')).toBe(3665000);
  });

  it('should return 0 for invalid formats', () => {
    expect(parsePrometheusDuration('')).toBe(0);
    expect(parsePrometheusDuration('invalid')).toBe(0);
    expect(parsePrometheusDuration('1x')).toBe(0);
    expect(parsePrometheusDuration('abc123')).toBe(0);
  });

  it('should handle large numbers', () => {
    expect(parsePrometheusDuration('100w')).toBe(60480000000);
    expect(parsePrometheusDuration('365d')).toBe(31536000000);
  });
});

describe('formatPrometheusDuration and parsePrometheusDuration round-trip', () => {
  it('should round-trip correctly for exact unit values', () => {
    const durations = [1000, 60000, 3600000, 86400000, 604800000];
    durations.forEach((ms) => {
      const formatted = formatPrometheusDuration(ms);
      const parsed = parsePrometheusDuration(formatted);
      expect(parsed).toBe(ms);
    });
  });

  it('should round-trip correctly for complex durations', () => {
    const durations = [65000, 3665000, 90061000];
    durations.forEach((ms) => {
      const formatted = formatPrometheusDuration(ms);
      const parsed = parsePrometheusDuration(formatted);
      expect(parsed).toBe(ms);
    });
  });
});
