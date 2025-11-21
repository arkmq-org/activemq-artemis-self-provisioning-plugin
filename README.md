# ActiveMQ Artemis Self Provisioning Plugin

This project is a ActiveMQ Artemis Self Provisioning Plugin to the Administrator
perspective in OpenShift console. It requires at least OpenShift `4.18` to use
and is compatible with OpenShift `4.19`.

## Local development

To be able to run the local development environment you need to:

- have access to a local or remote OpenShift cluster
- have the operator installed on the cluster
- have the cert-manager operator installed on the cluster
- have the plugin running
- have the console running

### Setting up an OpenShift cluster

In order to run the project you need to have access to an OpenShift cluster.
If you don't have an access to a remote one you can deploy one on your machine
with `crc`.

#### Local cluster

Follow the documentation:
https://access.redhat.com/documentation/en-us/red_hat_openshift_local/2.34/html-single/getting_started_guide/index#introducing

> [!WARNING]
> If you're encountering an issue where `crc` gets stuck in the step `Waiting
for kube-apiserver availability` or `Waiting until the user's pull secret is
written to the instance disk...` [you might
> need](https://github.com/crc-org/crc/issues/4110) to
> configure the network as local: `crc config set network-mode user`

Once your environment is set up you simply need to `crc start` your cluster.

#### Connecting to the cluster

Depending on the remote or local env:

- `oc login -u kubeadmin
https://api.ci-ln-x671mxk-76ef8.origin-ci-int-aws.dev.rhcloud.com:6443` (to
  adapt depending on your cluster address)
- `oc login -u kubeadmin https://api.crc.testing:6443`

### Installing the operator

The plugin requires having access to the operator to function. You can either
get the operator from the operatorHub or from the upstream repo.

#### From the operatorHub

Navigate to the operatorHub on the console and search for: `Red Hat Integration

- AMQ Broker for RHEL 8 (Multiarch)` After installation the wait for the
  operator container to be up and running.

> [!WARNING]
> If you're running into an issue where the operatorHub is not accessible, try
> to force its redeployment: `oc delete pods --all -n openshift-marketplace`
> see https://github.com/crc-org/crc/issues/4109 for reference.

#### From the upstream repository

Clone the operator repository then run `./deploy/install_opr.sh` to install the
operator onto your cluster.

```
git clone git@github.com:arkmq-org/activemq-artemis-operator.git
cd activemq-artemis-operator
./deploy/install_opr.sh
```

> [!TIP]
> If you need to redeploy the operator, first call `./deploy/undeploy_all.sh`

> [!IMPORTANT]
> The script `install_opr.sh` will try to deploy on OpenShift with the `oc`
> command. If it's not available it will fallback to `kubectl`. Make sure your
> OpenShift cluster is up and running and that `oc` is connected to it before
> running the install.

### Installing the cert-manager operator

The plugin requires having access to the cert-manager operator for certain of
its functionalities.

#### From the operatorHub

Navigate to the operatorHub on the console and search for `Cert-manager`.

#### Bootstraping a cluster issuer

Apply this:

```yaml
oc apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-selfsigned-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: my-selfsigned-ca
  secretName: root-secret
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
    group: cert-manager.io
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: my-ca-issuer
spec:
  ca:
    secretName: root-secret
EOF
```

### Install trust manager

First, add the Jetstack Helm repository.

```
helm repo add jetstack https://charts.jetstack.io --force-update
```

Now, install trust-manager. This will be configured to sync trust Bundles to Secrets in all namespaces.

```
helm upgrade trust-manager jetstack/trust-manager --install --namespace cert-manager --set secretTargets.enabled=true --set secretTargets.authorizedSecretsAll=true --wait
```



### Running the plugin

#### Download the secrets so that the bridge can authenticate the user with the api server backend

1. For HTTP

```
cd bridge-auth-http
./setup.sh
```

2. For HTTPS

```
cd bridge-auth-https
./setup.sh
```

#### start the webpack server

In one terminal window, run:

1. `yarn install`
2. `yarn start`

Note: `yarn run start` starts the plugin in http mode.
if you want the plugin to run in https mode, run

`yarn run start-tls`

#### start the console

In another terminal window, run:

1. `oc login`
2. `yarn run start-console` (requires [Docker](https://www.docker.com) or [podman](https://podman.io) or another [Open Containers Initiative](https://opencontainers.org/) compatible container runtime)

This will run the OpenShift console in a container connected to the cluster
you've logged into. The plugin HTTP server runs on port 9001 with CORS enabled.
Navigate to <http://localhost:9000> to see the running plugin.

To view our plugin on OpenShift, navigate to the Workloads section. The plugin will be listed as **Brokers**.

If you want the console to run in `https` mode, run:

`yarn run start-console-tls`

This command will run the console in `https` mode on port 9442.
The console url is <https://localhost:9442>

Note: Running console in `https` mode requires the plugin running in `https` mode too.

The console in https mode requires a private key and a server certificate that are generated
with openssl command. They are located under `console-cert` directory. The domain.key is the
private key and domain.crt is the server certificate. Please read the `console-cert/readme`
for instructions on how they are generated.

To run the console in https mode, you need to mount the private key and server cert to the
docker container and pass the locations to the console using BRIDGE_TLS_CERT_FILE and
BRIDGE_TLS_KEY_FILE environment variables respectively. Please see the `start-console-tls.sh`
for details.

##### Specifying a Console Version

By default, the console will start with the `latest` version image. You can specify a different version by passing it as an argument to the `yarn start-console` or `yarn start-console-tls` commands. This is useful for testing compatibility with older console versions.

For example, to run the console using version `4.16`:

```sh
yarn start-console 4.16
# Or with TLS if required
yarn start-console-tls 4.16
```

Supported versions can be found in the CI configuration file. This allows you to manually test the plugin's behavior on specific OpenShift releases.

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

The `client.webSocketURL` configuration explicitly tells the webpack dev server client where to connect for hot reloading updates, ensuring it uses the secure WebSocket protocol (`wss://`).

## E2E Tests

The project includes an end-to-end (E2E) test suite using **Playwright** to automate and validate its functionality in a realistic environment.

### Prerequisites

Before running the E2E tests, ensure you have the following set up:

1.  **Running OpenShift Cluster**: You must have a local or remote OpenShift cluster running. See the [Setting up an OpenShift cluster](#setting-up-an-openshift-cluster) section for details.
2.  **Operators Installed**: The `AMQ Broker` and `cert-manager` operators must be installed on the cluster.
3.  **Authenticated `oc` CLI**: You must be logged into your cluster via the `oc` command line.
4.  **Bridge Authentication**: The bridge authentication must be set up for HTTP (non-TLS). From the project root, run:
    ```sh
    cd bridge-auth-http && ./setup.sh && cd ..
    ```
5.  **Webpack Server**: The plugin's webpack server must be running in a terminal (non-TLS). From the project root, run:
    ```sh
    yarn start
    ```

### Setting the kubeadmin Password

> [!IMPORTANT]
> The test suite requires the `kubeadmin` password to be set as an environment variable. You can retrieve the password for your local CRC cluster by running:
>
> ```sh
> crc console --credentials
> ```
>
> Then, export the variable:
>
> ```sh
> export KUBEADMIN_PASSWORD="<your-password>"
> ```

> [!NOTE]
> Alternatively, you can set your CRC `kubeadmin` password to the default value `kubeadmin` so you don't have to export the environment variable. You can do this by running the following command before starting your CRC cluster:
>
> ```sh
> crc config set kubeadmin-password kubeadmin
> ```

### Running the Test Suite Locally

With all the prerequisites in place and the webpack server running, you can run the tests.

1.  **Start the Console**: In a second terminal, start the OpenShift console.

    ```sh
    yarn start-console
    ```

2.  **Run Tests**: In a third terminal, choose one of the following options:

- **Interactive Mode with UI** (recommended for development and debugging):

  ```sh
  KUBEADMIN_PASSWORD=kubeadmin yarn pw:ui
  ```

  Opens Playwright's UI Mode with a visual timeline, DOM snapshots, network inspection, and step-by-step debugging capabilities.

- **Headed Mode** (browser visible, without UI):

  ```sh
  KUBEADMIN_PASSWORD=kubeadmin yarn pw:headed
  ```

  Runs tests with a visible browser window but without the interactive debugger.

- **Headless Mode** (for CI or quick runs):
  ```sh
  KUBEADMIN_PASSWORD=kubeadmin yarn pw:test
  ```
  Runs tests in the terminal without opening a browser window.

### Debugging Tests

Playwright provides excellent debugging capabilities:

1. **UI Mode** (Recommended): Use `yarn pw:ui` to get:

   - Click on any action to see that exact state
   - "Pick locator" tool to test selectors
   - DOM snapshots, network, and console logs at each step
   - Speed slider to slow down test execution

2. **Inspector Mode**: Add `await page.pause()` in your test code, then run with `yarn pw:headed` to open the Playwright Inspector with step-over controls.

3. **VSCode Debugging**: Set breakpoints in test files and use VSCode's debugger with the Playwright extension.

## Docker image

1. Build the image:
   ```sh
   docker build -t quay.io/arkmq-org/activemq-artemis-self-provisioning-plugin:latest .
   ```
2. Run the image:
   ```sh
   docker run -it --rm -d -p 9001:80 quay.io/arkmq-org/activemq-artemis-self-provisioning-plugin:latest
   ```
3. Push the image to image registry:
   ```sh
   docker push quay.io/arkmq-org/activemq-artemis-self-provisioning-plugin:latest
   ```

## Deployment on cluster

You can deploy the plugin to a cluster by running this following command:

### deploy the plugin

```sh
./deploy-plugin.sh [-i <image> -n]
```

Without any arguments, the plugin will run in https mode on port 9443.

The optional `-i <image>` (or `--image <image>`) argument allows you to pass in the plugin image. If not specified the default
`quay.io/arkmq-org/activemq-artemis-self-provisioning-plugin:latest` is deployed. for example:

```sh
./deploy-plugin.sh -i quay.io/<repo-username>/activemq-artemis-self-provisioning-plugin:1.0.1
```

The optional `-n` (or `--nossl`) argument disables the https and makes the plugin run in http mode on port 9001.
For example:

```sh
./deploy-plugin.sh -n
```

The deploy-plugin.sh uses `oc kustomize` (built-in [kustomize](https://github.com/kubernetes-sigs/kustomize)) command to configure and deploy the plugin using
resources and patches defined under ./deploy directory.

To undeploy the plugin, run

```sh
./undeploy-plugin.sh
```

## Configuring a Broker for token reviews

### Service account

If you want to have a broker that is able to perform a token review, you will
need to have access to a service account with enough rights. To create one,
execute the following YAML on your environment:

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

Important:

- The service account must reside in the same namespace as the broker you want
  to deploy.
- The role binding to 'system:auth-delegator' has to be cluster wide otherwise
  the broker won't be allowed to perform token reviews.

### Broker env

While we wait for the `7.13` broker to get available, any broker that intends to
perform a token review should have the following env in its spec:

```yaml
env:
  - name: KUBERNETES_CA_PATH
    value: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
  - name: KUBERNETES_SERVICE_HOST
    value: 'api.crc.testing'
  - name: KUBERNETES_SERVICE_PORT
    value: '6443'
```

### An example of valid YAML for token reviews

Assuming you have the service account `ex-aao-sa` available in the same
namespace as the broker you want to deploy and that you have created with the UI
a custom jaas config allowing your username to have admin access to the broker,
your YAML should look like this.

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
