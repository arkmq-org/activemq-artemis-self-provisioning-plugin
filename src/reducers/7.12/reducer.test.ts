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
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    const acceptors = spec.acceptors;
    if (!acceptors) throw new Error('acceptors should not be undefined');
    expect(spec.acceptors).toHaveLength(1);
    expect(acceptors[0].name).toBe('acceptors0');
    expect(acceptors[0].port).toBe(5555);
    expect(acceptors[0].protocols).toBe('ALL');
    expect(spec.brokerProperties).toHaveLength(1);
    expect(spec.brokerProperties).toContain(
      'acceptorConfigurations.acceptors0.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.netty.NettyAcceptorFactory',
    );
  });

  it('test addConnector', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    const connectors = spec.connectors;
    if (!connectors) throw new Error('connectors should not be undefined');
    expect(connectors).toHaveLength(1);
    expect(connectors[0].name).toBe('connectors0');
    expect(connectors[0].port).toBe(5555);
    expect(connectors[0].host === 'localhost');
    expect(spec.brokerProperties).toHaveLength(1);
    expect(spec.brokerProperties).toContain(
      'connectorConfigurations.connectors0.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.netty.NettyAcceptorFactory',
    );
  });

  it('test replicas decrementReplicas', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.decrementReplicas,
    });
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    const deploymentPlan = spec.deploymentPlan;
    if (!deploymentPlan)
      throw new Error('deploymentPlan should not be undefined');

    // default size is 1 decrementing should result of a size of 0
    expect(deploymentPlan.size).toBe(0);
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
    const spec2 = newState2.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');
    const deploymentPlan2 = spec.deploymentPlan;
    if (!deploymentPlan2)
      throw new Error('deploymentPlan2 should not be undefined');

    expect(deploymentPlan2.size).toBe(9);
  });

  it('tests that the deployment replicas value cannot be decremented below 0', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.decrementReplicas,
    });
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    const deploymentPlan = spec.deploymentPlan;
    if (!deploymentPlan)
      throw new Error('deploymentPlan should not be undefined');
    // default size is 1 decrementing should result of a size of 0
    expect(deploymentPlan.size).toBe(0);
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
    const spec2 = newState2.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');

    const deploymentPlan2 = spec.deploymentPlan;
    if (!deploymentPlan2)
      throw new Error('deploymentPlan2 should not be undefined');

    expect(deploymentPlan2.size).toBe(0);
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    const acceptors = spec.acceptors;
    if (!acceptors) throw new Error('acceptors should not be undefined');
    expect(acceptors).toHaveLength(0);
    expect(spec.brokerProperties).not.toContain(
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    const connectors = spec.connectors;
    if (!connectors) throw new Error('connectors should not be undefined');
    expect(connectors).toHaveLength(0);
    expect(spec.brokerProperties).not.toContain(
      'connectorConfigurations.connectors0.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.netty.NettyAcceptorFactory',
    );
  });

  it('test incrementReplicas', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.incrementReplicas,
    });
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    const deploymentPlan = spec.deploymentPlan;
    if (!deploymentPlan)
      throw new Error('deploymentPlan should not be undefined');
    // default size is 1 decrementing should result of a size of 1
    expect(deploymentPlan.size).toBe(2);
  });

  it('test incrementReplicas', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.incrementReplicas,
    });
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    const deploymentPlan = spec.deploymentPlan;
    if (!deploymentPlan)
      throw new Error('deploymentPlan should not be undefined');
    // default size is 1 decrementing should result of a size of 1
    expect(deploymentPlan.size).toBe(2);
  });

  it('test setAcceptorBindToAllInterfaces', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Acceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const spec = stateWith1Acceptor.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.acceptors?.[0].bindToAllInterfaces).toBe(undefined);
    const newState2 = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setAcceptorBindToAllInterfaces,
      payload: {
        name: 'acceptors0',
        bindToAllInterfaces: true,
      },
    });
    const spec2 = newState2.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');
    expect(spec2.acceptors?.[0].bindToAllInterfaces).toBe(true);
    const newState3 = reducer712(stateWith1Acceptor, {
      operation: ArtemisReducerOperations712.setAcceptorBindToAllInterfaces,
      payload: {
        name: 'acceptors0',
        bindToAllInterfaces: false,
      },
    });
    const spec3 = newState3.cr.spec;
    if (!spec3) throw new Error('spec3 should not be undefined');
    expect(spec3.acceptors?.[0].bindToAllInterfaces).toBe(false);
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.acceptors?.[0].name).toBe('superName');
    expect(spec.brokerProperties).toContain(
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
    const spec = newState3.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.acceptors?.[0].name).toBe('acceptors0');
    expect(spec.acceptors?.[1].name).toBe('acceptors1');
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.brokerProperties).toContain(
      'acceptorConfigurations.acceptors0.params.aKey=aValue',
    );
    expect(spec.brokerProperties).toContain(
      'acceptorConfigurations.acceptors0.params.bKey=bValue',
    );
    const newState3 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.setAcceptorOtherParams,
      payload: {
        name: 'acceptors0',
        otherParams: new Map<string, string>([['aKey', 'aValue']]),
      },
    });
    const spec2 = newState3.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');
    expect(spec2.brokerProperties).toContain(
      'acceptorConfigurations.acceptors0.params.aKey=aValue',
    );
    expect(spec2.brokerProperties).not.toContain(
      'acceptorConfigurations.acceptors0.params.bKey=bValue',
    );
  });

  it('should assigns unique ports to each new acceptor added', () => {
    const initialState = newBroker712CR('namespace');

    // Add the first acceptor
    let newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    expect(spec.acceptors?.[0].port).toBe(5555);

    // Add a second acceptor
    newState = reducer712(newState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    expect(spec.acceptors?.[1].port).toBe(5556);

    // Add a third acceptor
    newState = reducer712(newState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    expect(spec.acceptors?.[2].port).toBe(5557);
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.acceptors?.[0].port).toBe(6666);
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.acceptors?.[0].port).toBe(6666);

    newState2 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    expect(spec.acceptors?.[1].port).toBe(6667);
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.acceptors?.[0].protocols).toBe('ALL,SOMETHING');
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.acceptors?.[0].sslEnabled).toBe(true);
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.acceptors?.[0].sslSecret).toBe('toto');
    const newState3 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.setAcceptorSecret,
      payload: {
        name: 'acceptors0',
        isCa: true,
        secret: 'toto',
      },
    });
    const spec2 = newState3.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');
    expect(spec2.acceptors?.[0].trustSecret).toBe('toto');
  });

  it('test setBrokerName', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setBrokerName,
      payload: 'newName',
    });
    const metadata = newState.cr.metadata;
    if (!metadata) throw new Error('metadata should not be undefined');
    expect(metadata.name).toBe('newName');
  });

  // enchaine avec le lwoercase
  it('test setConnectorBindToAllInterfaces', () => {
    const initialState = newBroker712CR('namespace');
    const stateWith1Connector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const spec = stateWith1Connector.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    expect(spec.connectors?.[0].bindToAllInterfaces).toBe(undefined);
    const newState2 = reducer712(stateWith1Connector, {
      operation: ArtemisReducerOperations712.setConnectorBindToAllInterfaces,
      payload: {
        name: 'connectors0',
        bindToAllInterfaces: true,
      },
    });
    const spec2 = newState2.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');
    expect(spec2.connectors?.[0].bindToAllInterfaces).toBe(true);
    const newState3 = reducer712(stateWith1Connector, {
      operation: ArtemisReducerOperations712.setConnectorBindToAllInterfaces,
      payload: {
        name: 'connectors0',
        bindToAllInterfaces: false,
      },
    });
    const spec3 = newState3.cr.spec;
    if (!spec3) throw new Error('spec3 should not be undefined');
    expect(spec3.connectors?.[0].bindToAllInterfaces).toBe(false);
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec2 should not be undefined');
    expect(spec.connectors?.[0].host).toBe('superHost');
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.connectors?.[0].name).toBe('superName');
    expect(spec.brokerProperties).toContain(
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
    const spec = newState3.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.connectors?.[0].name).toBe('connectors0');
    expect(spec.connectors?.[1].name).toBe('connectors1');
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
    const spec = newState2.cr.spec;
    if (!spec || !spec.brokerProperties) {
      throw new Error('brokerProperties should not be undefined');
    }
    expect(spec.brokerProperties).toContain(
      'connectorConfigurations.connectors0.params.aKey=aValue',
    );
    expect(spec.brokerProperties).toContain(
      'connectorConfigurations.connectors0.params.bKey=bValue',
    );
    const newState3 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.setConnectorOtherParams,
      payload: {
        name: 'connectors0',
        otherParams: new Map<string, string>([['aKey', 'aValue']]),
      },
    });
    const spec2 = newState3.cr.spec;
    if (!spec2 || !spec2.brokerProperties) {
      throw new Error('brokerProperties2 should not be undefined');
    }
    expect(spec2.brokerProperties).toContain(
      'connectorConfigurations.connectors0.params.aKey=aValue',
    );
    expect(spec2.brokerProperties).not.toContain(
      'connectorConfigurations.connectors0.params.bKey=bValue',
    );
  });

  it('should assigns unique ports to each new connector added', () => {
    const initialState = newBroker712CR('namespace');

    // Add the first connector
    let newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.connectors?.[0].port).toBe(5555);

    // Add a second connector
    newState = reducer712(newState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    expect(spec.connectors?.[1].port).toBe(5556);

    // Add a third connector
    newState = reducer712(newState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    expect(spec.connectors?.[2].port).toBe(5557);
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.connectors?.[0].port).toBe(6666);
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.connectors?.[0].port).toBe(6666);

    newState2 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    expect(spec.connectors?.[1].port).toBe(6667);
  });

  it('test unique port allocation by combining both new added acceptors/connectors and verify correct port incrementation after manual port modification', () => {
    const initialState = newBroker712CR('namespace');
    //Add first acceptor
    let newStateWithAcceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    const spec = newStateWithAcceptor.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.acceptors?.[0].port).toBe(5555);

    //Add second acceptor
    newStateWithAcceptor = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    expect(spec.acceptors?.[1].port).toBe(5556);

    // Manually change the port of the second acceptor to 5557
    newStateWithAcceptor = reducer712(newStateWithAcceptor, {
      operation: ArtemisReducerOperations712.setAcceptorPort,
      payload: {
        name: 'acceptors1',
        port: 5557,
      },
    });
    expect(spec.acceptors?.[1].port).toBe(5557);

    //Add third acceptor
    newStateWithAcceptor = reducer712(newStateWithAcceptor, {
      operation: ArtemisReducerOperations712.addAcceptor,
    });
    expect(spec.acceptors?.[2].port).toBe(5558);

    //Add first connector
    let newStateWithConnector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    const spec2 = newStateWithConnector.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');
    expect(spec2.connectors?.[0].port).toBe(5555);

    //Add second connector
    newStateWithConnector = reducer712(initialState, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    expect(spec2.connectors?.[1].port).toBe(5556);

    // Manually change the port of the second connector to 5557
    newStateWithConnector = reducer712(newStateWithConnector, {
      operation: ArtemisReducerOperations712.setConnectorPort,
      payload: {
        name: 'connectors1',
        port: 5557,
      },
    });
    expect(spec.connectors?.[1].port).toBe(5557);

    //Add third connector
    newStateWithConnector = reducer712(newStateWithConnector, {
      operation: ArtemisReducerOperations712.addConnector,
    });
    expect(spec.connectors?.[2].port).toBe(5558);
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.connectors?.[0].protocols).toBe('ALL,SOMETHING');
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.connectors?.[0].sslEnabled).toBe(true);
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.connectors?.[0].sslSecret).toBe('toto');
    const newState3 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.setConnectorSecret,
      payload: {
        name: 'connectors0',
        isCa: true,
        secret: 'toto',
      },
    });
    const spec2 = newState3.cr.spec;
    if (!spec2) throw new Error('spec should not be undefined');
    expect(spec2.connectors?.[0].trustSecret).toBe('toto');
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
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    expect(spec.adminUser).toBe('some');
    expect(spec.adminPassword).toBe('thing');
  });

  it('test setConsoleExpose', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setConsoleExpose,
      payload: true,
    });
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.console?.expose).toBe(true);
  });

  it('test setConsoleExposeMode', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setConsoleExposeMode,
      payload: ExposeMode.route,
    });
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.console?.exposeMode).toBe(ExposeMode.route);
  });

  it('test setConsoleExposeMode', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setConsoleExposeMode,
      payload: ExposeMode.ingress,
    });
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.console?.exposeMode).toBe(ExposeMode.ingress);
  });

  it('test setConsoleSSLEnabled', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setConsoleSSLEnabled,
      payload: true,
    });
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.console?.sslEnabled).toBe(true);
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
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.console?.trustSecret).toBe('toto');
  });

  it('test setNamespace', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setNamespace,
      payload: 'newNamespace',
    });
    const metadata = newState.cr.metadata;
    if (!metadata) throw new Error('metadata should not be undefined');

    expect(metadata.namespace).toBe('newNamespace');
  });

  it('test replicas setReplicasNumber', () => {
    const initialState = newBroker712CR('namespace');
    const newState = reducer712(initialState, {
      operation: ArtemisReducerOperations712.setReplicasNumber,
      payload: 10,
    });
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.deploymentPlan?.size).toBe(10);
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    expect(spec.brokerProperties).toContain(
      'acceptorConfigurations.acceptors0.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.invm.InVMAcceptorFactory',
    );
    const newState3 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.updateAcceptorFactoryClass,
      payload: {
        name: 'acceptors0',
        class: 'netty',
      },
    });
    const spec2 = newState3.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');

    expect(spec2.brokerProperties).toContain(
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
    const spec = newState2.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    expect(spec.brokerProperties).toContain(
      'connectorConfigurations.connectors0.factoryClassName=org.apache.activemq.artemis.core.remoting.impl.invm.InVMAcceptorFactory',
    );
    const newState3 = reducer712(newState2, {
      operation: ArtemisReducerOperations712.updateConnectorFactoryClass,
      payload: {
        name: 'connectors0',
        class: 'netty',
      },
    });
    const spec2 = newState3.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');

    expect(spec2.brokerProperties).toContain(
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
    const spec = stateWithPEM.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    const acceptors = spec.acceptors;
    if (!acceptors) throw new Error('acceptors should not be undefined');

    const resourceTemplates = spec.resourceTemplates;
    if (!resourceTemplates || resourceTemplates.length === 0)
      throw new Error('resourceTemplates not created');

    const rt = resourceTemplates[0];

    expect(acceptors[0].sslEnabled).toBe(true);
    expect(acceptors[0].exposeMode).toBe(ExposeMode.ingress);
    expect(acceptors[0].ingressHost).toBe(
      'ing.$(ITEM_NAME).$(CR_NAME)-$(BROKER_ORDINAL).$(CR_NAMESPACE).$(INGRESS_DOMAIN)',
    );
    expect(acceptors[0].sslSecret).toBe('ex-aao-acceptors0-0-svc-ing-ptls');
    expect(resourceTemplates).toHaveLength(1);
    if (!rt.selector) throw new Error('selector should not be undefined');
    expect(rt.selector.name).toBe('ex-aao' + '-' + 'acceptors0' + '-0-svc-ing');
    expect(rt.selector.name).toBe('ex-aao' + '-' + 'acceptors0' + '-0-svc-ing');
    expect(rt.patch?.spec?.tls?.[0]?.hosts?.[0]).toBe(
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
    const spec2 = updatedBrokerName.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');

    const acceptors2 = spec2.acceptors;
    if (!acceptors2) throw new Error('acceptors2 should not be undefined');

    const resourceTemplates2 = spec2.resourceTemplates;
    if (!resourceTemplates2)
      throw new Error('resourceTemplates2 should not be undefined');

    const rt2 = resourceTemplates2[0];
    if (!rt2) throw new Error('resourceTemplates2[0] missing');

    expect(acceptors2[0].sslSecret).toBe('bro-acceptors0-0-svc-ing-ptls');
    expect(resourceTemplates2).toHaveLength(1);
    if (!rt2.selector) throw new Error('selector should not be undefined');
    expect(rt2.selector.name).toBe('bro' + '-' + 'acceptors0' + '-0-svc-ing');
    expect(rt2.selector.name).toBe('bro' + '-' + 'acceptors0' + '-0-svc-ing');
    expect(rt2.patch?.spec?.tls?.[0]?.hosts?.[0]).toBe(
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
    expect(resourceTemplates2).toHaveLength(1);
    expect(rt2.patch?.spec?.tls?.[0]?.hosts?.[0]).toBe(
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
    const spec3 = updatedDomain.cr.spec;
    if (!spec3) throw new Error('spec3 should not be undefined');

    const acceptors3 = spec3.acceptors;
    if (!acceptors3) throw new Error('acceptors3 should not be undefined');

    const resourceTemplates3 = spec3.resourceTemplates;
    if (!resourceTemplates3)
      throw new Error('resourceTemplates3 should not be undefined');

    const rt3 = resourceTemplates3[0];
    if (!rt3) throw new Error('resourceTemplates3[0] missing');
    expect(resourceTemplates3).toHaveLength(1);
    expect(rt3.patch?.spec?.tls?.[0]?.hosts?.[0]).toBe(
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
    const spec4 = updatedAcceptorName.cr.spec;
    if (!spec4) throw new Error('spec4 should not be undefined');

    const acceptors4 = spec4.acceptors;
    if (!acceptors4) throw new Error('acceptors4 should not be undefined');

    expect(acceptors4[0].sslEnabled).toBe(true);
    expect(acceptors4[0].exposeMode).toBe(ExposeMode.ingress);
    expect(acceptors4[0].ingressHost).toBe(
      'ing.$(ITEM_NAME).$(CR_NAME)-$(BROKER_ORDINAL).$(CR_NAMESPACE).$(INGRESS_DOMAIN)',
    );
    expect(acceptors4[0].sslSecret).toBe('bro-bob-0-svc-ing-ptls');
    const resourceTemplates4 = spec4.resourceTemplates;
    if (!resourceTemplates4)
      throw new Error('resourceTemplates4 should not be undefined');

    const rt4 = resourceTemplates4[0];
    if (!rt4) throw new Error('resourceTemplates4[0] missing');
    expect(resourceTemplates4).toHaveLength(1);
    if (!rt4.selector) throw new Error('selector should not be undefined');
    expect(rt4.selector.name).toBe('bro' + '-' + 'bob' + '-0-svc-ing');
    expect(rt4.selector.name).toBe('bro' + '-' + 'bob' + '-0-svc-ing');
    expect(rt4.patch?.spec?.tls?.[0]?.hosts?.[0]).toBe(
      'ing.' + 'bob' + '.' + 'bro' + '-0.' + 'space' + '.' + 'tttt.com',
    );
    // setting the trust secret doesn't change the values
    const withTrustSecret = reducer712(updatedDomain, {
      operation: ArtemisReducerOperations712.setAcceptorSecret,
      payload: {
        name: 'bob',
        isCa: true,
        secret: 'toto',
      },
    });
    const spec5 = withTrustSecret.cr.spec;
    if (!spec5) throw new Error('spec5 should not be undefined');

    const acceptors5 = spec5.acceptors;
    if (!acceptors5) throw new Error('acceptors5 should not be undefined');

    expect(acceptors5[0].sslEnabled).toBe(true);
    expect(acceptors5[0].exposeMode).toBe(ExposeMode.ingress);
    expect(acceptors5[0].ingressHost).toBe(
      'ing.$(ITEM_NAME).$(CR_NAME)-$(BROKER_ORDINAL).$(CR_NAMESPACE).$(INGRESS_DOMAIN)',
    );
    expect(acceptors5[0].sslSecret).toBe('bro-bob-0-svc-ing-ptls');
    const resourceTemplates5 = spec5.resourceTemplates;
    if (!resourceTemplates5)
      throw new Error('resourceTemplates5 should not be undefined');

    const rt5 = resourceTemplates5[0];
    if (!rt5) throw new Error('resourceTemplates5[0] missing');

    expect(resourceTemplates5).toHaveLength(1);
    if (!rt5.selector) throw new Error('selector should not be undefined');
    expect(rt5.selector.name).toBe('bro' + '-' + 'bob' + '-0-svc-ing');
    expect(rt5.selector.name).toBe('bro' + '-' + 'bob' + '-0-svc-ing');
    expect(rt5.patch?.spec?.tls?.[0]?.hosts?.[0]).toBe(
      'ing.' + 'bob' + '.' + 'bro' + '-0.' + 'space' + '.' + 'tttt.com',
    );
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
    const spec = stateWithPEM.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    const acceptors = spec.acceptors;
    if (!acceptors) throw new Error('acceptors should not be undefined');

    expect(acceptors[0].sslEnabled).toBe(true);
    expect(acceptors[0].exposeMode).toBe(ExposeMode.ingress);
    expect(acceptors[0].ingressHost).toBe(
      'ing.$(ITEM_NAME).$(CR_NAME)-$(BROKER_ORDINAL).$(CR_NAMESPACE).$(INGRESS_DOMAIN)',
    );
    expect(acceptors[0].sslSecret).toBe('ex-aao-acceptors0-0-svc-ing-ptls');
    const resourceTemplates = spec.resourceTemplates;
    if (!resourceTemplates || resourceTemplates.length === 0)
      throw new Error('resourceTemplates not created');

    const rt = resourceTemplates[0];

    expect(resourceTemplates).toHaveLength(1);
    if (!rt.selector) throw new Error('selector should not be undefined');
    expect(rt.selector.name).toBe('ex-aao' + '-' + 'acceptors0' + '-0-svc-ing');
    expect(rt.selector.name).toBe('ex-aao' + '-' + 'acceptors0' + '-0-svc-ing');
    expect(rt.patch?.spec?.tls?.[0]?.hosts?.[0]).toBe(
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
    const spec2 = stateWith2Replicas.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');

    const resourceTemplates2 = spec2.resourceTemplates;
    if (!resourceTemplates2)
      throw new Error('resourceTemplates2 should not be undefined');

    const rt2 = resourceTemplates2[0];
    if (!rt2) throw new Error('resourceTemplates2[0] missing');
    expect(rt2.patch?.spec?.tls?.[0]?.hosts?.[0]).toBe(
      'ing.' +
        'acceptors0' +
        '.' +
        'ex-aao' +
        '-0.' +
        'namespace' +
        '.' +
        'apps-crc.testing',
    );
    expect(rt2.patch?.spec?.tls?.[0]?.hosts?.[1]).toBe(
      'ing.' +
        'acceptors0' +
        '.' +
        'ex-aao' +
        '-1.' +
        'namespace' +
        '.' +
        'apps-crc.testing',
    );
    expect(rt2.patch?.spec?.tls?.[0]?.hosts).toHaveLength(2);

    const newNumber = 10;
    const stateWith10Replicas = reducer712(stateWith2Replicas, {
      operation: ArtemisReducerOperations712.setReplicasNumber,
      payload: newNumber,
    });
    const spec3 = stateWith10Replicas.cr.spec;
    if (!spec3) throw new Error('spec3 should not be undefined');

    const resourceTemplates3 = spec3.resourceTemplates;
    if (!resourceTemplates3)
      throw new Error('resourceTemplates3 should not be undefined');

    const rt3 = resourceTemplates3[0];
    if (!rt3) throw new Error('resourceTemplates3[0] missing');
    expect(rt3.patch?.spec?.tls?.[0]?.hosts).toHaveLength(newNumber);
    for (let i = 0; i < newNumber; i++) {
      expect(rt3.patch?.spec?.tls?.[0]?.hosts?.[i]).toBe(
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
    const spec4 = stateWith9Replicas.cr.spec;
    if (!spec4) throw new Error('spec4 should not be undefined');

    const resourceTemplates4 = spec4.resourceTemplates;
    if (!resourceTemplates4)
      throw new Error('resourceTemplates4 should not be undefined');

    const rt4 = resourceTemplates4[0];
    if (!rt4) throw new Error('resourceTemplates4[0] missing');
    expect(rt4.patch?.spec?.tls?.[0]?.hosts).toHaveLength(9);
    for (let i = 0; i < 9; i++) {
      expect(rt4.patch?.spec?.tls?.[0]?.hosts?.[i]).toBe(
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
    const spec = stateWithDeletedPEM.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.acceptors?.[0].sslEnabled).toBe(undefined);
    expect(spec.acceptors?.[0].sslSecret).toBe(undefined);
    expect(spec.resourceTemplates).toBe(undefined);
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
    const spec = stateExposeModeIngress.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.acceptors?.[0].exposeMode).toBe(ExposeMode.ingress);
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
    const spec = stateExposeModeIngress.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.acceptors?.[0].ingressHost).toBe('tuytutu');
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
    const spec = stateExposeModeIngress.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.acceptors?.[0].expose).toBe(true);
  });
});
