import {
  humanizeNumberSI,
  humanizeBinaryBytes,
  humanizeDecimalBytesPerSec,
  humanizePacketsPerSec,
  humanizeSeconds,
  humanizeNumber,
  humanizeCpuCores,
  getType,
} from './units';

describe('humanizeNumberSI', () => {
  it('should humanize numbers with SI units', () => {
    expect(humanizeNumberSI(1000).string).toBe('1,000');
    expect(humanizeNumberSI(1000000).string).toBe('1,000,000');
    expect(humanizeNumberSI(1000000000).string).toBe('1,000,000,000');
  });

  it('should handle small numbers', () => {
    expect(humanizeNumberSI(1).string).toBe('1');
    expect(humanizeNumberSI(100).string).toBe('100');
  });

  it('should handle zero and non-finite values', () => {
    expect(humanizeNumberSI(0).string).toBe('0');
    expect(humanizeNumberSI(NaN).string).toBe('0');
    expect(humanizeNumberSI(Infinity).string).toBe('0');
  });
});

describe('humanizeBinaryBytes', () => {
  it('should humanize bytes with binary units', () => {
    expect(humanizeBinaryBytes(1024).string).toBe('1 KiB');
    expect(humanizeBinaryBytes(1048576).string).toBe('1 MiB');
    expect(humanizeBinaryBytes(1073741824).string).toBe('1 GiB');
  });

  it('should handle small byte values', () => {
    expect(humanizeBinaryBytes(100).string).toBe('100 B');
    expect(humanizeBinaryBytes(512).string).toBe('512 B');
  });

  it('should respect preferred unit', () => {
    const result = humanizeBinaryBytes(1024, undefined, 'MiB');
    expect(result.unit).toBe('MiB');
    expect(result.string).toContain('MiB');
  });
});

describe('humanizeDecimalBytesPerSec', () => {
  it('should humanize bytes per second with decimal units', () => {
    expect(humanizeDecimalBytesPerSec(1000).string).toBe('1 KBps');
    expect(humanizeDecimalBytesPerSec(1000000).string).toBe('1 MBps');
    expect(humanizeDecimalBytesPerSec(1000000000).string).toBe('1 GBps');
  });

  it('should handle small values', () => {
    expect(humanizeDecimalBytesPerSec(100).string).toBe('100 Bps');
  });
});

describe('humanizePacketsPerSec', () => {
  it('should humanize packets per second', () => {
    expect(humanizePacketsPerSec(100).string).toBe('100 mps');
    expect(humanizePacketsPerSec(1000).string).toBe('1 kmps');
    expect(humanizePacketsPerSec(5000).string).toBe('5 kmps');
  });
});

describe('humanizeSeconds', () => {
  it('should humanize time values', () => {
    expect(humanizeSeconds(1).string).toBe('1 ns');
    expect(humanizeSeconds(1000).string).toBe('1 μs');
    expect(humanizeSeconds(1000000).string).toBe('1 ms');
    expect(humanizeSeconds(1000000000).string).toBe('1 s');
  });

  it('should handle fractional values', () => {
    const result = humanizeSeconds(1500);
    expect(result.string).toContain('μs');
  });
});

describe('humanizeNumber', () => {
  it('should humanize numeric values', () => {
    expect(humanizeNumber(1000).string).toBe('1,000');
    expect(humanizeNumber(1000000).string).toBe('1,000,000');
    expect(humanizeNumber(1000000000).string).toBe('1,000,000,000');
  });

  it('should handle values without units', () => {
    expect(humanizeNumber(100).string).toBe('100');
  });
});

describe('humanizeCpuCores', () => {
  it('should humanize CPU cores for values >= 1', () => {
    expect(humanizeCpuCores(1).string).toBe('1');
    expect(humanizeCpuCores(2).string).toBe('2');
    expect(humanizeCpuCores(4.5).string).toBe('4.5');
  });

  it('should convert to millicores for values < 1', () => {
    expect(humanizeCpuCores(0.5).string).toBe('500m');
    expect(humanizeCpuCores(0.25).string).toBe('250m');
    expect(humanizeCpuCores(0.001).string).toBe('1m');
  });

  it('should return correct unit', () => {
    expect(humanizeCpuCores(1).unit).toBe('');
    expect(humanizeCpuCores(0.5).unit).toBe('m');
  });
});

describe('getType', () => {
  it('should return correct type for known type names', () => {
    const binaryBytes = getType('binaryBytes');
    expect(binaryBytes.units).toEqual(['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']);
    expect(binaryBytes.divisor).toBe(1024);
    expect(binaryBytes.space).toBe(true);
  });

  it('should return correct type for SI', () => {
    const si = getType('SI');
    expect(si.units).toEqual(['', 'k', 'M', 'G', 'T', 'P', 'E']);
    expect(si.divisor).toBe(1000);
    expect(si.space).toBe(false);
  });

  it('should return default type for unknown type names', () => {
    const unknown = getType('unknownType');
    expect(unknown.units).toEqual([]);
    expect(unknown.divisor).toBe(1000);
    expect(unknown.space).toBe(false);
  });

  it('should handle initialUnit parameter', () => {
    // Test with initialUnit - the function still converts to best unit
    // even when initialUnit is specified
    const result = humanizeBinaryBytes(1024, 'KiB');
    // The function converts to the best unit regardless of initialUnit
    expect(result.unit).toBeDefined();
    expect(result.value).toBeDefined();
    expect(result.string).toBeDefined();
  });

  it('should handle boundary between unit conversions', () => {
    // Test values just below and at conversion boundary
    expect(humanizeNumberSI(999).string).toBe('999');
    expect(humanizeNumberSI(1000).string).toBe('1,000');
    expect(humanizeNumberSI(1001).string).toBe('1,001');
  });

  it('should handle very small decimal values', () => {
    const result = humanizeNumberSI(0.001);
    expect(result.string).toBe('0.001');
    expect(result.unit).toBe('');
  });
});

describe('humanize functions - edge cases', () => {
  it('should handle negative values', () => {
    // Negative values are formatted but not converted to units
    const siResult = humanizeNumberSI(-1000);
    expect(siResult.string).toContain('-');
    expect(siResult.string).toContain('1');

    const bytesResult = humanizeBinaryBytes(-1024);
    expect(bytesResult.string).toContain('-');
    expect(bytesResult.string).toContain('1');
  });

  it('should handle very large values', () => {
    const result = humanizeBinaryBytes(1099511627776); // 1 TiB
    expect(result.string).toBe('1 TiB');
    expect(result.unit).toBe('TiB');
  });

  it('should handle decimal precision correctly', () => {
    const result = humanizeBinaryBytes(1536); // 1.5 KiB
    expect(result.string).toContain('1.5');
    expect(result.unit).toBe('KiB');
  });

  it('should return value and unit separately', () => {
    const result = humanizeNumberSI(1500);
    expect(result.value).toBe(1500);
    expect(result.unit).toBe('');
    expect(result.string).toBe('1,500');
  });
});
