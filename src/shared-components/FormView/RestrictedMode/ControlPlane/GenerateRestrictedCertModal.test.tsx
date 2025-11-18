import { render, screen } from '@app/test-utils';
import { GenerateRestrictedCertModal } from './GenerateRestrictedCertModal';
import { BrokerCreationFormState } from '@app/reducers/reducer';
import React from 'react';

// Mock the SelectIssuerDrawer component
jest.mock('../../SelectIssuerDrawer/SelectIssuerDrawer', () => ({
  SelectIssuerDrawer: ({
    selectedIssuer,
    setSelectedIssuer,
  }: {
    selectedIssuer: string;
    setSelectedIssuer: (issuer: string) => void;
  }) => (
    <div data-testid="select-issuer-drawer">
      <input
        data-testid="issuer-input"
        value={selectedIssuer}
        onChange={(e) => setSelectedIssuer(e.target.value)}
      />
    </div>
  ),
}));

// Mock useContext to provide formState
const mockUseContext = jest.spyOn(React, 'useContext');

describe('GenerateRestrictedCertModal', () => {
  const mockCr = {
    metadata: {
      name: 'test-broker',
      namespace: 'test-namespace',
    },
    spec: {
      deploymentPlan: {
        size: 2,
      },
    },
  };

  const mockSetIsModalOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContext.mockImplementation((context) => {
      if (context === BrokerCreationFormState) {
        return { cr: mockCr };
      }
      return null;
    });
  });

  describe('Modal visibility', () => {
    it('should not render when isModalOpen is false', () => {
      render(
        <GenerateRestrictedCertModal
          isModalOpen={false}
          setIsModalOpen={mockSetIsModalOpen}
        />,
      );

      expect(
        screen.queryByText('Generate Broker Certificate'),
      ).not.toBeInTheDocument();
    });

    it('should render when isModalOpen is true', () => {
      render(
        <GenerateRestrictedCertModal
          isModalOpen={true}
          setIsModalOpen={mockSetIsModalOpen}
        />,
      );

      expect(
        screen.getByText('Generate Broker Certificate'),
      ).toBeInTheDocument();
    });
  });

  describe('Broker Certificate modal', () => {
    beforeEach(() => {
      render(
        <GenerateRestrictedCertModal
          isModalOpen={true}
          setIsModalOpen={mockSetIsModalOpen}
        />,
      );
    });

    it('should display correct title for broker cert', () => {
      expect(
        screen.getByText('Generate Broker Certificate'),
      ).toBeInTheDocument();
    });

    it('should display certificate details', () => {
      expect(screen.getByText('Certificate name')).toBeInTheDocument();
      expect(screen.getByText('Namespace')).toBeInTheDocument();
      expect(screen.getByText('Secret name')).toBeInTheDocument();
      expect(screen.getByText('test-namespace')).toBeInTheDocument();
      // Should always use CR-specific name (appears twice: cert name and secret name)
      const certNames = screen.getAllByText('test-broker-broker-cert');
      expect(certNames.length).toBeGreaterThanOrEqual(2);
    });

    it('should display specific DNS names for broker pods', () => {
      // Should show specific DNS names for each pod
      expect(
        screen.getByText(
          'test-broker-ss-0.test-broker-hdls-svc.test-namespace.svc.cluster.local',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'test-broker-ss-1.test-broker-hdls-svc.test-namespace.svc.cluster.local',
        ),
      ).toBeInTheDocument();
    });

    it('should have Common Name input field', () => {
      const cnInput = screen.getByLabelText('Common Name');
      expect(cnInput).toBeInTheDocument();
    });

    it('should have disabled Confirm button when issuer is not selected', () => {
      const confirmButton = screen.getByRole('button', { name: /Confirm/i });
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Certificate generation', () => {
    it('should have SelectIssuerDrawer component', () => {
      render(
        <GenerateRestrictedCertModal
          isModalOpen={true}
          setIsModalOpen={mockSetIsModalOpen}
        />,
      );

      expect(screen.getByTestId('select-issuer-drawer')).toBeInTheDocument();
    });

    it('should have Cluster Issuer form group', () => {
      render(
        <GenerateRestrictedCertModal
          isModalOpen={true}
          setIsModalOpen={mockSetIsModalOpen}
        />,
      );

      expect(screen.getByText('Cluster Issuer')).toBeInTheDocument();
    });
  });

  describe('Cancel button', () => {
    it('should call setIsModalOpen when cancel is clicked', () => {
      render(
        <GenerateRestrictedCertModal
          isModalOpen={true}
          setIsModalOpen={mockSetIsModalOpen}
        />,
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      cancelButton.click();

      expect(mockSetIsModalOpen).toHaveBeenCalled();
    });
  });
});
