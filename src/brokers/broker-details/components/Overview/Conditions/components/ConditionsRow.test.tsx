import { render, screen } from '@app/test-utils';
import { ConditionsRow, ConditionsRowProps } from './ConditionsRow';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  Timestamp: ({ timestamp }: { timestamp: string }) => (
    <time>{new Date(timestamp).toLocaleString()}</time>
  ),
}));

describe('ConditionsRow Component', () => {
  it('should renders all the condition fields correctly', () => {
    const mockCondition: ConditionsRowProps['condition'] = {
      type: 'Valid',
      status: 'True',
      reason: 'ValidationSucceded',
      message: '-',
      lastTransitionTime: '1/21/2025, 7:25:00 AM',
    };

    render(
      <table>
        <tbody>
          <tr>
            <ConditionsRow condition={mockCondition} />
          </tr>
        </tbody>
      </table>,
    );

    expect(screen.getByText('Valid')).toBeInTheDocument();
    expect(screen.getByText('True')).toBeInTheDocument();
    expect(screen.getByText('ValidationSucceded')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('1/21/2025, 7:25:00 AM')).toBeInTheDocument();
  });
});
