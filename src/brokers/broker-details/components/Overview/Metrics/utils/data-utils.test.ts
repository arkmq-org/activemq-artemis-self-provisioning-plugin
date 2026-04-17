import { processFrame, DataPoint } from './data-utils';

describe('processFrame', () => {
  it('should process data points with binaryBytes type', () => {
    const dataPoints: DataPoint[][] = [
      [
        { x: 1, y: 1024 }, // 1 KiB
        { x: 2, y: 2048 }, // 2 KiB
      ],
      [
        { x: 3, y: 3072 }, // 3 KiB
      ],
    ];

    const result = processFrame(dataPoints, 'binaryBytes');

    expect(result.unit).toBe('KiB');
    expect(result.processedData[0][0].y).toBeCloseTo(1, 5);
    expect(result.processedData[0][1].y).toBeCloseTo(2, 5);
    expect(result.processedData[1][0].y).toBeCloseTo(3, 5);
  });

  it('should process data points with decimalBytes type', () => {
    const dataPoints: DataPoint[][] = [
      [
        { x: 1, y: 1000 }, // 1 KB
        { x: 2, y: 2000 }, // 2 KB
      ],
    ];

    const result = processFrame(dataPoints, 'decimalBytes');

    expect(result.unit).toBe('KB');
    expect(result.processedData[0][0].y).toBeCloseTo(1, 5);
    expect(result.processedData[0][1].y).toBeCloseTo(2, 5);
  });

  it('should select appropriate unit based on largest value', () => {
    const dataPoints: DataPoint[][] = [
      [
        { x: 1, y: 1024 }, // 1 KiB
        { x: 2, y: 1048576 }, // 1 MiB
      ],
    ];

    const result = processFrame(dataPoints, 'binaryBytes');

    // Should select MiB as the unit since it's the largest
    expect(result.unit).toBe('MiB');
    expect(result.processedData[0][0].y).toBeCloseTo(0.0009765625, 5); // 1 KiB in MiB
    expect(result.processedData[0][1].y).toBeCloseTo(1, 5); // 1 MiB
  });

  it('should handle empty data points array', () => {
    const dataPoints: DataPoint[][] = [];

    const result = processFrame(dataPoints, 'binaryBytes');

    // When data is empty, unit is still set to 'B' (base unit)
    expect(result.unit).toBe('B');
    expect(result.processedData).toEqual([]);
  });

  it('should handle array with empty nested arrays', () => {
    const dataPoints: DataPoint[][] = [[]];

    const result = processFrame(dataPoints, 'binaryBytes');

    expect(result.unit).toBeUndefined(); // No unit when no data points
    expect(result.processedData).toEqual([[]]);
  });

  it('should process numeric type correctly', () => {
    const dataPoints: DataPoint[][] = [
      [
        { x: 1, y: 1000 }, // 1k
        { x: 2, y: 2000 }, // 2k
      ],
    ];

    const result = processFrame(dataPoints, 'numeric');

    expect(result.unit).toBe('k');
    expect(result.processedData[0][0].y).toBeCloseTo(1, 5);
    expect(result.processedData[0][1].y).toBeCloseTo(2, 5);
  });

  it('should process SI type correctly', () => {
    const dataPoints: DataPoint[][] = [
      [
        { x: 1, y: 1000000 }, // 1M
        { x: 2, y: 2000000 }, // 2M
      ],
    ];

    const result = processFrame(dataPoints, 'SI');

    expect(result.unit).toBe('M');
    expect(result.processedData[0][0].y).toBeCloseTo(1, 5);
    expect(result.processedData[0][1].y).toBeCloseTo(2, 5);
  });

  it('should handle very large values', () => {
    const dataPoints: DataPoint[][] = [
      [
        { x: 1, y: 1099511627776 }, // 1 TiB
      ],
    ];

    const result = processFrame(dataPoints, 'binaryBytes');

    expect(result.unit).toBe('TiB');
    expect(result.processedData[0][0].y).toBeCloseTo(1, 5);
  });

  it('should handle mixed magnitude values', () => {
    const dataPoints: DataPoint[][] = [
      [
        { x: 1, y: 100 }, // 100 B
        { x: 2, y: 1024 }, // 1 KiB
        { x: 3, y: 1048576 }, // 1 MiB
      ],
    ];

    const result = processFrame(dataPoints, 'binaryBytes');

    // Should use MiB as the unit (largest value)
    expect(result.unit).toBe('MiB');
    expect(result.processedData[0][2].y).toBeCloseTo(1, 5);
  });

  it('should handle unknown type gracefully', () => {
    const dataPoints: DataPoint[][] = [
      [
        { x: 1, y: 1000 },
        { x: 2, y: 2000 },
      ],
    ];

    const result = processFrame(dataPoints, 'unknownType');

    // Should use default type with empty units array
    expect(result.unit).toBeUndefined();
    expect(result.processedData).toBeDefined();
  });

  it('should mutate original data points', () => {
    const dataPoints: DataPoint[][] = [
      [
        { x: 1, y: 1024 }, // 1 KiB
      ],
    ];

    const originalValue = dataPoints[0][0].y;
    processFrame(dataPoints, 'binaryBytes');

    // Verify mutation occurred
    expect(dataPoints[0][0].y).not.toBe(originalValue);
    expect(dataPoints[0][0].y).toBeCloseTo(1, 5);
  });

  it('should handle seconds type', () => {
    const dataPoints: DataPoint[][] = [
      [
        { x: 1, y: 1000 }, // 1000 ns = 1 μs
        { x: 2, y: 2000 }, // 2000 ns = 2 μs
      ],
    ];

    const result = processFrame(dataPoints, 'seconds');

    expect(result.unit).toBe('μs');
    expect(result.processedData[0][0].y).toBeCloseTo(1, 5);
    expect(result.processedData[0][1].y).toBeCloseTo(2, 5);
  });

  it('should handle packetsPerSec type', () => {
    const dataPoints: DataPoint[][] = [
      [
        { x: 1, y: 1000 }, // 1 kmps
        { x: 2, y: 2000 }, // 2 kmps
      ],
    ];

    const result = processFrame(dataPoints, 'packetsPerSec');

    expect(result.unit).toBe('kmps');
    expect(result.processedData[0][0].y).toBeCloseTo(1, 5);
    expect(result.processedData[0][1].y).toBeCloseTo(2, 5);
  });

  it('should handle data points with null y values', () => {
    const dataPoints: DataPoint[][] = [
      [
        { x: 1, y: 1024 },
        { x: 2, y: null as unknown as number },
        { x: 3, y: 2048 },
      ],
    ];

    const result = processFrame(dataPoints, 'binaryBytes');

    expect(result.unit).toBe('KiB');
    // Function should handle null gracefully
    expect(result.processedData).toBeDefined();
  });

  it('should handle data points with negative y values', () => {
    const dataPoints: DataPoint[][] = [
      [
        { x: 1, y: -1024 },
        { x: 2, y: 1024 },
      ],
    ];

    const result = processFrame(dataPoints, 'binaryBytes');

    // Should still process and select unit based on positive values
    expect(result.unit).toBe('KiB');
    expect(result.processedData).toBeDefined();
  });
});

describe('processFrame - performance', () => {
  it('should handle large datasets efficiently', () => {
    // Generate large dataset with 1000 data points across 10 series
    const dataPoints: DataPoint[][] = Array.from({ length: 10 }, () =>
      Array.from({ length: 1000 }, (_, i) => ({
        x: i,
        y: Math.random() * 1000000,
      })),
    );

    const startTime = performance.now();
    const result = processFrame(dataPoints, 'binaryBytes');
    const endTime = performance.now();

    // Should complete in reasonable time (< 50ms)
    expect(endTime - startTime).toBeLessThan(50);
    expect(result.processedData).toBeDefined();
    expect(result.unit).toBeDefined();
  });
});
