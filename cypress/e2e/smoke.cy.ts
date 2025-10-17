describe('Console login smoke', () => {
  it('logs in and lands on console', () => {
    cy.getPassword().then((password) => {
      cy.login('kubeadmin', password);
    });
    cy.location('hostname', { timeout: 30000 }).should('eq', 'localhost');
    cy.get('h1', { timeout: 30000 })
      .should('contain', 'Overview')
      .and('be.visible');
  });
});

describe('Create Broker via UI', () => {
  it('logs in, navigates to brokers, creates a broker and then deletes it', () => {
    // Login
    cy.getPassword().then((password) => {
      cy.login('kubeadmin', password);
    });

    // Navigate to all-namespaces brokers page
    cy.visit('/k8s/all-namespaces/brokers', { timeout: 120000 });

    // Ensure Brokers page loaded
    cy.contains('h1, [data-test="resource-title"]', /Brokers/i, {
      timeout: 120000,
    }).should('exist');

    // Click Create Broker (button or anchor)
    cy.contains('button, a', /^Create Broker$/i, { timeout: 120000 })
      .scrollIntoView()
      .click();

    // Fill CR Name with a unique value
    const brokerName = `e2e-broker-${Date.now()}`;
    cy.get('#horizontal-form-name, input[name="horizontal-form-name"]', {
      timeout: 120000,
    })
      .should('be.visible')
      .clear()
      .type(brokerName);

    // Click Create
    cy.contains('button', /^Create$/i, { timeout: 120000 }).click();

    // Navigate to all-namespaces brokers page to check the status
    cy.visit('/k8s/all-namespaces/brokers', { timeout: 120000 });

    // Wait for broker to be ready
    cy.contains('tr', brokerName, { timeout: 300000 })
      .contains('5 OK / 5', { timeout: 300000 })
      .should('exist');

    // Navigate to broker details page
    cy.visit(`/k8s/ns/default/brokers/${brokerName}`, { timeout: 120000 });

    // Check we are on the details page
    cy.contains('h1', brokerName, { timeout: 120000 }).should('be.visible');

    // click on the kebab toggle
    cy.get('[data-testid="broker-toggle-kebab"]', { timeout: 120000 })
      .should('be.visible')
      .click();

    // click on delete broker
    cy.contains('a, button', /^Delete broker$/i, { timeout: 120000 })
      .should('be.visible')
      .click();

    // click on delete in the modal
    cy.get('button.pf-m-danger')
      .contains(/^Delete$/i, { timeout: 120000 })
      .should('be.visible')
      .click();

    // Check broker is deleted. We should be on the brokers list page after deletion.
    cy.contains('h1, [data-test="resource-title"]', /Brokers/i, {
      timeout: 120000,
    }).should('exist');
    cy.get('body', { timeout: 30000 }).should('not.contain', brokerName);
  });
});
