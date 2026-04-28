import { render, screen, waitForI18n } from '@app/test-utils';
import { MetricsErrorState } from './MetricsErrorState';

describe('MetricsErrorState', () => {
  it('should render error title and description', async () => {
    const error = new Error('Test error');
    const comp = render(<MetricsErrorState error={error} />);
    await waitForI18n(comp);

    expect(screen.getByText('Unable to load metrics')).toBeInTheDocument();
    expect(
      screen.getByText('There was a problem contacting Prometheus.'),
    ).toBeInTheDocument();
  });

  it('should render expandable section with error details', async () => {
    const error = new Error('Connection timeout');
    const comp = render(<MetricsErrorState error={error} />);
    await waitForI18n(comp);

    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('should handle Error instance', async () => {
    const error = new Error('Network error');
    const comp = render(<MetricsErrorState error={error} />);
    await waitForI18n(comp);

    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('should handle object with error property', async () => {
    const error = { error: 'API error' };
    const comp = render(<MetricsErrorState error={error} />);
    await waitForI18n(comp);

    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('should handle object with message property', async () => {
    const error = { message: 'Request failed' };
    const comp = render(<MetricsErrorState error={error} />);
    await waitForI18n(comp);

    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('should handle plain object', async () => {
    const error = { status: 500, statusText: 'Internal Server Error' };
    const comp = render(<MetricsErrorState error={error} />);
    await waitForI18n(comp);

    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('should handle string error', async () => {
    const error = 'Simple error string';
    const comp = render(<MetricsErrorState error={error} />);
    await waitForI18n(comp);

    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('should handle number error', async () => {
    const error = 404;
    const comp = render(<MetricsErrorState error={error} />);
    await waitForI18n(comp);

    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('should handle null error', async () => {
    const error: unknown = null;
    const comp = render(<MetricsErrorState error={error} />);
    await waitForI18n(comp);

    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('should handle undefined error', async () => {
    const error: unknown = undefined;
    const comp = render(<MetricsErrorState error={error} />);
    await waitForI18n(comp);

    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('should handle complex nested object', async () => {
    const error = {
      response: {
        data: { message: 'Nested error' },
        status: 500,
      },
    };
    const comp = render(<MetricsErrorState error={error} />);
    await waitForI18n(comp);

    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('should render without crashing for any error type', () => {
    const errors = [
      new Error('Test'),
      'string error',
      123,
      null,
      undefined,
      { error: 'object error' },
      ['array', 'error'],
      true,
      false,
    ];

    errors.forEach((error) => {
      expect(() => {
        render(<MetricsErrorState error={error} />);
      }).not.toThrow();
    });
  });
});
