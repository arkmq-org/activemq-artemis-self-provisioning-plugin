import { FC, useState } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Level,
  LevelItem,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { PreConfirmDeleteModal } from '../../../view-brokers/components/PreConfirmDeleteModal/PreConfirmDeleteModal';
import { useTranslation } from '@app/i18n/i18n';
import { k8sDelete } from '@openshift-console/dynamic-plugin-sdk';
import { AMQBrokerModel } from '@app/k8s/models';
import { useNavigate } from 'react-router-dom-v5-compat';

export type BrokerDetailsBreadcrumbProps = {
  name: string;
  namespace: string;
};

const BrokerDetailsBreadcrumb: FC<BrokerDetailsBreadcrumbProps> = ({
  name,
  namespace,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [_loadError, setLoadError] = useState<any>();
  const navigate = useNavigate();

  const redirectPath = `/k8s/ns/${namespace}/brokers`;

  const onClickEditBroker = () => {
    const currentPath = window.location.pathname;
    navigate(
      `/k8s/ns/${namespace}/edit-broker/${name}?returnUrl=${encodeURIComponent(
        currentPath,
      )}`,
    );
  };

  const onClickDeleteBroker = () => {
    setIsModalOpen(!isModalOpen);
  };

  const onOpenModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const onToggle = () => {
    setIsOpen(!isOpen);
  };

  const onDeleteBroker = () => {
    k8sDelete({
      model: AMQBrokerModel,
      resource: { metadata: { name, namespace: namespace } },
    })
      .then(() => {
        navigate(redirectPath);
      })
      .catch((e) => {
        setLoadError(e.message);
      });
  };

  const onSelect = () => {
    setIsOpen(false);
  };

  return (
    <>
      <Level>
        <LevelItem>
          <Breadcrumb className="pf-u-ml-sm pf-u-mt-sm">
            <BreadcrumbItem>
              <Button variant="link" onClick={() => navigate(redirectPath)}>
                {t('Brokers')}
              </Button>
            </BreadcrumbItem>
            <BreadcrumbItem isActive>
              {t('Broker')} {name}
            </BreadcrumbItem>
          </Breadcrumb>
        </LevelItem>
        <LevelItem>
          <Dropdown
            isOpen={isOpen}
            onSelect={onSelect}
            onOpenChange={(isOpen: boolean) => setIsOpen(isOpen)}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                aria-label="kebab dropdown"
                variant="plain"
                onClick={onToggle}
                isExpanded={isOpen}
                data-testid="broker-toggle-kebab"
              >
                <EllipsisVIcon />
              </MenuToggle>
            )}
            popperProps={{ position: 'right' }}
            shouldFocusToggleOnSelect
          >
            <DropdownList>
              <DropdownItem key="edit-broker" onClick={onClickEditBroker}>
                {t('Edit Broker')}
              </DropdownItem>
              <DropdownItem key="delete-broker" onClick={onClickDeleteBroker}>
                {t('Delete Broker')}
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        </LevelItem>
      </Level>
      <PreConfirmDeleteModal
        onDeleteButtonClick={onDeleteBroker}
        isModalOpen={isModalOpen}
        onOpenModal={onOpenModal}
        name={name}
      />
    </>
  );
};

export { BrokerDetailsBreadcrumb };
