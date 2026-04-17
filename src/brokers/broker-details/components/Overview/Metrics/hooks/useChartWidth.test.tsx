import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useChartWidth } from './useChartWidth';

// Test component that uses the hook
const TestComponent: React.FC<{ testId?: string }> = ({ testId = 'test' }) => {
  const [setRef, width] = useChartWidth();

  return (
    <div>
      <div ref={setRef} data-testid={testId}>
        Chart Container
      </div>
      <span data-testid="width-display">{width ?? 'undefined'}</span>
    </div>
  );
};

describe('useChartWidth', () => {
  beforeEach(() => {
    jest.spyOn(window, 'addEventListener');
    jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return undefined width initially', () => {
    render(<TestComponent />);
    const widthDisplay = screen.getByTestId('width-display');
    expect(widthDisplay.textContent).toBe('undefined');
  });

  it('should update width on resize and sidebar_toggle events', () => {
    render(<TestComponent />);
    const container = screen.getByTestId('test');

    // Set initial width and trigger resize
    Object.defineProperty(container, 'clientWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    let widthDisplay = screen.getByTestId('width-display');
    expect(widthDisplay.textContent).toBe('800');

    // Change width and trigger sidebar_toggle
    Object.defineProperty(container, 'clientWidth', {
      writable: true,
      configurable: true,
      value: 900,
    });

    act(() => {
      window.dispatchEvent(new Event('sidebar_toggle'));
    });
    widthDisplay = screen.getByTestId('width-display');
    expect(widthDisplay.textContent).toBe('900');
  });

  it('should register and cleanup event listeners', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = render(<TestComponent />);

    // Verify listeners were added
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'sidebar_toggle',
      expect.any(Function),
    );

    unmount();

    // Verify listeners were removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'sidebar_toggle',
      expect.any(Function),
    );
  });

  it('should handle multiple resize events', () => {
    render(<TestComponent />);
    const container = screen.getByTestId('test');

    const widths = [1000, 1200, 600];
    widths.forEach((width) => {
      Object.defineProperty(container, 'clientWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      const widthDisplay = screen.getByTestId('width-display');
      expect(widthDisplay.textContent).toBe(String(width));
    });
  });

  it('should not update width if clientWidth is the same', () => {
    render(<TestComponent />);
    const container = screen.getByTestId('test');

    Object.defineProperty(container, 'clientWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    const widthDisplay = screen.getByTestId('width-display');
    expect(widthDisplay.textContent).toBe('800');

    // Trigger resize without changing width - should remain the same
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(widthDisplay.textContent).toBe('800');
  });

  it('should handle zero width correctly', () => {
    render(<TestComponent />);
    const container = screen.getByTestId('test');

    // Set width to 0
    Object.defineProperty(container, 'clientWidth', {
      writable: true,
      configurable: true,
      value: 0,
    });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    const widthDisplay = screen.getByTestId('width-display');
    // Hook correctly handles zero width
    expect(widthDisplay.textContent).toBe('0');
  });

  it('should handle rapid resize events efficiently', () => {
    render(<TestComponent />);
    const container = screen.getByTestId('test');

    // Simulate rapid resizes
    act(() => {
      for (let i = 500; i <= 1000; i += 100) {
        Object.defineProperty(container, 'clientWidth', {
          writable: true,
          configurable: true,
          value: i,
        });
        window.dispatchEvent(new Event('resize'));
      }
    });

    const widthDisplay = screen.getByTestId('width-display');
    expect(widthDisplay.textContent).toBe('1000');
  });
});
