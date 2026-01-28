# ActiveMQ Artemis Self Provisioning Plugin

This project is a ActiveMQ Artemis Self Provisioning Plugin to the Administrator perspective in OpenShift console. It requires at least OpenShift `4.18` to use and is compatible with OpenShift `4.19`.

## Table of Contents

- [Local Development](#local-development)
  - [Setting up an OpenShift cluster](#setting-up-an-openshift-cluster)
  - [Installing the operator](#installing-the-operator)
  - [Installing the cert-manager operator](#installing-the-cert-manager-operator)
  - [Installing trust-manager](#installing-trust-manager)
  - [Setting up Chain of Trust](#setting-up-chain-of-trust)
  - [Metrics (User Workload Monitoring)](#metrics-user-workload-monitoring)
  - [Running the plugin](#running-the-plugin)
  - [Trusting Self-Signed Certificates](#trusting-self-signed-certificates-for-websocket-hot-reloading)
- [PKI Setup and Cleanup Scripts](#pki-setup-and-cleanup-scripts)
  - [Setup Scripts](#setup-scripts)
  - [Cleanup Scripts](#cleanup-scripts)
  - [Manual Cleanup Commands](#manual-cleanup-commands)
- [E2E Tests](#e2e-tests)
  - [Prerequisites](#e2e-prerequisites)
  - [Running Tests](#running-tests)
  - [Debugging Tests](#debugging-tests)
  - [Test Cleanup](#test-cleanup)
- [Docker Image](#docker-image)
- [Deployment on Cluster](#deployment-on-cluster)
- [Token Review Configuration](#configuring-a-broker-for-token-reviews)
- [Additional Documentation](#additional-documentation)

## Local Development

To run the local development environment you need:

- Access to a local or remote OpenShift cluster
- The [ArkMq Broker operator](https://arkmq.org/) installed on the cluster
- The cert-manager operator installed on the cluster
- The plugin running
- The console running

### Setting up an OpenShift cluster

#### Local cluster with CRC

Follow the documentation: https://access.redhat.com/documentation/en-us/red_hat_openshift_local/2.34/html-single/getting_started_guide/index#introducing

> [!WARNING]
> If you're encountering an issue where `crc` gets stuck in the step `Waiting for kube-apiserver availability` or `Waiting until the user's pull secret is written to the instance disk...` [you might need](https://github.com/crc-org/crc/issues/4110) to configure the network as local: `crc config set network-mode user`

Once your environment is set up you simply need to `crc start` your cluster.

#### Connecting to the cluster

Depending on the remote or local env:

- Remote: `oc login -u kubeadmin https://api.ci-ln-x671mxk-76ef8.origin-ci-int-aws.dev.rhcloud.com:6443` (adapt to your cluster address)
- Local: `oc login -u kubeadmin https://api.crc.testing:6443`

### Installing the operator

The plugin requires having access to the operator to function. You can either get the operator from the operatorHub or from the upstream repo.

#### From the operatorHub

Navigate to the operatorHub on the console and search for: `Red Hat Integration - AMQ Broker for RHEL 8 (Multiarch)`. After installation wait for the operator container to be up and running.

> [!WARNING]
> If you're running into an issue where the operatorHub is not accessible, try to force its redeployment: `oc delete pods --all -n openshift-marketplace` (see https://github.com/crc-org/crc/issues/4109 for reference)

#### From the upstream repository

Clone the operator repository then run `./deploy/install_opr.sh` to install the operator onto your cluster.

```bash
git clone git@github.com:arkmq-org/activemq-artemis-operator.git
cd activemq-artemis-operator
./deploy/install_opr.sh
```

> [!TIP]
> If you need to redeploy the operator, first call `./deploy/undeploy_all.sh`

> [!IMPORTANT]
> The script `install_opr.sh` will try to deploy on OpenShift with the `oc` command. If it's not available it will fallback to `kubectl`. Make sure your OpenShift cluster is up and running and that `oc` is connected to it before running the install.

### Installing the cert-manager operator

The plugin requires having access to the cert-manager operator for certain of its functionalities.

#### From the operatorHub

Navigate to the operatorHub on the console and search for `Cert-manager`.

### Installing trust-manager

First, add the Jetstack Helm repository:

```bash
helm repo add jetstack https://charts.jetstack.io --force-update
```

Now, install trust-manager. This will be configured to sync trust Bundles to Secrets in all namespaces:

```bash
helm upgrade trust-manager jetstack/trust-manager \
  --install \
  --namespace cert-manager \
  --set secretTargets.enabled=true \
  --set secretTargets.authorizedSecretsAll=true \
  --wait
```

### Setting up Chain of Trust

For testing the SPP, you need a complete PKI infrastructure including trust-manager to distribute CA certificates.

Run the setup script to create all necessary resources:

```bash
yarn chain-of-trust setup
```

For detailed options, cleanup procedures, and manual commands, see the [PKI Setup and Cleanup Scripts](#pki-setup-and-cleanup-scripts) section.

### Metrics (User Workload Monitoring)

Broker metrics in user namespaces require OpenShift user workload monitoring.
Enable it with the following ConfigMap:

```bash
cat <<'EOF' | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-monitoring-config
  namespace: openshift-monitoring
data:
  config.yaml: |
    enableUserWorkload: true
EOF
```

Verify:

```bash
kubectl get pods -n openshift-user-workload-monitoring
```

### Running the plugin

#### Download the secrets so that the bridge can authenticate the user with the api server backend

**For HTTP:**

```bash
cd bridge-auth-http
./setup.sh
cd ..
```

**For HTTPS:**

```bash
cd bridge-auth-https
./setup.sh
cd ..
```

#### Start the webpack server

In one terminal window, run:

```bash
yarn install
yarn start
```

**Note:** `yarn start` starts the plugin in HTTP mode. For HTTPS mode, run:

```bash
yarn start-tls
```

#### Start the console

In another terminal window, run:

```bash
oc login
yarn start-console
```

This requires [Docker](https://www.docker.com), [podman](https://podman.io), or another [OCI](https://opencontainers.org/) compatible container runtime.

This will run the OpenShift console in a container connected to the cluster you've logged into. The plugin HTTP server runs on port 9001 with CORS enabled. Navigate to http://localhost:9000 to see the running plugin.

To view our plugin on OpenShift, navigate to the Workloads section. The plugin will be listed as **Brokers**.

**For HTTPS mode:**

```bash
yarn start-console-tls
```

This command will run the console in HTTPS mode on port 9442. The console URL is https://localhost:9442

**Note:** Running console in HTTPS mode requires the plugin running in HTTPS mode too.

#### Specifying a Console Version

By default, the console will start with the `latest` version image. You can specify a different version by passing it as an argument:

```bash
yarn start-console 4.16
# Or with TLS
yarn start-console-tls 4.16
```

Supported versions can be found in the CI configuration file.

#### Console HTTPS Certificates

The console in HTTPS mode requires a private key and server certificate generated with openssl. They are located under `console-cert` directory:

- `domain.key` - Private key
- `domain.crt` - Server certificate
- `rootCA.crt` - Root CA certificate

**How they are generated:**

```bash
# 1. Generate private key
openssl genrsa -out domain.key 4096

# 2. Generate certificate signing request (CSR)
openssl req -key domain.key -new -out domain.csr

# 3. Generate self-signed certificate
openssl x509 -signkey domain.key -in domain.csr -req -days 3650 -out domain.crt

# 4. Generate root CA certificate and key
openssl req -x509 -nodes -sha256 -days 3650 -newkey rsa:4096 -keyout rootCA.key -out rootCA.crt

# 5. Sign domain certificate with root CA
openssl x509 -req -CA rootCA.crt -CAkey rootCA.key -in domain.csr -out domain.crt -days 3650 -CAcreateserial -extfile domain.ext
```

The signed `domain.crt` and `domain.key` are mounted to the docker container and passed to the console using `BRIDGE_TLS_CERT_FILE` and `BRIDGE_TLS_KEY_FILE` environment variables. See `start-console-tls.sh` for details.

### Trusting Self-Signed Certificates for WebSocket Hot Reloading

When running the plugin in HTTPS mode with `yarn start-tls`, the webpack dev server uses self-signed certificates for both HTTP and WebSocket connections. While your browser may accept the certificate for regular HTTP requests, **WebSocket connections require explicit certificate trust**.

If you see WebSocket connection errors in the browser console (e.g., `Firefox can't establish a connection to the server at wss://localhost:9444/ws`), follow these steps:

#### Trust the Certificate

1. **Open a new browser tab**
2. **Navigate directly to:** `https://localhost:9444`
3. **Accept the security warning:**
   - **Firefox**: Click "Advanced" → "Accept the Risk and Continue"
   - **Chrome**: Click "Advanced" → "Proceed to localhost (unsafe)"
4. **Return to your OpenShift console tab and refresh the page**

The WebSocket connection should now work, and hot reloading will function correctly.

#### WebSocket Configuration Details

The `webpack.config.tls.ts` file includes the following configuration to enable secure WebSocket connections for hot module replacement:

```javascript
devServer: {
  port: 9444,
  host: '0.0.0.0',
  https: {
    key: path.resolve(__dirname, 'console-cert/domain.key'),
    cert: path.resolve(__dirname, 'console-cert/domain.crt'),
    ca: path.resolve(__dirname, 'console-cert/rootCA.crt'),
  },
  hot: true,
  compress: true,
  client: {
    webSocketTransport: 'ws',
    webSocketURL: {
      hostname: 'localhost',
      pathname: '/ws',
      port: 9444,
      protocol: 'wss',
    },
  },
}
```

## PKI Setup and Cleanup Scripts

The `scripts` directory contains scripts for setting up and cleaning up PKI resources for ActiveMQ Artemis restricted mode testing.

### Shared Modules

All scripts use centralized modules in the `scripts/` directory to ensure consistency:

- **`scripts/setup-pki.js`** - Shared PKI setup functions (used by setup scripts and Playwright tests)
- **`scripts/cleanup-config.js`** - Shared cleanup configuration (used by cleanup scripts and Playwright tests)

This eliminates code duplication and ensures consistent behavior across development and test environments. Both TypeScript and JavaScript code import from these shared JavaScript modules.

### Chain of Trust Management

#### `yarn chain-of-trust <command>`

Manages PKI infrastructure for local development and testing with a single unified script.

**Commands:**

- `setup` - Creates a complete PKI infrastructure
- `cleanup` - Removes PKI infrastructure

**Options:**

- `--namespace <name>` - Target namespace for operator cert (default: "default")
- `--prefix <name>` - Prefix for resource names (default: "dev")
- `--help` - Show help message

**What setup creates:**

- Self-signed root ClusterIssuer (`{prefix}-selfsigned-root-issuer`)
- Root CA Certificate (`{prefix}-root-ca` in cert-manager namespace)
- CA-signed ClusterIssuer (`{prefix}-ca-issuer`)
- Trust Bundle (`activemq-artemis-manager-ca`, distributed to all namespaces)
- Operator Certificate (`activemq-artemis-manager-cert` in specified namespace)

**What cleanup removes:**

- Trust bundles
- Operator certificates and secrets
- ClusterIssuers (root and CA)
- Root CA certificates
- **All broker certificates** (both generic `broker-cert` and CR-specific `{name}-broker-cert`)

**Examples:**

```bash
# Setup with defaults (prefix: "dev", namespace: "default")
yarn chain-of-trust setup

# Setup in custom namespace
yarn chain-of-trust setup --namespace my-namespace

# Setup with custom prefix
yarn chain-of-trust setup --prefix test

# Cleanup with defaults
yarn chain-of-trust cleanup

# Cleanup with custom namespace and prefix
yarn chain-of-trust cleanup --namespace my-namespace --prefix test
```

#### `yarn pw:cleanup`

Cleans up leftover e2e test resources including namespaces.

**What it cleans:**

- E2E test namespaces (patterns: `e2e-test-*`, `e2e-restricted-*`)
- Test ClusterIssuers (patterns: `artemis-*`, `e2e-*`, `dev-*`)
- Test certificates containing "artemis"
- **All broker certificates** (pattern: `*broker-cert*`)
- **All broker certificate secrets** (pattern: `*broker-cert*`)
- Test bundles (activemq-artemis-manager-ca)

### Broker Certificate Cleanup

All scripts now properly clean up broker certificates in all their forms:

1. **Generic certificates**: `broker-cert`
2. **CR-specific certificates**: `{broker-name}-broker-cert` (e.g., `ex-aao-broker-cert`)

The cleanup uses pattern matching (`*broker-cert*`) to catch all variations, regardless of the specific broker name.

### Manual Cleanup Commands

If you need to clean up manually:

```bash
# Delete all broker certificates
kubectl get certificates -A -o json | \
  jq -r '.items[] | select(.metadata.name | contains("broker-cert")) | "\(.metadata.namespace) \(.metadata.name)"' | \
  xargs -r -L1 sh -c 'kubectl delete certificate $1 -n $0' || true

# Delete all broker certificate secrets
kubectl get secrets -A -o json | \
  jq -r '.items[] | select(.metadata.name | contains("broker-cert")) | "\(.metadata.namespace) \(.metadata.name)"' | \
  xargs -r -L1 sh -c 'kubectl delete secret $1 -n $0' || true

# Delete all test namespaces
kubectl get namespaces -o name | grep -E 'e2e-test-|e2e-restricted-' | xargs kubectl delete

# Delete all test ClusterIssuers
kubectl get clusterissuers -o name | grep -E 'e2e-|dev-|artemis-' | xargs kubectl delete
```

## E2E Tests

The project includes an end-to-end (E2E) test suite using **Playwright** to automate and validate its functionality in a realistic environment.

### E2E Prerequisites

Before running the E2E tests, ensure you have the following set up:

1. **Running OpenShift Cluster**: You must have a local or remote OpenShift cluster running. See [Setting up an OpenShift cluster](#setting-up-an-openshift-cluster).
2. **Operators Installed**: The `AMQ Broker` and `cert-manager` operators must be installed on the cluster.
3. **Authenticated `oc` CLI**: You must be logged into your cluster via the `oc` command line.
4. **Bridge Authentication**: The bridge authentication must be set up for HTTP (non-TLS):
   ```bash
   cd bridge-auth-http && ./setup.sh && cd ..
   ```
5. **Webpack Server**: The plugin's webpack server must be running in a terminal (non-TLS):
   ```bash
   yarn start
   ```

### Setting the kubeadmin Password

> [!IMPORTANT]
> The test suite requires the `kubeadmin` password to be set as an environment variable. You can retrieve the password for your local CRC cluster by running:
>
> ```bash
> crc console --credentials
> ```
>
> Then, export the variable:
>
> ```bash
> export KUBEADMIN_PASSWORD="<your-password>"
> ```

> [!NOTE]
> Alternatively, you can set your CRC `kubeadmin` password to the default value `kubeadmin` so you don't have to export the environment variable:
>
> ```bash
> crc config set kubeadmin-password kubeadmin
> ```

### Running Tests

With all prerequisites in place and the webpack server running:

1. **Start the Console**: In a second terminal, start the OpenShift console:

   ```bash
   yarn start-console
   ```

2. **Run Tests**: In a third terminal, choose one of the following options:

**Interactive Mode with UI** (recommended for development and debugging):

```bash
KUBEADMIN_PASSWORD=kubeadmin yarn pw:ui
```

Opens Playwright's UI Mode with a visual timeline, DOM snapshots, network inspection, and step-by-step debugging capabilities.

**Headed Mode** (browser visible, without UI):

```bash
KUBEADMIN_PASSWORD=kubeadmin yarn pw:headed
```

Runs tests with a visible browser window but without the interactive debugger.

**Headless Mode** (for CI or quick runs):

```bash
KUBEADMIN_PASSWORD=kubeadmin yarn pw:test
```

Runs tests in the terminal without opening a browser window.

### Test Structure

#### `restricted-broker.spec.ts`

Full end-to-end test for restricted mode broker creation:

1. Creates a unique namespace
2. Generates a ClusterIssuer chain of trust
3. Generates operator certificate
4. Generates broker certificate via UI
5. Generates trust bundle (CA)
6. Creates a restricted broker
7. Waits for broker to be ready
8. Deletes the broker
9. Cleans up all resources

#### `smoke.spec.ts`

Basic smoke tests for non-restricted mode broker creation and deletion.

### Debugging Tests

Playwright provides excellent debugging capabilities:

1. **UI Mode** (Recommended): Use `yarn pw:ui` to get:

   - Click on any action to see that exact state
   - "Pick locator" tool to test selectors
   - DOM snapshots, network, and console logs at each step
   - Speed slider to slow down test execution

2. **Inspector Mode**: Add `await page.pause()` in your test code, then run with `yarn pw:headed` to open the Playwright Inspector with step-over controls.

3. **VSCode Debugging**: Set breakpoints in test files and use VSCode's debugger with the Playwright extension.

### Test Cleanup

E2E tests create Kubernetes resources (namespaces, ClusterIssuers, Certificates, Bundles). These are automatically cleaned up after tests, but if tests fail or are interrupted, you may need to manually clean up:

```bash
# Clean up leftover e2e test resources
yarn pw:cleanup
```

### Troubleshooting

**Tests fail with "already exists" errors:**

```bash
yarn pw:cleanup
yarn pw:test
```

**Tests timeout:**

- Check that cert-manager and trust-manager are installed in the cluster
- Verify cluster resources are healthy: `kubectl get pods -n cert-manager`
- Increase timeout in `playwright.config.ts` if needed

**Resources not cleaned up:**

The `afterAll` hook should clean up resources even on test failure. If not:

```bash
yarn pw:cleanup
```

## Docker Image

1. **Build the image:**

   ```bash
   docker build -t quay.io/arkmq-org/activemq-artemis-self-provisioning-plugin:latest .
   ```

2. **Run the image:**

   ```bash
   docker run -it --rm -d -p 9001:80 quay.io/arkmq-org/activemq-artemis-self-provisioning-plugin:latest
   ```

3. **Push the image to image registry:**
   ```bash
   docker push quay.io/arkmq-org/activemq-artemis-self-provisioning-plugin:latest
   ```

## Deployment on Cluster

You can deploy the plugin to a cluster by running:

```bash
./deploy-plugin.sh [-i <image> -n]
```

Without any arguments, the plugin will run in HTTPS mode on port 9443.

**Options:**

- `-i <image>` or `--image <image>`: Specify the plugin image. Default: `quay.io/arkmq-org/activemq-artemis-self-provisioning-plugin:latest`

  ```bash
  ./deploy-plugin.sh -i quay.io/<repo-username>/activemq-artemis-self-provisioning-plugin:1.0.1
  ```

- `-n` or `--nossl`: Disable HTTPS and make the plugin run in HTTP mode on port 9001.

  ```bash
  ./deploy-plugin.sh -n
  ```

The `deploy-plugin.sh` script uses `oc kustomize` (built-in [kustomize](https://github.com/kubernetes-sigs/kustomize)) to configure and deploy the plugin using resources and patches defined under the `./deploy` directory.

**Deployment Structure:**

- `deploy/base/` - Default resources for deploying the plugin in HTTPS mode
- `deploy/http/` - Patch files for deploying the plugin in HTTP mode

**Undeploy:**

```bash
./undeploy-plugin.sh
```

## Configuring a Broker for Token Reviews

### Service Account

If you want to have a broker that is able to perform a token review, you will need to have access to a service account with enough rights. To create one, execute the following YAML on your environment:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ex-aao-sa
  namespace: default
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: ex-aao-sa-crb
subjects:
  - kind: ServiceAccount
    name: ex-aao-sa
    namespace: default
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: 'system:auth-delegator'
```

**Important:**

- The service account must reside in the same namespace as the broker you want to deploy.
- The role binding to `system:auth-delegator` has to be cluster-wide otherwise the broker won't be allowed to perform token reviews.

### Broker Environment Variables

While we wait for the `7.13` broker to get available, any broker that intends to perform a token review should have the following env in its spec:

```yaml
env:
  - name: KUBERNETES_CA_PATH
    value: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
  - name: KUBERNETES_SERVICE_HOST
    value: 'api.crc.testing'
  - name: KUBERNETES_SERVICE_PORT
    value: '6443'
```

### Example YAML for Token Reviews

Assuming you have the service account `ex-aao-sa` available in the same namespace as the broker you want to deploy and that you have created with the UI a custom JAAS config allowing your username to have admin access to the broker, your YAML should look like this:

```yaml
apiVersion: broker.amq.io/v1beta1
kind: ActiveMQArtemis
metadata:
  name: ex-aao
  namespace: default
spec:
  env:
    - name: KUBERNETES_CA_PATH
      value: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    - name: KUBERNETES_SERVICE_HOST
      value: 'api.crc.testing'
    - name: KUBERNETES_SERVICE_PORT
      value: '6443'
  ingressDomain: apps-crc.testing
  console:
    expose: true
  deploymentPlan:
    image: placeholder
    requireLogin: false
    size: 1
    podSecurity:
      serviceAccountName: ex-aao-sa
    extraMounts:
      secrets:
        - custom-jaas-config
```

## Additional Documentation

For more detailed information about specific components:

- **PKI Setup Details**: See the `scripts/` directory for setup-pki.js and cleanup-config.js source code
- **Playwright Fixtures**: See `playwright/fixtures/` for test helper functions and shared setup code
- **Deployment Configuration**: See `deploy/` directory for kustomize resources and patches
