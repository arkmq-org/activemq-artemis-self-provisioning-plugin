import { render, waitForI18n } from '@app/test-utils';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('should render ErrorState without crash', async () => {
    const comp = render(<ErrorState />);
    await waitForI18n(comp);

    expect(comp.getByText('Error fetching broker')).toBeInTheDocument();
    expect(
      comp.getByText(
        "Could not get broker's CR. An error occurred while retrieving the broker's CR. Please try again later.",
      ),
    ).toBeInTheDocument();
  });
});
