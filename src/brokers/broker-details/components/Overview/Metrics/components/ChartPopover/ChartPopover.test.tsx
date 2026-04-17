import { render, screen, waitForI18n } from '@app/test-utils';
import { ChartPopover } from '../ChartPopover/ChartPopover';

describe('ChartPopover', () => {
  it('should render ChartPopover component correctly', async () => {
    const comp = render(
      <ChartPopover title="Memory Usage" description="memory usage" />,
    );
    await waitForI18n(comp);

    expect(
      screen.getByLabelText('Information about {{title}}'),
    ).toBeInTheDocument();
  });

  it('should render question circle icon', async () => {
    const { container } = render(
      <ChartPopover title="CPU Usage" description="CPU metrics" />,
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('role', 'img');
  });
});
