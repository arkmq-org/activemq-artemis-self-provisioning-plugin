import { BrokerCR } from '@app/k8s/types';
import { fireEvent, render, screen, waitFor } from '@app/test-utils';
import { configure } from '@testing-library/dom';
import { ConnectivityTester } from './ConnectivityTester';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

configure({ testIdAttribute: 'data-test' });

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn(),
  k8sCreate: jest.fn(),
  k8sDelete: jest.fn(),
}));

const mockUseK8sWatchResource = useK8sWatchResource as jest.Mock;

const mockBroker: BrokerCR = {
  apiVersion: 'broker.amq.io/v1beta1',
  kind: 'ActiveMQArtemis',
  metadata: { name: 'test-broker', namespace: 'test-namespace' },
  spec: {
    deploymentPlan: { image: '', requireLogin: false, size: 1 },
  },
};

describe('ConnectivityTester - Message Count', () => {
  let input: HTMLElement;
  let producerButton: HTMLElement;
  let consumerButton: HTMLElement;

  beforeEach(async () => {
    mockUseK8sWatchResource.mockImplementation((resource) => {
      if (resource?.groupVersionKind?.kind === 'Certificate') {
        return [
          [{ metadata: { name: 'messaging-client-cert' } }],
          true,
          undefined,
        ];
      }
      return [[], true, undefined];
    });

    render(<ConnectivityTester cr={mockBroker} />);
    fireEvent.click(screen.getByTestId('open-connectivity-tester'));
    fireEvent.click(await screen.findByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    input = await screen.findByTestId('connectivity-message-count');
    producerButton = screen.getByTestId('connectivity-run-producer');
    consumerButton = screen.getByTestId('connectivity-run-consumer');
  });

  it('should filter non-digit characters from input', () => {
    fireEvent.change(input, { target: { value: 'abc123xyz' } });
    expect(input).toHaveValue('123');

    fireEvent.change(input, { target: { value: '-456' } });
    expect(input).toHaveValue('456');

    fireEvent.change(input, { target: { value: '78.9' } });
    expect(input).toHaveValue('789');
  });

  it('should show error and disable buttons when input is zero', async () => {
    fireEvent.change(input, { target: { value: '0' } });

    await waitFor(() => {
      expect(
        screen.getByText(/Message count must be greater than 0/i),
      ).toBeInTheDocument();
    });
    expect(producerButton).toBeDisabled();
    expect(consumerButton).toBeDisabled();
  });

  it('should update UI when changing from valid to invalid and back', async () => {
    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => {
      expect(
        screen.getByText(/Message count must be greater than 0/i),
      ).toBeInTheDocument();
    });
    expect(producerButton).toBeDisabled();
    expect(consumerButton).toBeDisabled();

    fireEvent.change(input, { target: { value: '50' } });
    await waitFor(() => {
      expect(
        screen.getByText(/Number of messages to send and receive/i),
      ).toBeInTheDocument();
    });
    expect(producerButton).not.toBeDisabled();
    expect(consumerButton).not.toBeDisabled();
  });
});
