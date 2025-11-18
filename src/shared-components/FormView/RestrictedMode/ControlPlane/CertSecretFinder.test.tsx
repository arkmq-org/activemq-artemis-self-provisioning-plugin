import { render, screen } from '@app/test-utils';
import { CertSecretFinder } from './CertSecretFinder';
import { BrokerCreationFormState } from '@app/reducers/reducer';
import { FormStateRestricted } from '@app/reducers/restricted/import-types';
import { MandatorySecretsToWatchFor } from '@app/reducers/restricted/reducer';
import { BrokerCR } from '@app/k8s/types';
import React from 'react';

// Mock useContext to provide formState
const mockUseContext = jest.spyOn(React, 'useContext');

describe('CertSecretFinder', () => {
  const defaultProps = {
    expectedSecretNames: ['test-secret'],
    validationFlag: MandatorySecretsToWatchFor.BROKER_CERT,
    label: 'Test Secret',
    fieldId: 'test-secret-field',
  };

  const createMockFormState = (
    validationResults?: Record<string, string>,
  ): Partial<FormStateRestricted> => ({
    secretValidationResults: validationResults,
    cr: {
      metadata: {
        name: 'test-broker',
        namespace: 'test-namespace',
      },
      spec: {
        deploymentPlan: {
          size: 1,
        },
      },
    } as Partial<BrokerCR>,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show placeholder when secret is not found', () => {
    // Mock formState with empty validation results
    mockUseContext.mockImplementation((context) => {
      if (context === BrokerCreationFormState) {
        return createMockFormState({});
      }
      return null;
    });

    render(<CertSecretFinder {...defaultProps} />);

    // The i18n mock doesn't interpolate variables, so we check for the template
    const input = screen.getByPlaceholderText('Secret missing: {{names}}');
    expect(input).toBeInTheDocument();
    expect(input).toBeDisabled();
    expect(input).toHaveValue('');
  });

  it('should display the secret name when secret is found', () => {
    // Mock formState with found secret
    mockUseContext.mockImplementation((context) => {
      if (context === BrokerCreationFormState) {
        return createMockFormState({
          [MandatorySecretsToWatchFor.BROKER_CERT]: 'test-secret',
        });
      }
      return null;
    });

    render(<CertSecretFinder {...defaultProps} />);

    const input = screen.getByDisplayValue('test-secret');
    expect(input).toBeInTheDocument();
    expect(input).toBeDisabled();
  });

  it('should show empty value when validation results are undefined', () => {
    // Mock formState with no validation results at all
    mockUseContext.mockImplementation((context) => {
      if (context === BrokerCreationFormState) {
        return createMockFormState(undefined);
      }
      return null;
    });

    render(<CertSecretFinder {...defaultProps} />);

    const input = screen.getByPlaceholderText('Secret missing: {{names}}');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('should render label correctly', () => {
    mockUseContext.mockImplementation((context) => {
      if (context === BrokerCreationFormState) {
        return createMockFormState({});
      }
      return null;
    });

    render(<CertSecretFinder {...defaultProps} />);

    expect(screen.getByText('Test Secret')).toBeInTheDocument();
  });

  it('should render help text when provided', () => {
    mockUseContext.mockImplementation((context) => {
      if (context === BrokerCreationFormState) {
        return createMockFormState({});
      }
      return null;
    });

    render(
      <CertSecretFinder
        {...defaultProps}
        helpText="This is help text for the field"
      />,
    );

    // The help icon button should be present
    const helpButton = screen.getByRole('button', {
      name: 'More info for Test Secret field',
    });
    expect(helpButton).toBeInTheDocument();
  });

  it('should not render help icon when helpText is not provided', () => {
    mockUseContext.mockImplementation((context) => {
      if (context === BrokerCreationFormState) {
        return createMockFormState({});
      }
      return null;
    });

    render(<CertSecretFinder {...defaultProps} />);

    // The help icon button should not be present
    const helpButton = screen.queryByRole('button', {
      name: 'More info for Test Secret field',
    });
    expect(helpButton).not.toBeInTheDocument();
  });

  it('should have disabled "View cert" button', () => {
    mockUseContext.mockImplementation((context) => {
      if (context === BrokerCreationFormState) {
        return createMockFormState({});
      }
      return null;
    });

    render(<CertSecretFinder {...defaultProps} />);

    const viewButton = screen.getByLabelText('View cert');
    expect(viewButton).toBeInTheDocument();
    expect(viewButton).toBeDisabled();
  });

  it('should have enabled "Generate" button when operator CA exists', () => {
    mockUseContext.mockImplementation((context) => {
      if (context === BrokerCreationFormState) {
        return createMockFormState({
          [MandatorySecretsToWatchFor.OPERATOR_CA]: 'operator-ca-secret',
        });
      }
      return null;
    });

    render(<CertSecretFinder {...defaultProps} />);

    const generateButton = screen.getByText('Generate');
    expect(generateButton).toBeInTheDocument();
    expect(generateButton).not.toBeDisabled();
  });

  it('should have disabled "Generate" button when operator CA is missing', () => {
    mockUseContext.mockImplementation((context) => {
      if (context === BrokerCreationFormState) {
        return createMockFormState({});
      }
      return null;
    });

    render(<CertSecretFinder {...defaultProps} />);

    const generateButton = screen.getByText('Generate');
    expect(generateButton).toBeInTheDocument();
    expect(generateButton).toBeDisabled();
  });

  it('should display the found secret from validation results', () => {
    mockUseContext.mockImplementation((context) => {
      if (context === BrokerCreationFormState) {
        return createMockFormState({
          [MandatorySecretsToWatchFor.BROKER_CERT]: 'found-secret-name',
        });
      }
      return null;
    });

    render(<CertSecretFinder {...defaultProps} />);

    const input = screen.getByDisplayValue('found-secret-name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('found-secret-name');
  });

  it('should handle multiple expected names in placeholder', () => {
    mockUseContext.mockImplementation((context) => {
      if (context === BrokerCreationFormState) {
        return createMockFormState({});
      }
      return null;
    });

    render(
      <CertSecretFinder
        {...defaultProps}
        expectedSecretNames={['primary-secret', 'fallback-secret']}
      />,
    );

    // The placeholder should show both names
    const input = screen.getByPlaceholderText('Secret missing: {{names}}');
    expect(input).toBeInTheDocument();
  });

  it('should work with different validation flags', () => {
    mockUseContext.mockImplementation((context) => {
      if (context === BrokerCreationFormState) {
        return createMockFormState({
          [MandatorySecretsToWatchFor.OPERATOR_CA]: 'operator-ca-secret',
          [MandatorySecretsToWatchFor.BROKER_CERT]: 'broker-cert-secret',
        });
      }
      return null;
    });

    const { rerender } = render(
      <CertSecretFinder
        {...defaultProps}
        validationFlag={MandatorySecretsToWatchFor.BROKER_CERT}
        expectedSecretNames={['broker-cert']}
      />,
    );
    expect(screen.getByDisplayValue('broker-cert-secret')).toBeInTheDocument();

    rerender(
      <CertSecretFinder
        {...defaultProps}
        validationFlag={MandatorySecretsToWatchFor.OPERATOR_CA}
        expectedSecretNames={['operator-ca']}
      />,
    );
    expect(screen.getByDisplayValue('operator-ca-secret')).toBeInTheDocument();

    rerender(
      <CertSecretFinder
        {...defaultProps}
        validationFlag={MandatorySecretsToWatchFor.BROKER_CERT}
        expectedSecretNames={['broker-cert']}
      />,
    );
    expect(screen.getByDisplayValue('broker-cert-secret')).toBeInTheDocument();
  });
});
