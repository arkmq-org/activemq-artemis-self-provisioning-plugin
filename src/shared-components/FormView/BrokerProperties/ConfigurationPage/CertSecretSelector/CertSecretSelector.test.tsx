import { screen, render, fireEvent, act } from '@app/test-utils';
import { CertSecretSelector } from './CertSecretSelector';
import {
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
} from '@app/reducers/reducer';
import {
  useK8sWatchResource,
  k8sCreate,
} from '@openshift-console/dynamic-plugin-sdk';
import { useHasCertManager } from '../../../../../k8s/customHooks';
import { ConfigType } from '../ConfigurationPage';
import {
  getAcceptor,
  getCertManagerResourceTemplateFromAcceptor,
  getConfigSecret,
} from '@app/reducers/7.12/reducer';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn(),
  k8sCreate: jest.fn(),
}));

jest.mock('../../../../../k8s/customHooks', () => ({
  useHasCertManager: jest.fn(),
}));

jest.mock('@app/reducers/7.12/reducer', () => ({
  ArtemisReducerOperations712: jest.fn(() => (
    <div>Mocked ArtemisReducerOperations712</div>
  )),
  getAcceptor: jest.fn(),
  getCertManagerResourceTemplateFromAcceptor: jest.fn(),
  getConfigSecret: jest.fn(),
}));

jest.mock('./CertificateDetailsModal/CertificateDetailsModal', () => ({
  CertificateDetailsModal: ({
    isModalOpen,
    certs,
    secretName,
    pem,
    onCloseModal,
  }: {
    isModalOpen: boolean;
    certs: string[];
    secretName: string;
    pem: string;
    onCloseModal: () => void;
  }) =>
    isModalOpen ? (
      <div data-testid="cert-details-modal">
        <p>Modal open for {secretName}</p>
        <p>Certs count: {certs.length}</p>
        <p>PEM: {pem}</p>
        <button onClick={onCloseModal}>Close Modal</button>
      </div>
    ) : null,
}));

describe('CertSecretSelector', () => {
  const mockUseK8sWatchResource = useK8sWatchResource as jest.Mock;
  const mockK8sCreate = k8sCreate as jest.Mock;
  const mockUseHasCertManager = useHasCertManager as jest.Mock;
  const mockGetAcceptor = getAcceptor as jest.Mock;
  const mockGetCertManagerResourceTemplateFromAcceptor =
    getCertManagerResourceTemplateFromAcceptor as jest.Mock;
  const mockGetConfigSecret = getConfigSecret as jest.Mock;

  const mocDispatch = jest.fn();
  const mockFormState = {
    cr: {
      apiVersion: 'v1',
      metadata: { name: 'test-broker', namespace: 'test-namespace' },
    },
  };
  const mockSecrets = [
    {
      apiVersion: 'v1',
      metadata: {
        name: 'Good-cert-secret',
        namespace: 'test-secret-namespace',
        annotations: {
          'cert-manager.io/issuer-name': 'test-issuer',
        },
      },
      data: {
        'ca.crt':
          'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJlRENDQVIyZ0F3SUJBZ0lSQU5oQ3VUQjljYlFZLzVGY1JhT1dkUVl3Q2dZSUtvWkl6ajBFQXdJd0d6RVoKTUJjR0ExVUVBeE1RYlhrdGMyVnNabk5wWjI1bFpDMWpZVEFlRncweU5URXdNekF4TVRFMU5ETmFGdzB5TmpBeApNamd4TVRFMU5ETmFNQnN4R1RBWEJnTlZCQU1URUcxNUxYTmxiR1p6YVdkdVpXUXRZMkV3V1RBVEJnY3Foa2pPClBRSUJCZ2dxaGtqT1BRTUJCd05DQUFSMTRhZWhuNEFpWHZvQ2w4akYxeE5VSVpLd21oRkZpak8yL2dtNU96aWgKcElpZS9RWXQxdU9RUnBuektvSCtOeTJNMW5oTHZ3TUlWSkdMR2xydHBuTk1vMEl3UURBT0JnTlZIUThCQWY4RQpCQU1DQXFRd0R3WURWUjBUQVFIL0JBVXdBd0VCL3pBZEJnTlZIUTRFRmdRVWxZRzJNbTRQcVJrVTBmODA5Skh5CnJsVjRGZGt3Q2dZSUtvWkl6ajBFQXdJRFNRQXdSZ0loQUp1OTZUSkNtUGh2MUtsY1hWenRwVW9ldXB5ZDZxLzEKaXlOZHpuc2daMzR0QWlFQW9KMlJkLzdmUFpGMU14cjlQenNiUW9yYytRbGl6eGlYWVQ1RFFPSHoyZUU9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
        'tls.crt':
          'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNoVENDQWl1Z0F3SUJBZ0lSQU9qblRERTN6cmphblMvaUdCem03alV3Q2dZSUtvWkl6ajBFQXdJd0d6RVoKTUJjR0ExVUVBeE1RYlhrdGMyVnNabk5wWjI1bFpDMWpZVEFlRncweU5URXdNekF4TVRFMk1EZGFGdzB5TmpBeApNamd4TVRFMk1EZGFNQnN4R1RBWEJnTlZCQU1URUdWNExXRmhieTFoWTJObGNIUnZjbk13Z2dFaU1BMEdDU3FHClNJYjNEUUVCQVFVQUE0SUJEd0F3Z2dFS0FvSUJBUURMU3RoK1dncDZQUTFVQ2V3M3B0Tm9sYlAwL1FRZzhZQkwKLzJaS09OajEvQ2ZUWEFZZ3Y4QW40ZG1JRG5NUE4wcjMya0tKZmJFZWxuZTM2cEhmWUV4UUhnTWx2MTI2MFpBWQo2eW9qMitWWUw5dFV0eXFEeHJpMzZsdGxqQXFnWHJQS2pJUFJNM29EUDNrcVozdlkxS1EzV2NCRDBmdmRzUkNMCldhR3hYZXNyM2YrNmFYVzNVdzE3Vk1POCtWNWQzUkg1d1Q3OU5SOHdYUmZTZXpNQ3pxc3c1b0NBbUxTRWwrVFAKYmdSNHpuQnFlOEo3YlBaQUdtSitwcWEwZzJzMDJNbDgvc01yT0xkbHpYV1lJbUJqUUdsc3E3dGswb1NQdHg5ZApIY3ZqOEY4WGYza3FYb2tqRlNMQ1poZ0FWd3FTcXZPbHFNeUtNMldBMlpKa0xLdjhMNm5CQWdNQkFBR2pnWVF3CmdZRXdEZ1lEVlIwUEFRSC9CQVFEQWdXZ01Bd0dBMVVkRXdFQi93UUNNQUF3SHdZRFZSMGpCQmd3Rm9BVWxZRzIKTW00UHFSa1UwZjgwOUpIeXJsVjRGZGt3UUFZRFZSMFJCRGt3TjRJMVpYZ3RZV0Z2TFhOekxUQXVaWGd0WVdGdgpMV2hrYkhNdGMzWmpMbVJsWm1GMWJIUXVjM1pqTG1Oc2RYTjBaWEl1Ykc5allXd3dDZ1lJS29aSXpqMEVBd0lEClNBQXdSUUloQU1WUjVTK2F1NllIbGZZeVBtVHhzTFBqdkdDWWcwWGlFVEtXaHhyM1Bac3dBaUFxT3NRZFU1Z3EKWklTbXk5QllOTFFCRGpmYlE3ZFF3T2pzVUNiUmhoelpUQT09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
        'tls.key':
          'LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBeTByWWZsb0tlajBOVkFuc042YlRhSld6OVAwRUlQR0FTLzltU2pqWTlmd24wMXdHCklML0FKK0haaUE1ekR6ZEs5OXBDaVgyeEhwWjN0K3FSMzJCTVVCNERKYjlkdXRHUUdPc3FJOXZsV0MvYlZMY3EKZzhhNHQrcGJaWXdLb0Y2enlveUQwVE42QXo5NUttZDcyTlNrTjFuQVE5SDczYkVRaTFtaHNWM3JLOTMvdW1sMQp0MU1OZTFURHZQbGVYZDBSK2NFKy9UVWZNRjBYMG5zekFzNnJNT2FBZ0ppMGhKZmt6MjRFZU01d2FudkNlMnoyClFCcGlmcWFtdElOck5OakpmUDdES3ppM1pjMTFtQ0pnWTBCcGJLdTdaTktFajdjZlhSM0w0L0JmRjM5NUtsNkoKSXhVaXdtWVlBRmNLa3FyenBhak1pak5sZ05tU1pDeXIvQytwd1FJREFRQUJBb0lCQURVbzNjTHdwYlBBV2tkagpEdCtnb3NEREFOdHIvRlBuQXY4Y2lyR1crdmtjRm9mNUZPc2thVW1rai84NWxCSGpDaG9VKzNnN280RFZwUG0xCmY2NnpYbEZHLzlpem1YMThSbHVWeHgrNFpWa3hybitSSkM5d1hDWlB4Tldoa0xmTisrTFg2ckplYlNZRFI1cDAKbEJpbnhrZHBFMU5JeWoxM0MxWDlPc0NJU0RKZ2RDUGs3VmRzelRrVjd3RWVZeEF3dWs3eXQ4TTFRRzQwRnM2eQpvMUhobVN6OE5xaFU0Yi8zWVpIbW84Y25kcTgrc1dzRzJNSWttenZjQUxzdlJ5ejQwRWRNWjJKamI0L1AvenFXCkZHMlZZNEFhNnhPT29ORzNIanBUTHRpalViN2NpaUZKZmpOL1pEbFZ3M2NUbHVQSEZwVElOMHNWOFZwOUhOblgKQjdhUGQ3OENnWUVBNlJHLzA5WkpDZkVqTjJjT2J4YXV4SVNIY0ZKOXRYRE1HZkUzK3JCV1o4bDZjWXJwYW9UZQpSRWxHY0xZK29qc014VnFsb1Z4Tzc2QkpHZllaT0dKaGQwd2dlamcvV2ZEcWRmbU1TbnltZDFCRE4vZXpMQzhyCnZWV25rTENST1VFSzlvK0huZ05XVFRBOVlVV1J0YklvcGl0dlVQeVJpdHYyZVVFeXR1N3BTYnNDZ1lFQTMwc2MKeFZ2bzFaV3hoellLcVFmcjZ3bElqakFtWXFzWjNHb2VMbFFON3dwV2JSTnU0OTY5YzF5OFlTRjNleldENEl4aApiWUgvWmI3LzR4ek8xSmpTRFAwcVI0RFQrZHFQdEI4Zmg2YTIyWHB4dG1Va2VuQW4xa0ZQZ21mRHBSdFdZMGhPCkk0bWFLbWFFa2c4bHRrZy9DK0VQanRsQW1lT05jaktjWE1YRGxMTUNnWUJwQWNVeWxRNE5PNmFKTkpaTk9LUC8KQ0ZMWktXRlgyUDBzQndFWW9sQWJyS3ZNOGpBZC9NVURjUndhZGhHY0dBeTE4aFJEc2dvaWJrM2hNMzdEWjVmUQpIdTFYQTNhUGVEcTZjbmRocSsxNFBpSTYyZy9RcldRQWh0SGJINkllY0k2VzdhM0ZaRzJDazJSa0tlcnZPTmlWCm5XWW16OVJuQXBsMm9naE9ZUytjTndLQmdIUjRNV0dnTnlweEVsQjhsOExqSnVOSnpGYWVOdWR3WitUWVZUWEYKRWgrRlBOOVlLNWNnTDZGazFiMjBQeVk5RzdTY2hKVWlJWjFvcXdCRG5uNjExNXArMHZiSTg4aDNnRTFyam42cgpMdVR4UVM3cVFzUzZpNHp1TkJMSkhQdVo3czJLZ1hkMzVyb0hEMDlBSjJPVSs0MnVydmJMeXk1NXl1V3VFSEV6CmxuaVJBb0dCQU9SMFY0RXFiQ1k4Njk2amEwaUNKNXZUeGdHRDdmMy9HRzAxNElvUDVsMlN4WDRPV3lvNHZydWkKdzlPTzdhRDFabERQeWZZeVJLck5EbkFnYTdwZzBUYlBQTzR3UGo2Q2lvcFhjUGdPSHRUeXdQWndKRTdPTkdUYgpmclE4YWJISjlsNExOU2RlT0k0YXhQV1EyL0c4Wmh3YVNBWFR2Q1VSb3J1eEN2YmplbnRoCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==',
      },
    },
    {
      apiVersion: 'v1',
      metadata: {
        name: 'bad-cert-secret',
        namespace: 'test-secret-namespace',
        annotations: {
          'cert-manager.io/issuer-name': 'test-issuer',
        },
      },
      data: {
        'ca.crt': 'encoded-ca',
        'tls.crt': 'encoded-cert',
        'tls.key': 'encoded cert-key',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHasCertManager.mockReturnValue({
      hasCertManager: true,
      isLoading: true,
      error: null,
    });
    mockGetAcceptor.mockReturnValue({ metadata: { name: 'mock-acceptor' } });
    mockGetCertManagerResourceTemplateFromAcceptor.mockReturnValue({
      data: 'mock-template',
    });
    mockGetConfigSecret.mockReturnValue('Good-cert-secret');
  });

  it('should renders Generate button, selects certificate and shows certificate info', async () => {
    mockUseK8sWatchResource.mockReturnValue([mockSecrets, false, null]);
    mockK8sCreate.mockResolvedValue({ metadata: { name: 'Good-cert-secret' } });

    render(
      <BrokerCreationFormState.Provider value={mockFormState}>
        <BrokerCreationFormDispatch.Provider value={mocDispatch}>
          <CertSecretSelector
            namespace="test-namespace"
            isCa={false}
            configType={ConfigType.acceptors}
            configName="my-broker"
            canSetCustomNames={true}
          />
        </BrokerCreationFormDispatch.Provider>
      </BrokerCreationFormState.Provider>,
    );
    // step 1: Verify 'Cert Secrets' label should present
    expect(screen.getByText('Cert Secrets')).toBeInTheDocument();

    // Step 2: Verify Generate button visible
    const generateBtn = screen.getByRole('button', { name: /generate/i });
    expect(generateBtn).toBeInTheDocument();

    // Step 3: Ensure typeahead is present
    const typeahead = screen.getByPlaceholderText(/select a certificate/i);
    expect(typeahead).toBeInTheDocument();

    // Step 4: Open the typeahead dropdown
    const toggleButton = screen.getByRole('button', {
      name: /typeahead menu toggle/i,
    });
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    // Step 5: Wait for the dropdown option (your secret name) to appear
    const secretOption = await screen.findByText('Good-cert-secret');
    expect(secretOption).toBeInTheDocument();

    // Step 6: Select the secret from dropdown
    await act(async () => {
      fireEvent.click(secretOption);
    });

    // Step 5: Info icon should now be enabled
    const infoBtn = screen.getByRole('button', { name: /view cert/i });
    expect(infoBtn).not.toBeDisabled();

    // Step 6: Click Info button should open the cert-details modal
    await act(async () => {
      fireEvent.click(infoBtn);
    });
    expect(await screen.findByTestId('cert-details-modal')).toBeInTheDocument();
    expect(
      await screen.findByText('Modal open for Good-cert-secret'),
    ).toBeInTheDocument();
  });
});
