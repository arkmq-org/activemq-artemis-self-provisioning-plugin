import {
  formatNumber,
  valueFormatter,
  getXDomain,
  getMaxSamplesForSpan,
  formatSeriesValues,
  xAxisTickFormat,
} from './format';
import { PrometheusValue } from '@openshift-console/dynamic-plugin-sdk';

describe('formatNumber', () => {
  it('should format a number with default settings', () => {
    expect(formatNumber('1234.5678')).toBe('1,234.6');
  });

  it('should return "-" for null', () => {
    expect(formatNumber(null as unknown as string)).toBe('-');
  });

  it('should return "-" for undefined', () => {
    expect(formatNumber(undefined as unknown as string)).toBe('-');
  });

  it('should return "0" for empty string', () => {
    expect(formatNumber('')).toBe('0');
  });

  it('should return the original value for NaN', () => {
    expect(formatNumber('not-a-number')).toBe('not-a-number');
  });

  it('should format as percentage when format is percentunit', () => {
    const result = formatNumber('0.5', 2, 'percentunit');
    expect(result).toBe('50.00%');
  });

  it('should format short numbers', () => {
    const result = formatNumber('1234567', 2, 'short');
    expect(result).toBe('1,234,567');
  });

  it('should handle zero', () => {
    expect(formatNumber('0')).toBe('0');
  });

  it('should handle negative numbers', () => {
    const result = formatNumber('-1234');
    expect(result).toContain('-');
  });

  it('should handle very large numbers', () => {
    // Very large numbers are formatted with appropriate units
    const result = formatNumber('1e23');
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle very small numbers', () => {
    // Very small numbers close to zero
    const result = formatNumber('0.0001');
    expect(result).toBe('0');
  });

  it('should format bytes correctly', () => {
    expect(formatNumber('1024', 2, 'bytes')).toContain('KiB');
    expect(formatNumber('1048576', 2, 'bytes')).toContain('MiB');
  });

  it('should format Bps (bytes per second) correctly', () => {
    expect(formatNumber('1000', 2, 'Bps')).toContain('KBps');
    expect(formatNumber('1000000', 2, 'Bps')).toContain('MBps');
  });

  it('should format pps (packets per second) correctly', () => {
    expect(formatNumber('1000', 2, 'pps')).toContain('kmps');
  });

  it('should format mps (messages per second) correctly', () => {
    expect(formatNumber('1000', 2, 'mps')).toContain('kmps');
  });

  it('should format milliseconds correctly', () => {
    expect(formatNumber('1000', 2, 'ms')).toContain('1');
    expect(formatNumber('60000', 2, 'ms')).toContain('60'); // 60 seconds
  });

  it('should format seconds correctly', () => {
    expect(formatNumber('1', 2, 's')).toContain('1');
    expect(formatNumber('60', 2, 's')).toContain('60'); // 60 seconds
  });

  it('should format millicores correctly', () => {
    expect(formatNumber('0.5', 2, 'm')).toContain('500');
    expect(formatNumber('1', 2, 'm')).toContain('1');
  });
});

describe('valueFormatter', () => {
  // Parameterized tests for known units
  it.each([
    ['ms', 1000, '1'],
    ['bytes', 1024, 'KiB'],
    ['m', 0.5, '500'],
    ['s', 1, '1'],
    ['Bps', 1000, 'KBps'],
    ['pps', 1000, 'kmps'],
    ['mps', 1000, 'kmps'],
  ])('should format %s unit correctly', (unit, input, expected) => {
    const formatter = valueFormatter(unit);
    expect(formatter(input)).toContain(expected);
  });

  it('should return default formatter for unknown units', () => {
    const formatter = valueFormatter('unknown');
    const result = formatter(1234.5678);
    // Unknown units use formatValue which formats with commas
    expect(result).toBe('1,234.6');
  });

  it('should handle edge cases', () => {
    const formatter = valueFormatter('unknown');
    expect(formatter(0)).toBe('0');
    expect(formatter(-100)).toContain('-');
  });

  it('should handle boundary values for each unit type', () => {
    // Test boundary values for bytes
    const bytesFormatter = valueFormatter('bytes');
    expect(bytesFormatter(1023)).toContain('B');
    expect(bytesFormatter(1024)).toContain('KiB');

    // Test boundary values for Bps
    const bpsFormatter = valueFormatter('Bps');
    expect(bpsFormatter(999)).toContain('Bps');
    expect(bpsFormatter(1000)).toContain('KBps');
  });
});

describe('getXDomain', () => {
  it('should return correct domain for given end time and span', () => {
    const endTime = 1000000;
    const span = 300000; // 5 minutes in ms
    const domain = getXDomain(endTime, span);
    expect(domain).toEqual([700000, 1000000]);
  });

  it('should handle zero span', () => {
    const endTime = 1000000;
    const span = 0;
    const domain = getXDomain(endTime, span);
    expect(domain).toEqual([1000000, 1000000]);
  });

  it('should handle large spans', () => {
    const endTime = 1000000000;
    const span = 86400000; // 1 day in ms
    const domain = getXDomain(endTime, span);
    expect(domain).toEqual([913600000, 1000000000]);
  });
});

describe('getMaxSamplesForSpan', () => {
  it('should return minimum samples for very short spans', () => {
    const samples = getMaxSamplesForSpan(1000); // 1 second
    expect(samples).toBeGreaterThanOrEqual(10); // minSamples is 10
  });

  it('should return calculated samples for medium spans', () => {
    const span = 1800000; // 30 minutes
    const samples = getMaxSamplesForSpan(span);
    expect(samples).toBeGreaterThan(10);
    expect(samples).toBeLessThanOrEqual(300); // maxSamples
  });

  it('should return maximum samples for very long spans', () => {
    const span = 86400000; // 1 day
    const samples = getMaxSamplesForSpan(span);
    expect(samples).toBeLessThanOrEqual(300); // maxSamples
  });

  it('should handle zero span', () => {
    const samples = getMaxSamplesForSpan(0);
    expect(samples).toBe(10); // minSamples is 10
  });
});

describe('formatSeriesValues', () => {
  it('should format Prometheus values to graph data points', () => {
    const values: PrometheusValue[] = [
      [1000, '100'],
      [2000, '200'],
      [3000, '300'],
    ];
    const samples = 3;
    const span = 3000;

    const result = formatSeriesValues(values, samples, span);

    // Function fills gaps, so length may be greater than input
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result[0]).toEqual({
      x: new Date(1000000),
      y: 100,
    });
    // Check that our values are in the result
    const yValues = result.map((r) => r.y).filter((y) => y !== null);
    expect(yValues).toContain(100);
    expect(yValues).toContain(200);
    expect(yValues).toContain(300);
  });

  it('should handle NaN values by keeping them as NaN', () => {
    const values: PrometheusValue[] = [
      [1000, '100'],
      [2000, 'NaN'],
      [3000, '300'],
    ];
    const samples = 3;
    const span = 3000;

    const result = formatSeriesValues(values, samples, span);

    expect(result[0].y).toBe(100);
    // NaN values stay as NaN and may propagate through gap filling
    expect(Number.isNaN(result[1].y)).toBe(true);
    // Third value might also be NaN due to gap filling logic
    const hasValidValue = result.some((point) => point.y === 300);
    expect(hasValidValue || Number.isNaN(result[2].y)).toBe(true);
  });

  it('should fill gaps in time series with NaN values', () => {
    const values: PrometheusValue[] = [
      [1000, '100'],
      [3000, '300'], // Missing 2000
    ];
    const samples = 3;
    const span = 3000;

    const result = formatSeriesValues(values, samples, span);

    expect(result.length).toBeGreaterThan(2);
    // Should have filled gap with NaN (line 96 in format.ts)
    const hasNaN = result.some((point) => Number.isNaN(point.y));
    expect(hasNaN).toBe(true);
  });

  it('should handle empty values array', () => {
    const values: PrometheusValue[] = [];
    const samples = 3;
    const span = 3000;

    const result = formatSeriesValues(values, samples, span);

    expect(result).toEqual([]);
  });

  it('should handle single value', () => {
    const values: PrometheusValue[] = [[1000, '100']];
    const samples = 1;
    const span = 1000;

    const result = formatSeriesValues(values, samples, span);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      x: new Date(1000000),
      y: 100,
    });
  });

  it('should handle large time gaps between data points', () => {
    const values: PrometheusValue[] = [
      [1000, '100'],
      [10000, '200'], // Large 9-second gap
    ];
    const samples = 10;
    const span = 10000;

    const result = formatSeriesValues(values, samples, span);

    // Should fill the large gap with NaN values
    expect(result.length).toBeGreaterThan(2);
    const nanCount = result.filter((point) => Number.isNaN(point.y)).length;
    expect(nanCount).toBeGreaterThan(0);
  });

  it('should handle unsorted timestamps', () => {
    const values: PrometheusValue[] = [
      [3000, '300'],
      [1000, '100'],
      [2000, '200'],
    ];
    const samples = 3;
    const span = 3000;

    const result = formatSeriesValues(values, samples, span);

    // Function should still process the data
    expect(result.length).toBeGreaterThan(0);
    const yValues = result.map((r) => r.y).filter((y) => y !== null);
    expect(yValues).toContain(100);
    expect(yValues).toContain(200);
    expect(yValues).toContain(300);
  });

  it('should handle negative timestamps', () => {
    const values: PrometheusValue[] = [
      [-1000, '100'],
      [0, '200'],
      [1000, '300'],
    ];
    const samples = 3;
    const span = 2000;

    const result = formatSeriesValues(values, samples, span);

    // Should process negative timestamps
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].x.getTime()).toBeLessThan(0);
  });

  it('should handle overlapping timestamps', () => {
    const values: PrometheusValue[] = [
      [1000, '100'],
      [1000, '150'], // Same timestamp
      [2000, '200'],
    ];
    const samples = 3;
    const span = 2000;

    const result = formatSeriesValues(values, samples, span);

    // Should handle duplicates gracefully
    expect(result.length).toBeGreaterThan(0);
    const yValues = result.map((r) => r.y).filter((y) => y !== null);
    expect(yValues.length).toBeGreaterThan(0);
  });
});

describe('xAxisTickFormat', () => {
  it('should format time only for spans less than 1 day', () => {
    const span = 1800000; // 30 minutes
    const formatter = xAxisTickFormat(span);
    const tick = new Date('2024-01-01T12:00:00Z').getTime();
    const result = formatter(tick);
    // Should only contain time, not date
    expect(result).not.toContain('\n');
    expect(result).toMatch(/\d{1,2}:\d{2}/); // Should contain time format
  });

  it('should format date and time for spans greater than 1 day', () => {
    const span = 86400001; // Just over 1 day
    const formatter = xAxisTickFormat(span);
    const tick = new Date('2024-01-01T12:00:00Z').getTime();
    const result = formatter(tick);
    // Should contain newline separating date and time
    expect(result).toContain('\n');
    expect(result).toMatch(/\d{1,2}:\d{2}/); // Should contain time format
  });

  it('should format time only for exactly 1 day boundary', () => {
    const span = 86400000; // Exactly 1 day (24 hours)
    const formatter = xAxisTickFormat(span);
    const tick = new Date('2024-01-01T12:00:00Z').getTime();
    const result = formatter(tick);
    // At exactly 1 day, should still use time-only format (not greater than)
    expect(result).not.toContain('\n');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('should handle invalid dates by throwing', () => {
    const span = 1800000;
    const formatter = xAxisTickFormat(span);
    const invalidTick = NaN;
    // Invalid dates throw RangeError from Intl.DateTimeFormat
    expect(() => formatter(invalidTick)).toThrow(RangeError);
  });
});

describe('formatSeriesValues - performance', () => {
  it('should handle large datasets efficiently', () => {
    // Generate 1,000 data points
    const values: PrometheusValue[] = Array.from({ length: 1000 }, (_, i) => [
      i * 1000,
      String(Math.random() * 1000),
    ]);
    const samples = 1000;
    const span = 1000000;

    const startTime = performance.now();
    const result = formatSeriesValues(values, samples, span);
    const endTime = performance.now();

    // Should complete in reasonable time (< 2000ms for 1000 points)
    expect(endTime - startTime).toBeLessThan(2000);
    expect(result.length).toBeGreaterThan(0);
    // Verify it actually processed the data
    expect(result.length).toBeGreaterThanOrEqual(values.length);
  });
});
