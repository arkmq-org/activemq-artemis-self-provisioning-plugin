// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

/// <reference types="cypress" />

function loginToOpenshift(username: string, password: string) {
  cy.visit('/');

  cy.origin(
    'https://oauth-openshift.apps-crc.testing',
    { args: { username, password } },
    ({ username, password }) => {
      cy.get('input#inputUsername').clear().type(username);
      cy.get('input#inputPassword').type(password, { log: false });
      cy.contains('button[type=submit]', 'Log in').click();
    },
  );

  cy.location('hostname', { timeout: 10000 }).should('eq', 'localhost');
}

Cypress.Commands.add(
  'login',
  (username = 'kubeadmin', password = 'kubeadmin') => {
    function loginToOpenshiftViaUI(username: string, password: string) {
      const log = Cypress.log({
        displayName: 'AUTH0 LOGIN',
        message: [`🔐 Authenticating | ${username}`],
        autoEnd: false,
      });
      log.snapshot('before');

      loginToOpenshift(username, password);

      log.snapshot('after');
      log.end();
    }
    cy.session(`auth-${username}`, () => {
      loginToOpenshiftViaUI(username, password);
    });
    cy.visit('/');
    cy.get('#tour-step-footer-secondary').click();
  },
);

Cypress.Commands.add('getPassword', () => {
  return cy.exec('crc console --credentials').then((result) => {
    const creds = result.stdout;
    const password = creds.match(/(?<=kubeadmin -p ).*(?= https)/)?.[0];
    if (!password) {
      throw new Error(
        'Could not extract kubeadmin password from crc credentials.',
      );
    }
    return password;
  });
});
