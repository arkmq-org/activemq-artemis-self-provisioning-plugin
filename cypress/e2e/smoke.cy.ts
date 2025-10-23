describe('Console login smoke', () => {
  it('logs in and lands on console', () => {
    cy.login('kubeadmin', Cypress.env('KUBEADMIN_PASSWORD'));
    cy.location('hostname', { timeout: 30000 }).should('eq', 'localhost');
  });
});

describe('Create Broker via UI', () => {
  it('logs in, navigates to brokers, creates a broker and then deletes it', () => {
    // Login
    cy.login('kubeadmin', Cypress.env('KUBEADMIN_PASSWORD'));

    // Navigate to all-namespaces brokers page
    cy.visit('/k8s/all-namespaces/brokers');

    // Ensure Brokers page loaded
    cy.contains('h1, [data-test="resource-title"]', /Brokers/i).should('exist');

    // Click Create Broker (button or anchor)
    cy.contains('button, a', /^Create Broker$/i)
      .scrollIntoView()
      .click();

    // Fill CR Name with a unique value
    const brokerName = `e2e-broker-${Date.now()}`;
    cy.get('#horizontal-form-name, input[name="horizontal-form-name"]')
      .should('be.visible')
      .clear()
      .type(brokerName);

    // Click Create
    cy.contains('button', /^Create$/i).click();

    // Navigate to all-namespaces brokers page to check the status
    cy.visit('/k8s/all-namespaces/brokers');

    // Wait for broker to be ready
    cy.contains('tr', brokerName, { timeout: 300000 }).should('exist');

    // Navigate to broker details page
    cy.visit(`/k8s/ns/default/brokers/${brokerName}`);

    // Check we are on the details page
    cy.contains('h1', brokerName).should('be.visible');

    // click on the kebab toggle
    cy.get('[data-testid="broker-toggle-kebab"]').should('be.visible').click();

    // click on delete broker
    cy.contains('a, button', /^Delete broker$/i)
      .should('be.visible')
      .click();

    // click on delete in the modal
    cy.get('button.pf-m-danger')
      .contains(/^Delete$/i)
      .should('be.visible')
      .click();

    // Check broker is deleted. We should be on the brokers list page after deletion.
    cy.contains('h1, [data-test="resource-title"]', /Brokers/i).should('exist');
    cy.get('body', { timeout: 30000 }).should('not.contain', brokerName);
  });
});
