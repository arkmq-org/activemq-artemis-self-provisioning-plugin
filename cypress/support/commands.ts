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
        displayName: 'LOGIN',
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
    cy.visit('/', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem(
          'console-user-settings',
          '{"console.lastPerspective":"admin","console.perspective.visited.admin":true,"console.perspective.visited.dev":true,"console.guidedTour":{"admin":{"completed":true},"dev":{"completed":true}}}',
        );
      },
    });
  },
);
