import { render, screen } from '@app/test-utils';
import { PodsList, PodsListProps } from './PodList';
import { useListPageFilter } from '@openshift-console/dynamic-plugin-sdk';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ListPageHeader: jest.fn(({ title }) => <div>{title}</div>),
  ListPageBody: jest.fn(({ children }) => <div>{children}</div>),
  ListPageFilter: jest.fn(() => <div>ListPageFilter</div>),
  useListPageFilter: jest.fn(),
}));

jest.mock('./PodsTable', () => ({
  PodsTable: jest.fn(() => <div>PodsTable component</div>),
}));

describe('PodsList', () => {
  const mockPodsListProps: PodsListProps = {
    brokerPods: [
      {
        metadata: { name: 'pod-1' },
        spec: {},
        status: { phase: 'Running' },
      },
      {
        metadata: { name: 'pod-2' },
        spec: {},
        status: { phase: 'Pending' },
      },
    ],
    loaded: true,
    loadError: null,
  };

  beforeEach(() => {
    (useListPageFilter as jest.Mock).mockReturnValue([
      mockPodsListProps.brokerPods,
      mockPodsListProps.brokerPods,
      jest.fn(),
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the PodsList component', () => {
    render(<PodsList {...mockPodsListProps} />);
    expect(screen.getByText('Pods')).toBeInTheDocument();
  });

  it('should render the ListPageFilter', () => {
    render(<PodsList {...mockPodsListProps} />);
    expect(screen.getByText('ListPageFilter')).toBeInTheDocument();
  });

  it('should render the PodsTable', () => {
    render(<PodsList {...mockPodsListProps} />);
    expect(screen.getByText('PodsTable component')).toBeInTheDocument();
  });
});
