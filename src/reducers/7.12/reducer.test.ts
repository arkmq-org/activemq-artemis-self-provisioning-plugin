import {
  ArtemisReducerOperations712,
  ExposeMode,
  reducer712,
  newBroker712CR,
} from './reducer';

describe('test the creation broker reducer', () => {
  it('test addAcceptor', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    expect(newState.cr.spec.acceptors).toHaveLength(1);
    expect(newState.cr.spec.acceptors[0].name).toBe('acceptors0');
    expect(newState.cr.spec.acceptors[0].port).toBe(5555);
    expect(newState.cr.spec.acceptors[0].protocols).toBe('ALL');
    expect(newState.cr.spec.brokerProperties).toHaveLength(1);
    expect(newState.cr.spec.brokerProperties).toContain(
      'acceptorConfigurations.acceptors0.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.netty.NettyAcceptorFactory',
    );
  });

  it('test addConnector', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    expect(newState.cr.spec.connectors).toHaveLength(1);
    expect(newState.cr.spec.connectors[0].name).toBe('connectors0');
    expect(newState.cr.spec.connectors[0].port).toBe(5555);
    expect(newState.cr.spec.connectors[0].host === 'localhost');
    expect(newState.cr.spec.brokerProperties).toHaveLength(1);
    expect(newState.cr.spec.brokerProperties).toContain(
      'connectorConfigurations.connectors0.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.netty.NettyAcceptorFactory',
    );
  });

  it('test replicas decrementReplicas', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.decrementReplicas,
    });
    // default size is 1 decrementing should result of a size of 0
    expect(newState.cr.spec.deploymentPlan.size).toBe(0);
    // set the number of replicas to 10 before decrementing so that the total
    // number should be 9
    const newState2 = reducer712(
      reducer712(newState, {
        operation: ArtemisReducerOperations712.setReplicasNumber,
        payload: 10,
      }),
      {
        operation: ArtemisReducerOperations712.decrementReplicas,
      },
    );
    expect(newState2.cr.spec.deploymentPlan.size).toBe(9);
  });

  it('tests that the deployment replicas value cannot be decremented below 0', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.decrementReplicas,
    });
    // default size is 1 decrementing should result of a size of 0
    expect(newState.cr.spec.deploymentPlan.size).toBe(0);
    // Set the number of replicas to -1 and verify that the deployment replicas value cannot be decremented below 0.
    // The number should be set to 0.
    const newState2 = reducer712(
      reducer712(newState, {
        operation: ArtemisReducerOperations712.setReplicasNumber,
        payload: -1,
      }),
      {
        operation: ArtemisReducerOperations712.decrementReplicas,
      },
    );
    expect(newState2.cr.spec.deploymentPlan.size).toBe(0);
  });

  it('test deleteAcceptor', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const newState2 = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.deleteAcceptor,
      payload: 'acceptors0',
    });
    expect(newState2.cr.spec.acceptors).toHaveLength(0);
    expect(newState2.cr.spec.brokerProperties).not.toContain(
      'acceptorConfigurations.acceptors0.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.netty.NettyAcceptorFactory',
    );
  });

  it('test deleteConnector', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Connector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const newState2 = reducer712(stateWith1Connector, {
      operation: ArtemisReducerOperations712.deleteConnector,
      payload: 'connectors0',
    });
    expect(newState2.cr.spec.connectors).toHaveLength(0);
    expect(newState2.cr.spec.brokerProperties).not.toContain(
      'connectorConfigurations.connectors0.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.netty.NettyAcceptorFactory',
    );
  });

  it('test incrementReplicas', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.incrementReplicas,
    });
    // default size is 1 decrementing should result of a size of 1
    expect(newState.cr.spec.deploymentPlan.size).toBe(2);
  });

  it('test incrementReplicas', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.incrementReplicas,
    });
    // default size is 1 decrementing should result of a size of 1
    expect(newState.cr.spec.deploymentPlan.size).toBe(2);
  });

  it('test setAcceptorBindToAllInterfaces', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    expect(stateWith1Acceptor.cr.spec.acceptors[0].bindToAllInterfaces).toBe(
      undefined,
    );
    const newState2 = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setAcceptorBindToAllInterfaces,
      payload: {
        name: 'acceptors0',
        bindToAllInterfaces: true,
      },
    });
    expect(newState2.cr.spec.acceptors[0].bindToAllInterfaces).toBe(true);
    const newState3 = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setAcceptorBindToAllInterfaces,
      payload: {
        name: 'acceptors0',
        bindToAllInterfaces: false,
      },
    });
    expect(newState3.cr.spec.acceptors[0].bindToAllInterfaces).toBe(false);
  });

  it('test setAcceptorName', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const newState2 = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setAcceptorName,
      payload: {
        oldName: 'acceptors0',
        newName: 'superName',
      },
    });
    expect(newState2.cr.spec.acceptors[0].name).toBe('superName');
    expect(newState2.cr.spec.brokerProperties).toContain(
      'acceptorConfigurations.superName.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.netty.NettyAcceptorFactory',
    );
  });

  it('test renaming an acceptor to an existing name to have no effect', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const stateWith2Acceptor = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const newState3 = reducer712(stateWith2Acceptor, {
      operation: ArtemisReducerOperations712.setAcceptorName,
      payload: {
        oldName: 'acceptors1',
        newName: 'acceptors0',
      },
    });
    expect(newState3.cr.spec.acceptors[0].name).toBe('acceptors0');
    expect(newState3.cr.spec.acceptors[1].name).toBe('acceptors1');
  });

  it('test setAcceptorOtherParams', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const newState2 = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setAcceptorOtherParams,
      payload: {
        name: 'acceptors0',
        otherParams: new Map<string, string>([
          ['aKey', 'aValue'],
          ['bKey', 'bValue'],
        ]),
      },
    });
    expect(newState2.cr.spec.brokerProperties).toContain(
      'acceptorConfigurations.acceptors0.params.aKey=aValue',
    );
    expect(newState2.cr.spec.brokerProperties).toContain(
      'acceptorConfigurations.acceptors0.params.bKey=bValue',
    );
    const newState3 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.setAcceptorOtherParams,
      payload: {
        name: 'acceptors0',
        otherParams: new Map<string, string>([['aKey', 'aValue']]),
      },
    });
    expect(newState3.cr.spec.brokerProperties).toContain(
      'acceptorConfigurations.acceptors0.params.aKey=aValue',
    );
    expect(newState3.cr.spec.brokerProperties).not.toContain(
      'acceptorConfigurations.acceptors0.params.bKey=bValue',
    );
  });

  it('should assigns unique ports to each new acceptor added', () => {
    const initialState = newBroker712CR('namespace');

    // Add the first acceptor
    let newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    expect(newState.cr.spec.acceptors[0].port).toBe(5555);

    // Add a second acceptor
    newState = reducer712(newState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    expect(newState.cr.spec.acceptors[1].port).toBe(5556);

    // Add a third acceptor
    newState = reducer712(newState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    expect(newState.cr.spec.acceptors[2].port).toBe(5557);
  });

  it('test setAcceptorPort', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const newState2 = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setAcceptorPort,
      payload: {
        name: 'acceptors0',
        port: 6666,
      },
    });
    expect(newState2.cr.spec.acceptors[0].port).toBe(6666);
  });

  it('should increments next acceptor port based on manually set port value', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    let newState2 = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setAcceptorPort,
      payload: {
        name: 'acceptors0',
        port: 6666,
      },
    });
    expect(newState2.cr.spec.acceptors[0].port).toBe(6666);

    newState2 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    expect(newState2.cr.spec.acceptors[1].port).toBe(6667);
  });

  it('test setAcceptorProtocols', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const newState2 = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setAcceptorProtocols,
      payload: {
        configName: 'acceptors0',
        protocols: 'ALL,SOMETHING',
      },
    });
    expect(newState2.cr.spec.acceptors[0].protocols).toBe('ALL,SOMETHING');
  });

  it('test setAcceptorSSLEnabled', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const newState2 = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setAcceptorSSLEnabled,
      payload: {
        name: 'acceptors0',
        sslEnabled: true,
      },
    });
    expect(newState2.cr.spec.acceptors[0].sslEnabled).toBe(true);
  });

  it('test setAcceptorSecret', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const newState2 = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setAcceptorSecret,
      payload: {
        name: 'acceptors0',
        isCa: false,
        secret: 'toto',
      },
    });
    expect(newState2.cr.spec.acceptors[0].sslSecret).toBe('toto');
    const newState3 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.setAcceptorSecret,
      payload: {
        name: 'acceptors0',
        isCa: true,
        secret: 'toto',
      },
    });
    expect(newState3.cr.spec.acceptors[0].trustSecret).toBe('toto');
  });

  it('test setBrokerName', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setBrokerName,
      payload: 'newName',
    });
    expect(newState.cr.metadata.name).toBe('newName');
  });

  // enchaine avec le lwoercase
  it('test setConnectorBindToAllInterfaces', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Connector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    expect(stateWith1Connector.cr.spec.connectors[0].bindToAllInterfaces).toBe(
      undefined,
    );
    const newState2 = reducer712(stateWith1Connector, {
      operation: ArtemisReducerOperations712.setConnectorBindToAllInterfaces,
      payload: {
        name: 'connectors0',
        bindToAllInterfaces: true,
      },
    });
    expect(newState2.cr.spec.connectors[0].bindToAllInterfaces).toBe(true);
    const newState3 = reducer712(stateWith1Connector, {
      operation: ArtemisReducerOperations712.setConnectorBindToAllInterfaces,
      payload: {
        name: 'connectors0',
        bindToAllInterfaces: false,
      },
    });
    expect(newState3.cr.spec.connectors[0].bindToAllInterfaces).toBe(false);
  });

  it('test setConnectorHost', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Connector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const newState2 = reducer712(stateWith1Connector, {
      operation: ArtemisReducerOperations712.setConnectorHost,
      payload: {
        connectorName: 'connectors0',
        host: 'superHost',
      },
    });
    expect(newState2.cr.spec.connectors[0].host).toBe('superHost');
  });

  it('test setConnectorName', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Connector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const newState2 = reducer712(stateWith1Connector, {
      operation: ArtemisReducerOperations712.setConnectorName,
      payload: {
        oldName: 'connectors0',
        newName: 'superName',
      },
    });
    expect(newState2.cr.spec.connectors[0].name).toBe('superName');
    expect(newState2.cr.spec.brokerProperties).toContain(
      'connectorConfigurations.superName.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.netty.NettyAcceptorFactory',
    );
  });

  it('test renaming an connector to an existing name to have no effect', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Connector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const stateWith2Connector = reducer712(stateWith1Connector, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const newState3 = reducer712(stateWith2Connector, {
      operation: ArtemisReducerOperations712.setConnectorName,
      payload: {
        oldName: 'connectors1',
        newName: 'connectors0',
      },
    });
    expect(newState3.cr.spec.connectors[0].name).toBe('connectors0');
    expect(newState3.cr.spec.connectors[1].name).toBe('connectors1');
  });

  it('test setConnectorOtherParams', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Connector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const newState2 = reducer712(stateWith1Connector, {
      operation: ArtemisReducerOperations712.setConnectorOtherParams,
      payload: {
        name: 'connectors0',
        otherParams: new Map<string, string>([
          ['aKey', 'aValue'],
          ['bKey', 'bValue'],
        ]),
      },
    });
    expect(newState2.cr.spec.brokerProperties).toContain(
      'connectorConfigurations.connectors0.params.aKey=aValue',
    );
    expect(newState2.cr.spec.brokerProperties).toContain(
      'connectorConfigurations.connectors0.params.bKey=bValue',
    );
    const newState3 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.setConnectorOtherParams,
      payload: {
        name: 'connectors0',
        otherParams: new Map<string, string>([['aKey', 'aValue']]),
      },
    });
    expect(newState3.cr.spec.brokerProperties).toContain(
      'connectorConfigurations.connectors0.params.aKey=aValue',
    );
    expect(newState3.cr.spec.brokerProperties).not.toContain(
      'connectorConfigurations.connectors0.params.bKey=bValue',
    );
  });

  it('should assigns unique ports to each new connector added', () => {
    const initialState = newBroker712CR('namespace');

    // Add the first connector
    let newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    expect(newState.cr.spec.connectors[0].port).toBe(5555);

    // Add a second connector
    newState = reducer712(newState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    expect(newState.cr.spec.connectors[1].port).toBe(5556);

    // Add a third connector
    newState = reducer712(newState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    expect(newState.cr.spec.connectors[2].port).toBe(5557);
  });

  it('test setConnectorPort', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Connector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const newState2 = reducer712(stateWith1Connector, {
      operation: ArtemisReducerOperations712.setConnectorPort,
      payload: {
        name: 'connectors0',
        port: 6666,
      },
    });
    expect(newState2.cr.spec.connectors[0].port).toBe(6666);
  });

  it('should increments next connector port based on manually set port value', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Connector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    let newState2 = reducer712(stateWith1Connector, {
      operation: ArtemisReducerOperations712.setConnectorPort,
      payload: {
        name: 'connectors0',
        port: 6666,
      },
    });
    expect(newState2.cr.spec.connectors[0].port).toBe(6666);

    newState2 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    expect(newState2.cr.spec.connectors[1].port).toBe(6667);
  });

  it('test unique port allocation by combining both new added acceptors/connectors and verify correct port incrementation after manual port modification', () => {
    const initialState = newBroker712CR('namespace');
    //Add first acceptor
    let newStateWithAcceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    expect(newStateWithAcceptor.cr.spec.acceptors[0].port).toBe(5555);

    //Add second acceptor
    newStateWithAcceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    expect(newStateWithAcceptor.cr.spec.acceptors[1].port).toBe(5556);

    // Manually change the port of the second acceptor to 5557
    newStateWithAcceptor = reducer712(newStateWithAcceptor, {
      operation: ArtemisReducerOperations712.setAcceptorPort,
      payload: {
        name: 'acceptors1',
        port: 5557,
      },
    });
    expect(newStateWithAcceptor.cr.spec.acceptors[1].port).toBe(5557);

    //Add third acceptor
    newStateWithAcceptor = reducer712(newStateWithAcceptor, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    expect(newStateWithAcceptor.cr.spec.acceptors[2].port).toBe(5558);

    //Add first connector
    let newStateWithConnector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    expect(newStateWithConnector.cr.spec.connectors[0].port).toBe(5555);

    //Add second connector
    newStateWithConnector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    expect(newStateWithConnector.cr.spec.connectors[1].port).toBe(5556);

    // Manually change the port of the second connector to 5557
    newStateWithConnector = reducer712(newStateWithConnector, {
      operation: ArtemisReducerOperations712.setConnectorPort,
      payload: {
        name: 'connectors1',
        port: 5557,
      },
    });
    expect(newStateWithConnector.cr.spec.connectors[1].port).toBe(5557);

    //Add third connector
    newStateWithConnector = reducer712(newStateWithConnector, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    expect(newStateWithConnector.cr.spec.connectors[2].port).toBe(5558);
  });

  it('test setConnectorProtocols', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Connector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const newState2 = reducer712(stateWith1Connector, {
      operation: ArtemisReducerOperations712.setConnectorProtocols,
      payload: {
        configName: 'connectors0',
        protocols: 'ALL,SOMETHING',
      },
    });
    expect(newState2.cr.spec.connectors[0].protocols).toBe('ALL,SOMETHING');
  });

  it('test setConnectorSSLEnabled', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Connector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const newState2 = reducer712(stateWith1Connector, {
      operation: ArtemisReducerOperations712.setConnectorSSLEnabled,
      payload: {
        name: 'connectors0',
        sslEnabled: true,
      },
    });
    expect(newState2.cr.spec.connectors[0].sslEnabled).toBe(true);
  });

  it('test setConnectorSecret', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Connector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const newState2 = reducer712(stateWith1Connector, {
      operation: ArtemisReducerOperations712.setConnectorSecret,
      payload: {
        name: 'connectors0',
        isCa: false,
        secret: 'toto',
      },
    });
    expect(newState2.cr.spec.connectors[0].sslSecret).toBe('toto');
    const newState3 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.setConnectorSecret,
      payload: {
        name: 'connectors0',
        isCa: true,
        secret: 'toto',
      },
    });
    expect(newState3.cr.spec.connectors[0].trustSecret).toBe('toto');
  });

  it('test setConsoleCredentials', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setConsoleCredentials,
      payload: {
        adminUser: 'some',
        adminPassword: 'thing',
      },
    });
    expect(newState.cr.spec.adminUser).toBe('some');
    expect(newState.cr.spec.adminPassword).toBe('thing');
  });

  it('test setConsoleExpose', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setConsoleExpose,
      payload: true,
    });
    expect(newState.cr.spec.console.expose).toBe(true);
  });

  it('test setConsoleExposeMode', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setConsoleExposeMode,
      payload: ExposeMode.route,
    });
    expect(newState.cr.spec.console.exposeMode).toBe(ExposeMode.route);
  });

  it('test setConsoleExposeMode', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setConsoleExposeMode,
      payload: ExposeMode.ingress,
    });
    expect(newState.cr.spec.console.exposeMode).toBe(ExposeMode.ingress);
  });

  it('test setConsoleSSLEnabled', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setConsoleSSLEnabled,
      payload: true,
    });
    expect(newState.cr.spec.console.sslEnabled).toBe(true);
  });

  it('test setConsoleSecret', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setConsoleSecret,
      payload: {
        name: 'console',
        isCa: true,
        secret: 'toto',
      },
    });
    expect(newState.cr.spec.console.trustSecret).toBe('toto');
  });

  it('test setNamespace', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setNamespace,
      payload: 'newNamespace',
    });
    expect(newState.cr.metadata.namespace).toBe('newNamespace');
  });

  it('test replicas setReplicasNumber', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setReplicasNumber,
      payload: 10,
    });
    expect(newState.cr.spec.deploymentPlan.size).toBe(10);
  });

  it('test updateAcceptorFactoryClass', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const newState2 = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.updateAcceptorFactoryClass,
      payload: {
        name: 'acceptors0',
        class: 'invm',
      },
    });
    expect(newState2.cr.spec.brokerProperties).toContain(
      'acceptorConfigurations.acceptors0.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.invm.InVMAcceptorFactory',
    );
    const newState3 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.updateAcceptorFactoryClass,
      payload: {
        name: 'acceptors0',
        class: 'netty',
      },
    });
    expect(newState3.cr.spec.brokerProperties).toContain(
      'acceptorConfigurations.acceptors0.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.netty.NettyAcceptorFactory',
    );
  });

  it('test updateConnectorFactoryClass', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const newState2 = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.updateConnectorFactoryClass,
      payload: {
        name: 'connectors0',
        class: 'invm',
      },
    });
    expect(newState2.cr.spec.brokerProperties).toContain(
      'connectorConfigurations.connectors0.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.invm.InVMAcceptorFactory',
    );
    const newState3 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.updateConnectorFactoryClass,
      payload: {
        name: 'connectors0',
        class: 'netty',
      },
    });
    expect(newState3.cr.spec.brokerProperties).toContain(
      'connectorConfigurations.connectors0.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.netty.NettyAcceptorFactory',
    );
  });

  it('test activatePEMGenerationForAcceptor', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const stateWithIngressDomain = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setIngressDomain,
      payload: 'apps-crc.testing',
    });
    const stateWithPEM = reducer712(stateWithIngressDomain, {
      operation: ArtemisReducerOperations712.activatePEMGenerationForAcceptor,
      payload: {
        acceptor: 'acceptors0',
        issuer: 'someIssuer',
      },
    });
    expect(stateWithPEM.cr.spec.acceptors[0].sslEnabled).toBe(true);
    expect(stateWithPEM.cr.spec.acceptors[0].exposeMode).toBe(
      ExposeMode.ingress,
    );
    expect(stateWithPEM.cr.spec.acceptors[0].ingressHost).toBe(
      'ing.$(ITEM_NAME).$(CR_NAME)-$(BROKER_ORDINAL).$(CR_NAMESPACE).$(INGRESS_DOMAIN)',
    );
    expect(stateWithPEM.cr.spec.acceptors[0].sslSecret).toBe(
      'ex-aao-acceptors0-0-svc-ing-ptls',
    );
    expect(stateWithPEM.cr.spec.resourceTemplates).toHaveLength(1);
    expect(stateWithPEM.cr.spec.resourceTemplates[0].selector.name).toBe(
      'ex-aao' + '-' + 'acceptors0' + '-0-svc-ing',
    );
    expect(stateWithPEM.cr.spec.resourceTemplates[0].selector.name).toBe(
      'ex-aao' + '-' + 'acceptors0' + '-0-svc-ing',
    );
    expect(
      stateWithPEM.cr.spec.resourceTemplates[0].patch.spec.tls[0].hosts[0],
    ).toBe(
      'ing.' +
        'acceptors0' +
        '.' +
        'ex-aao' +
        '-0.' +
        'namespace' +
        '.' +
        'apps-crc.testing',
    );
    // update broker name
    const updatedBrokerName = reducer712(stateWithPEM, {
      operation: ArtemisReducerOperations712.setBrokerName,
      payload: 'bro',
    });
    expect(updatedBrokerName.cr.spec.acceptors[0].sslSecret).toBe(
      'bro-acceptors0-0-svc-ing-ptls',
    );
    expect(updatedBrokerName.cr.spec.resourceTemplates).toHaveLength(1);
    expect(updatedBrokerName.cr.spec.resourceTemplates[0].selector.name).toBe(
      'bro' + '-' + 'acceptors0' + '-0-svc-ing',
    );
    expect(updatedBrokerName.cr.spec.resourceTemplates[0].selector.name).toBe(
      'bro' + '-' + 'acceptors0' + '-0-svc-ing',
    );
    expect(
      updatedBrokerName.cr.spec.resourceTemplates[0].patch.spec.tls[0].hosts[0],
    ).toBe(
      'ing.' +
        'acceptors0' +
        '.' +
        'bro' +
        '-0.' +
        'namespace' +
        '.' +
        'apps-crc.testing',
    );
    // update broker name
    const updatedNamespace = reducer712(updatedBrokerName, {
      operation: ArtemisReducerOperations712.setNamespace,
      payload: 'space',
    });
    expect(updatedNamespace.cr.spec.resourceTemplates).toHaveLength(1);
    expect(
      updatedNamespace.cr.spec.resourceTemplates[0].patch.spec.tls[0].hosts[0],
    ).toBe(
      'ing.' +
        'acceptors0' +
        '.' +
        'bro' +
        '-0.' +
        'space' +
        '.' +
        'apps-crc.testing',
    );
    // update broker name
    const updatedDomain = reducer712(updatedNamespace, {
      operation: ArtemisReducerOperations712.setIngressDomain,
      payload: 'tttt.com',
    });
    expect(updatedDomain.cr.spec.resourceTemplates).toHaveLength(1);
    expect(
      updatedDomain.cr.spec.resourceTemplates[0].patch.spec.tls[0].hosts[0],
    ).toBe(
      'ing.' + 'acceptors0' + '.' + 'bro' + '-0.' + 'space' + '.' + 'tttt.com',
    );
    // update Acceptor name
    const updatedAcceptorName = reducer712(updatedDomain, {
      operation: ArtemisReducerOperations712.setAcceptorName,
      payload: {
        oldName: 'acceptors0',
        newName: 'bob',
      },
    });
    expect(updatedAcceptorName.cr.spec.acceptors[0].sslEnabled).toBe(true);
    expect(updatedAcceptorName.cr.spec.acceptors[0].exposeMode).toBe(
      ExposeMode.ingress,
    );
    expect(updatedAcceptorName.cr.spec.acceptors[0].ingressHost).toBe(
      'ing.$(ITEM_NAME).$(CR_NAME)-$(BROKER_ORDINAL).$(CR_NAMESPACE).$(INGRESS_DOMAIN)',
    );
    expect(updatedAcceptorName.cr.spec.acceptors[0].sslSecret).toBe(
      'bro-bob-0-svc-ing-ptls',
    );
    expect(updatedAcceptorName.cr.spec.resourceTemplates).toHaveLength(1);
    expect(updatedAcceptorName.cr.spec.resourceTemplates[0].selector.name).toBe(
      'bro' + '-' + 'bob' + '-0-svc-ing',
    );
    expect(updatedAcceptorName.cr.spec.resourceTemplates[0].selector.name).toBe(
      'bro' + '-' + 'bob' + '-0-svc-ing',
    );
    expect(
      updatedAcceptorName.cr.spec.resourceTemplates[0].patch.spec.tls[0]
        .hosts[0],
    ).toBe('ing.' + 'bob' + '.' + 'bro' + '-0.' + 'space' + '.' + 'tttt.com');
    // setting the trust secret doesn't change the values
    const withTrustSecret = reducer712(updatedDomain, {
      operation: ArtemisReducerOperations712.setAcceptorSecret,
      payload: {
        name: 'bob',
        isCa: true,
        secret: 'toto',
      },
    });
    expect(withTrustSecret.cr.spec.acceptors[0].sslEnabled).toBe(true);
    expect(withTrustSecret.cr.spec.acceptors[0].exposeMode).toBe(
      ExposeMode.ingress,
    );
    expect(withTrustSecret.cr.spec.acceptors[0].ingressHost).toBe(
      'ing.$(ITEM_NAME).$(CR_NAME)-$(BROKER_ORDINAL).$(CR_NAMESPACE).$(INGRESS_DOMAIN)',
    );
    expect(withTrustSecret.cr.spec.acceptors[0].sslSecret).toBe(
      'bro-bob-0-svc-ing-ptls',
    );
    expect(withTrustSecret.cr.spec.resourceTemplates).toHaveLength(1);
    expect(withTrustSecret.cr.spec.resourceTemplates[0].selector.name).toBe(
      'bro' + '-' + 'bob' + '-0-svc-ing',
    );
    expect(withTrustSecret.cr.spec.resourceTemplates[0].selector.name).toBe(
      'bro' + '-' + 'bob' + '-0-svc-ing',
    );
    expect(
      withTrustSecret.cr.spec.resourceTemplates[0].patch.spec.tls[0].hosts[0],
    ).toBe('ing.' + 'bob' + '.' + 'bro' + '-0.' + 'space' + '.' + 'tttt.com');
  });

  it('test changing number of replicas while in the PEM preset gives the correct number of hosts', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const stateWithIngressDomain = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setIngressDomain,
      payload: 'apps-crc.testing',
    });
    const stateWithPEM = reducer712(stateWithIngressDomain, {
      operation: ArtemisReducerOperations712.activatePEMGenerationForAcceptor,
      payload: {
        acceptor: 'acceptors0',
        issuer: 'someIssuer',
      },
    });
    expect(stateWithPEM.cr.spec.acceptors[0].sslEnabled).toBe(true);
    expect(stateWithPEM.cr.spec.acceptors[0].exposeMode).toBe(
      ExposeMode.ingress,
    );
    expect(stateWithPEM.cr.spec.acceptors[0].ingressHost).toBe(
      'ing.$(ITEM_NAME).$(CR_NAME)-$(BROKER_ORDINAL).$(CR_NAMESPACE).$(INGRESS_DOMAIN)',
    );
    expect(stateWithPEM.cr.spec.acceptors[0].sslSecret).toBe(
      'ex-aao-acceptors0-0-svc-ing-ptls',
    );
    expect(stateWithPEM.cr.spec.resourceTemplates).toHaveLength(1);
    expect(stateWithPEM.cr.spec.resourceTemplates[0].selector.name).toBe(
      'ex-aao' + '-' + 'acceptors0' + '-0-svc-ing',
    );
    expect(stateWithPEM.cr.spec.resourceTemplates[0].selector.name).toBe(
      'ex-aao' + '-' + 'acceptors0' + '-0-svc-ing',
    );
    expect(
      stateWithPEM.cr.spec.resourceTemplates[0].patch.spec.tls[0].hosts[0],
    ).toBe(
      'ing.' +
        'acceptors0' +
        '.' +
        'ex-aao' +
        '-0.' +
        'namespace' +
        '.' +
        'apps-crc.testing',
    );
    const stateWith2Replicas = reducer712(stateWithPEM, {
      operation: ArtemisReducerOperations712.incrementReplicas,
    });
    expect(
      stateWith2Replicas.cr.spec.resourceTemplates[0].patch.spec.tls[0]
        .hosts[0],
    ).toBe(
      'ing.' +
        'acceptors0' +
        '.' +
        'ex-aao' +
        '-0.' +
        'namespace' +
        '.' +
        'apps-crc.testing',
    );
    expect(
      stateWith2Replicas.cr.spec.resourceTemplates[0].patch.spec.tls[0]
        .hosts[1],
    ).toBe(
      'ing.' +
        'acceptors0' +
        '.' +
        'ex-aao' +
        '-1.' +
        'namespace' +
        '.' +
        'apps-crc.testing',
    );
    expect(
      stateWith2Replicas.cr.spec.resourceTemplates[0].patch.spec.tls[0].hosts,
    ).toHaveLength(2);

    const newNumber = 10;
    const stateWith10Replicas = reducer712(stateWith2Replicas, {
      operation: ArtemisReducerOperations712.setReplicasNumber,
      payload: newNumber,
    });
    expect(
      stateWith10Replicas.cr.spec.resourceTemplates[0].patch.spec.tls[0].hosts,
    ).toHaveLength(newNumber);
    for (let i = 0; i < newNumber; i++) {
      expect(
        stateWith10Replicas.cr.spec.resourceTemplates[0].patch.spec.tls[0]
          .hosts[i],
      ).toBe(
        'ing.' +
          'acceptors0' +
          '.' +
          'ex-aao' +
          '-' +
          i +
          '.' +
          'namespace' +
          '.' +
          'apps-crc.testing',
      );
    }
    const stateWith9Replicas = reducer712(stateWith10Replicas, {
      operation: ArtemisReducerOperations712.decrementReplicas,
    });
    expect(
      stateWith9Replicas.cr.spec.resourceTemplates[0].patch.spec.tls[0].hosts,
    ).toHaveLength(9);
    for (let i = 0; i < 9; i++) {
      expect(
        stateWith10Replicas.cr.spec.resourceTemplates[0].patch.spec.tls[0]
          .hosts[i],
      ).toBe(
        'ing.' +
          'acceptors0' +
          '.' +
          'ex-aao' +
          '-' +
          i +
          '.' +
          'namespace' +
          '.' +
          'apps-crc.testing',
      );
    }
  });

  it('test deletePEMGenerationForAcceptor', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const stateWithPEM = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.activatePEMGenerationForAcceptor,
      payload: {
        acceptor: 'acceptors0',
        issuer: 'someIssuer',
      },
    });
    const stateWithDeletedPEM = reducer712(stateWithPEM, {
      operation: ArtemisReducerOperations712.deletePEMGenerationForAcceptor,
      payload: 'acceptors0',
    });
    expect(stateWithDeletedPEM.cr.spec.acceptors[0].sslEnabled).toBe(undefined);
    expect(stateWithDeletedPEM.cr.spec.acceptors[0].sslSecret).toBe(undefined);
    expect(stateWithDeletedPEM.cr.spec.resourceTemplates).toBe(undefined);
  });

  it('test setAcceptorExposeMode,', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const stateExposeModeIngress = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setAcceptorExposeMode,
      payload: {
        name: 'acceptors0',
        exposeMode: ExposeMode.ingress,
      },
    });
    expect(stateExposeModeIngress.cr.spec.acceptors[0].exposeMode).toBe(
      ExposeMode.ingress,
    );
  });

  it('test setAcceptorIngressHost,', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const stateExposeModeIngress = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setAcceptorIngressHost,
      payload: {
        name: 'acceptors0',
        ingressHost: 'tuytutu',
      },
    });
    expect(stateExposeModeIngress.cr.spec.acceptors[0].ingressHost).toBe(
      'tuytutu',
    );
  });

  it('test setIsAcceptorExposed,', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const stateExposeModeIngress = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setIsAcceptorExposed,
      payload: {
        name: 'acceptors0',
        isExposed: true,
      },
    });
    expect(stateExposeModeIngress.cr.spec.acceptors[0].expose).toBe(true);
  });
});
