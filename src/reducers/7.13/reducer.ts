import { BrokerCR } from '@app/k8s/types';
import {
  areMandatoryValuesSet712,
  ArtemisReducerActions712,
  reducer712,
} from '../7.12/reducer';
import { FormState713 } from './import-types';

// Operations for 7.13 start at number 2000
export enum ArtemisReducerOperations713 {
  isUsingToken = 2000,
  setServiceAccount,
  setJaasExtraConfig,
  setSecurityRoles,
}

export type ReducerActionBase = {
  operation: ArtemisReducerOperations713;
};

interface IsUsingTokenAction extends ReducerActionBase {
  operation: ArtemisReducerOperations713.isUsingToken;
  /** set to true for token auth, false for username password*/
  payload: boolean;
}

interface SetServiceAccountAction extends ReducerActionBase {
  operation: ArtemisReducerOperations713.setServiceAccount;
  /** set the service account for the broker*/
  payload: string;
}

interface SetJaasExtraConfigAction extends ReducerActionBase {
  operation: ArtemisReducerOperations713.setJaasExtraConfig;
  /** The name of the secret for the jass login module*/
  payload: string;
}

interface SetSecurityRolesAction extends ReducerActionBase {
  operation: ArtemisReducerOperations713.setSecurityRoles;
  /** The name of the secret for the jass login module*/
  payload: Map<string, string>;
}

// 7.13 is 7.12 + extras
export type ArtemisReducerActions713 =
  | ArtemisReducerActions712
  | IsUsingTokenAction
  | SetJaasExtraConfigAction
  | SetSecurityRolesAction
  | SetServiceAccountAction;

export const reducer713: React.Reducer<
  FormState713,
  ArtemisReducerActions713
> = (prevFormState, action) => {
  const formState = { ...prevFormState };

  switch (action.operation) {
    case ArtemisReducerOperations713.isUsingToken:
      if (action.payload) {
        delete formState.cr.spec.adminPassword;
        delete formState.cr.spec.adminUser;
        setEnvForTokenAuth(formState.cr);
      } else {
        formState.cr.spec.adminPassword = 'admin';
        formState.cr.spec.adminUser = 'admin';
        delete formState.cr.spec.deploymentPlan.extraMounts;
        delete formState.cr.spec.deploymentPlan.podSecurity;
        // reinitialise the related fields
        deleteEnvForTokenAuth(formState.cr);
        // delete the security roles
        replaceSecurityRoles(formState.cr, new Map());
      }
      return formState;
    case ArtemisReducerOperations713.setJaasExtraConfig:
      // reset the security roles, they will be updated later when the secret is
      // known
      replaceSecurityRoles(formState.cr, new Map());
      if (!action.payload) {
        delete formState.cr.spec.deploymentPlan.extraMounts;
      } else {
        formState.cr.spec.deploymentPlan.extraMounts = {
          secrets: [action.payload],
        };
      }
      return formState;
    case ArtemisReducerOperations713.setSecurityRoles:
      replaceSecurityRoles(formState.cr, action.payload);
      return formState;
    case ArtemisReducerOperations713.setServiceAccount:
      if (!action.payload) {
        delete formState.cr.spec.deploymentPlan.podSecurity;
      } else {
        formState.cr.spec.deploymentPlan.podSecurity = {
          serviceAccountName: action.payload,
        };
      }
      return formState;
    default:
      return reducer712(
        formState,
        action as ArtemisReducerActions712,
      ) as FormState713;
  }
};

export const areMandatoryValuesSet713 = (formState: FormState713) => {
  // if the user wants to configure the token review and has not set the
  // required data, return false.
  if (formState.cr.spec.adminUser === undefined) {
    if (!formState.cr?.spec?.deploymentPlan?.extraMounts?.secrets[0]) {
      return false;
    }
    if (!formState.cr?.spec?.deploymentPlan?.podSecurity?.serviceAccountName) {
      return false;
    }
  }
  return areMandatoryValuesSet712(formState);
};

/**
 * Add a JAVA_ARGS_APPEND env variable that contains the -Dhawtio.realm=token
 * parameter. If the env already exists, the parameter is appended to it. If not
 * it is created.
 */
const setEnvForTokenAuth = (cr: BrokerCR) => {
  const basicJavaArgs = {
    name: 'JAVA_ARGS_APPEND',
    value: '-Dhawtio.realm=token',
  };
  if (!cr.spec.env) {
    cr.spec.env = [basicJavaArgs];
  } else {
    const javaArgs = cr.spec.env.find((v) => v.name === 'JAVA_ARGS_APPEND');
    if (javaArgs) {
      if (!javaArgs.value.includes('-Dhawtio.realm=token')) {
        javaArgs.value = javaArgs.value + ' ' + '-Dhawtio.realm=token';
      }
    } else {
      cr.spec.env.push(basicJavaArgs);
    }
  }
};

/**
 * Delete -Dhawtio.realm=token from the env JAVA_ARGS_APPEND. If it was the last
 * argument of the env, delete the env.
 */
const deleteEnvForTokenAuth = (cr: BrokerCR) => {
  if (cr.spec.env) {
    const javaArgs = cr.spec.env.find((v) => v.name === 'JAVA_ARGS_APPEND');
    if (javaArgs) {
      if (javaArgs.value.includes('-Dhawtio.realm=token')) {
        const splitValue = javaArgs.value.split(' ');
        if (splitValue.length > 1) {
          javaArgs.value = splitValue
            .filter((v) => v !== '-Dhawtio.realm=token')
            .join(' ');
        } else {
          cr.spec.env = cr.spec.env.filter(
            (v) => v.name !== 'JAVA_ARGS_APPEND',
          );
        }
      }
    }
    if (cr.spec.env.length === 0) {
      delete cr.spec.env;
    }
  }
};

/**
 * Return all the security roles of the CR as a Map<string, string>
 */
export const getSecurityRoles = (cr: BrokerCR) => {
  if (cr.spec?.brokerProperties?.length > 0) {
    return new Map<string, string>(
      cr.spec.brokerProperties
        .filter((property) => property.startsWith('securityRoles'))
        .map((property) => {
          const key = property.split('=')[0];
          const value = property.split('=')[1];
          return [key, value];
        }),
    );
  }
  return new Map<string, string>();
};

/**
 * Replace all the security roles of the CR, order matters.
 */
export const replaceSecurityRoles = (
  cr: BrokerCR,
  newSecurityRoles: Map<string, string>,
) => {
  if (cr.spec?.brokerProperties?.length > 0) {
    // delete all the previous security roles
    cr.spec.brokerProperties = cr.spec.brokerProperties.filter(
      (property) => !property.startsWith('securityRoles'),
    );
  }
  if (newSecurityRoles) {
    if (!cr.spec?.brokerProperties) {
      cr.spec.brokerProperties = [];
    }
    newSecurityRoles.forEach((v, k) =>
      cr.spec.brokerProperties.push(k + '=' + v),
    );
  }
};

/**
 * Create a new set of security roles for a given list of roles coming from the
 * jass config. The lines must contain a valid entry composed of
 * $rolename=$users. The roles are extracted and then used to populate the
 * security entries associated to them.
 */
export const getInitSecurityRoles = (lines: string[]) => {
  const roles = lines
    .filter((role) => role.includes('='))
    .map((role) => role.split('=')[0]);
  return roles
    .map(
      (role) =>
        new Map([
          ['securityRoles.*.' + role + '.browse', 'true'],
          ['securityRoles.*.' + role + '.consume', 'true'],
          ['securityRoles.*.' + role + '.createAddress', 'true'],
          ['securityRoles.*.' + role + '.createDurableQueue', 'true'],
          ['securityRoles.*.' + role + '.createNonDurableQueue', 'true'],
          ['securityRoles.*.' + role + '.deleteAddress', 'true'],
          ['securityRoles.*.' + role + '.deleteDurableQueue', 'true'],
          ['securityRoles.*.' + role + '.deleteNonDurableQueue', 'true'],
          ['securityRoles.*.' + role + '.edit', 'true'],
          ['securityRoles.*.' + role + '.manage', 'true'],
          ['securityRoles.*.' + role + '.send', 'true'],
          ['securityRoles.*.' + role + '.view', 'true'],
        ]),
    )
    .reduce((prev, current) => new Map([...prev, ...current]));
};
