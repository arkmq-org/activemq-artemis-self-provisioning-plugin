export const validate = {};

interface UnitType {
  units: string[];
  space: boolean;
  divisor: number;
}

interface TypesMap {
  numeric: UnitType;
  decimalBytes: UnitType;
  decimalBytesWithoutB: UnitType;
  binaryBytes: UnitType;
  binaryBytesWithoutB: UnitType;
  SI: UnitType;
  decimalBytesPerSec: UnitType;
  packetsPerSec: UnitType;
  seconds: UnitType;
}

const types: TypesMap = {
  numeric: {
    units: ['', 'k', 'm', 'b'],
    space: false,
    divisor: 1000,
  },
  decimalBytes: {
    units: ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'],
    space: true,
    divisor: 1000,
  },
  decimalBytesWithoutB: {
    units: ['', 'k', 'M', 'G', 'T', 'P', 'E'],
    space: true,
    divisor: 1000,
  },
  binaryBytes: {
    units: ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'],
    space: true,
    divisor: 1024,
  },
  binaryBytesWithoutB: {
    units: ['i', 'Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei'],
    space: true,
    divisor: 1024,
  },
  SI: {
    units: ['', 'k', 'M', 'G', 'T', 'P', 'E'],
    space: false,
    divisor: 1000,
  },
  decimalBytesPerSec: {
    units: ['Bps', 'KBps', 'MBps', 'GBps', 'TBps', 'PBps', 'EBps'],
    space: true,
    divisor: 1000,
  },
  packetsPerSec: {
    units: ['pps', 'kpps'],
    space: true,
    divisor: 1000,
  },
  seconds: {
    units: ['ns', 'μs', 'ms', 's'],
    space: true,
    divisor: 1000,
  },
};

export const getType = (name: string | keyof TypesMap): UnitType => {
  const type = types[name as keyof TypesMap];
  if (typeof type === 'object' && type !== null) {
    return type;
  }
  return {
    units: [],
    space: false,
    divisor: 1000,
  };
};

interface ConvertedValue {
  value: number;
  unit: string;
}

const convertBaseValueToUnits = (
  value: number,
  unitArray: string[],
  divisor: number,
  initialUnit: string,
  preferredUnit: string,
): ConvertedValue => {
  const sliceIndex = initialUnit ? unitArray.indexOf(initialUnit) : 0;
  const units_ = unitArray.slice(sliceIndex);

  if (preferredUnit || preferredUnit === '') {
    const unitIndex = units_.indexOf(preferredUnit);
    if (unitIndex !== -1) {
      return {
        value: value / divisor ** unitIndex,
        unit: preferredUnit,
      };
    }
  }

  let unit = units_.shift();
  while (value >= divisor && units_.length > 0) {
    value = value / divisor;
    unit = units_.shift();
  }
  return { value, unit: unit ?? '' };
};

const getDefaultFractionDigits = (value: number) => {
  if (value < 1) {
    return 3;
  }
  if (value < 100) {
    return 2;
  }
  return 1;
};

const formatValue = (
  value: number,
  options: Intl.NumberFormatOptions & { locales?: string | string[] } = {},
): string => {
  const fractionDigits = getDefaultFractionDigits(value);
  const { locales, ...rest } = {
    maximumFractionDigits: fractionDigits,
    ...options,
  };

  // 2nd check converts -0 to 0.
  if (!isFinite(value) || value === 0) {
    value = 0;
  }
  return Intl.NumberFormat(locales, rest).format(value);
};

interface Units {
  round: (value: number, fractionDigits?: number) => number;
  humanize: (
    value: number,
    typeName: keyof TypesMap,
    useRound?: boolean,
    initialUnit?: string,
    preferredUnit?: string,
  ) => {
    string: string;
    unit: string;
    value: number;
  };
}

export const units: Units = {
  round: (value, fractionDigits) => {
    if (!isFinite(value)) {
      return 0;
    }
    const multiplier = Math.pow(
      10,
      fractionDigits ?? getDefaultFractionDigits(value),
    );
    return Math.round(value * multiplier) / multiplier;
  },
  humanize: (value, typeName, useRound = false, initialUnit, preferredUnit) => {
    const type = getType(typeName);

    if (!isFinite(value)) {
      value = 0;
    }

    let converted = convertBaseValueToUnits(
      value,
      type.units,
      type.divisor,
      initialUnit,
      preferredUnit,
    );

    if (useRound) {
      converted.value = units.round(converted.value);
      converted = convertBaseValueToUnits(
        converted.value,
        type.units,
        type.divisor,
        converted.unit,
        preferredUnit,
      );
    }

    const formattedValue = formatValue(converted.value);

    return {
      string: type.space
        ? `${formattedValue} ${converted.unit}`
        : formattedValue + converted.unit,
      unit: converted.unit,
      value: converted.value,
    };
  },
};

export interface HumanizeResult extends ConvertedValue {
  string: string; // formatted string with unit
}

export const humanizeNumberSI = (
  v: number,
  initialUnit?: string,
  preferredUnit?: string,
): HumanizeResult => units.humanize(v, 'SI', true, initialUnit, preferredUnit);

export const humanizeBinaryBytes = (
  v: number,
  initialUnit?: string,
  preferredUnit?: string,
): HumanizeResult =>
  units.humanize(v, 'binaryBytes', true, initialUnit, preferredUnit);

export const humanizeDecimalBytesPerSec = (
  v: number,
  initialUnit?: string,
  preferredUnit?: string,
): HumanizeResult =>
  units.humanize(v, 'decimalBytesPerSec', true, initialUnit, preferredUnit);

export const humanizePacketsPerSec = (
  v: number,
  initialUnit?: string,
  preferredUnit?: string,
): HumanizeResult =>
  units.humanize(v, 'packetsPerSec', true, initialUnit, preferredUnit);

export const humanizeSeconds = (
  v: number,
  initialUnit?: string,
  preferredUnit?: string,
): HumanizeResult =>
  units.humanize(v, 'seconds', true, initialUnit, preferredUnit);

export const humanizeNumber = (
  v: number,
  initialUnit?: string,
  preferredUnit?: string,
): HumanizeResult =>
  units.humanize(v, 'numeric', true, initialUnit, preferredUnit);

export const humanizeCpuCores = (v: number) => {
  const value = v < 1 ? units.round(v * 1000) : v;
  const unit = v < 1 ? 'm' : '';
  return {
    string: `${formatValue(value)}${unit}`,
    unit,
    value,
  };
};
