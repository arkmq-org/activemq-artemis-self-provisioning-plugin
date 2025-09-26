import { FC, Suspense, useContext, useState } from 'react';
import {
  Alert,
  AlertActionCloseButton,
  AlertGroup,
  AlertProps,
  AlertVariant,
  useInterval,
} from '@patternfly/react-core';
import { Loading } from '@app/shared-components/Loading/Loading';
import {
  ArtemisReducerGlobalOperations,
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
} from '@app/reducers/reducer';
import YAML, { YAMLParseError } from 'yaml';
import './YamlEditorView.css';
import { ResourceYAMLEditor } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from '@app/i18n/i18n';

type YamlEditorViewPropTypes = {
  isAskingPermissionToClose: boolean;
  permissionGranted: () => void;
  permissionDenied: () => void;
};
export const YamlEditorView: FC<YamlEditorViewPropTypes> = ({
  isAskingPermissionToClose,
  permissionGranted: permissionGranted,
  permissionDenied,
}) => {
  const { t } = useTranslation();
  const formState = useContext(BrokerCreationFormState);
  const dispatch = useContext(BrokerCreationFormDispatch);

  const stringedFormState = YAML.stringify(formState.cr, null, '  ');
  const [alerts, setAlerts] = useState<Partial<AlertProps>[]>([]);

  const addAlert = (
    title: string,
    variant: AlertProps['variant'],
    key: React.Key,
  ) => {
    setAlerts((prevAlerts) => [...prevAlerts, { title, variant, key }]);
  };

  const removeAlert = (key: React.Key) => {
    const newAlerts = alerts.filter((alert) => alert.key !== key);
    setAlerts(newAlerts);
  };
  const removeLastAlert = () => {
    const newAlerts = alerts.filter(
      (_alert, i, alerts) => i !== alerts.length - 1,
    );
    setAlerts(newAlerts);
  };
  useInterval(removeLastAlert, alerts.length > 0 ? 2000 : null);

  const [currentYaml, setCurrentYaml] = useState<string>();
  const [yamlParseError, setYamlParserError] = useState<YAMLParseError>();

  const getUniqueId = () => new Date().getTime();

  const updateModel = (content: string) => {
    try {
      dispatch({
        operation: ArtemisReducerGlobalOperations.setModel,
        payload: { model: YAML.parse(content), isSetByUser: true },
      });
      setYamlParserError(undefined);
      addAlert(t('changes saved'), t('success'), getUniqueId());
      return true;
    } catch (e) {
      setYamlParserError(e as YAMLParseError);
      return false;
    }
  };

  const [prevIsAskingPermissionToClose, setPrevIsAskingPermissionToClose] =
    useState(isAskingPermissionToClose);
  if (isAskingPermissionToClose !== prevIsAskingPermissionToClose) {
    if (isAskingPermissionToClose) {
      if (formState.yamlHasUnsavedChanges) {
        if (updateModel(currentYaml)) {
          permissionGranted();
        } else {
          permissionDenied();
        }
      } else {
        permissionGranted();
      }
    }
    setPrevIsAskingPermissionToClose(isAskingPermissionToClose);
  }

  return (
    <>
      {yamlParseError !== undefined && (
        <Alert
          title={yamlParseError.message}
          variant={AlertVariant.danger}
          isInline
          actionClose
          className="pf-u-mt-md pf-u-mx-md"
        />
      )}
      <AlertGroup isToast isLiveRegion>
        {alerts.map(({ key, variant, title }) => (
          <Alert
            variant={AlertVariant[variant]}
            title={title}
            actionClose={
              <AlertActionCloseButton
                title={title as string}
                variantLabel={`${variant} alert`}
                onClose={() => removeAlert(key)}
              />
            }
            key={key}
          />
        ))}
      </AlertGroup>
      <Suspense fallback={<Loading />}>
        <ResourceYAMLEditor
          initialResource={formState.cr}
          onSave={updateModel}
          onChange={(newContent: string) => {
            setCurrentYaml(newContent);
            if (stringedFormState !== newContent) {
              dispatch({
                operation:
                  ArtemisReducerGlobalOperations.setYamlHasUnsavedChanges,
              });
            }
          }}
        />
      </Suspense>
    </>
  );
};
