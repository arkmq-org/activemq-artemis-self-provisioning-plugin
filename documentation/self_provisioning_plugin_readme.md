  
# **Using the self-provisioning plugin**

A development preview version of the self-provisioning plugin is available with AMQ Broker 7.13.

The self-provisioning plugin is a dynamic plugin for the Openshift Console. The plugin adds a new broker workload type to the Openshift console. You can use the broker workload type to create broker deployments on Openshift.

## **Features**  
The Graphic User Interface (GUI) for the new workload type provides a number of features that are available to try out:

* Create brokers, add acceptors, connectors and configure the Management Console.  
    
* Use a certificate management workflow that integrates with cert-manger for Openshift to secure connections to a broker’s acceptors and the AMQ Management Console.

* Use pre-established configuration options called presets. Presets are commonly used settings to quickly configure objects on the system.

* Create a Java Authentication and Authorization Service (JAAS) configuration for  authentication and to authorize access to resources such as addresses and queues.



## **Creating brokers** 

1. In the OpenShift console menu, click **Workloads->Brokers.**

2. In the **Project** dropdown menu on the **Brokers** page, select an Openshift namespace in which to create the broker.  
     
3. Click **Create Broker.**

4. In the **CR Name** field, specify the name you want to give to the broker.

5. Click **Create**.

6. In the **Brokers** page, verify that the **Ready** column for the new broker is **True** to confirm that the broker deployed successfully.

## **Configuring brokers**

In the dev preview you can complete the following configuration tasks:

* Create and configure acceptors that can be used by an application from either inside or outside the cluster on which the broker is running.

* Configure authentication and authorization to grant access to resources on the broker

### **Configuring an acceptor for internal applications**

Internal applications run on the same OpenShift cluster as the broker. Complete the following steps to configure an acceptor for use by internal applications.

1. In the **Brokers** page, click the **three** **dots** at the end of the row for the new broker you created and click **Edit** **Broker**.

2. Click **Add an acceptor**.

   The default port number of the first acceptor you create is 5555, which you will require to send messages to the acceptor later in this procedure. The port number is incremented by 1 in each subsequent acceptor you create. 

3. Click **Apply**.

4. Use the OpenShift command-line interface (CLI) to access the shell for the broker pod:

   **oc get pods**

   **oc rsh \<podname>**

5. Test sending messages to the acceptor you created:

   **cd /home/jboss/amq-broker/bin**

   **./artemis check queue --name TEST --produce 10 --browse 10 --consume 10 --url tcp://localhost:5555**

   If the test is successful, you see output similar to the following:

   Checking that a producer can send 10 messages to the queue TEST ... success  
   Checking that a consumer can browse 10 messages from the queue TEST ... success  
   Checking that a consumer can consume 10 messages from the queue TEST ... success

### **Configuring authentication and authorization**

You can use Java Authentication and Authorization Service (JAAS) to configure authentication and authorization on the broker. In the JAAS configuration, you can define the following authentication methods:

* Token authentication to authenticate OpenShift users so they can connect to the broker by using the self-provisioning plugin  
* Username and password authentication for users configured on the broker for messaging 

For authorization, you can configure Role Based Access Control (RBAC). With RBAC, access to the broker resources is based on which roles a user has.

**Prerequisites**

* You installed version 7.13 of the AMQ Broker Operator for RHEL 8\. You can configure RBAC only on brokers created by using version 7.13 of the Operator.

* The cluster administrator has created a cluster level service account that has the system:auth-delegator role. This broker uses this service account to conduct token reviews to identify the roles associated with a token. The following example YAML creates a service account with the required role binding.

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

* You created users on your OpenShift cluster that you want to authenticate with the broker by using token authentication. Only users that authenticate with the broker by using token authentication can use the self-provisioning plugin to configure and manage brokers.

**Procedure**

1. Prepare a text file that contains a list of users you want to configure on a broker for messaging. Also prepare a text file that contains a list of roles you want to configure on the broker and the users that are assigned to each role. You can assign messaging-related permissions to the configured roles later in this procedure.

   1. Add the users you want to create on the broker to a text file named extra-users.properties.  For example:

      user1=password4user1  
      user2=password4user2

   2. Add the roles you want to create on the broker to a text file named extra-roles.properties and assign users to the roles. For example:

      queue\_users1=user1  
      queue\_users2=user2

2. Prepare a text file named K8s-users-to-roles-mapping.properties that contains the names of users on your OpenShift cluster that you want to assign to the admin role on the broker. Only users that have the admin role can authenticate with the broker by using token authentication. For example:

   admin=kube:admin, alice,ben

3. Create the jaas configuration in the self-provisioning plugin UI.  

   1. In the **Brokers** page, click the **three** **dots** at the end of the row for the new broker you created and click **Edit** **Broker**.

   2. Click **Access control**

   3. Enable **RBAC**.

   

   4. In the **Service Account** field, select a service account that has been assigned the **system:auth-delegator** role. The broker requires a service account with this role to review bearer tokens to determine the roles assigned to a user.

   

   5. Click **Create a new jaas config.**

   

   6. In the **jaas config name** field, specify a name to identify the JAAS configuration. A secret is created with the specified name to store the JAAS configuration.

   

   7. In the **Admin username** field, specify a user that you want to add to the broker and assign to the broker admin role. By default, the user you specify is added to the admin and queue\_users roles on the broker. Initially, this is the only user that has permission to use the broker for messaging. 

      If the user you specify is an OpenShift user on the cluster, the user is also assigned to the broker admin role, which grants the user permission to use token authentication to log into the broker. A user that is authenticated by using token authentication can use the self-provisioning plugin to configure and manage brokers.

   

   8. Click **Create the jaas config**.


   9. Click **Apply**.


   10. In the **Brokers** page, click the **three** **dots** at the end of the row for the new broker you created and click **Edit** **Broker**.


   11. Click **Access control**.
   

   12. Click **edit**. 

   

   13. In the **Value** field for the **extra-roles.properties** key, click **Browse**  and browse to the file you created earlier that contains the broker roles.

   

   14. In the **Value** field for the **extra-users.properties** key, click **Browse**  and browse to the file you created earlier that contains the broker users.

   

   15. In the **Value** field for the **k8s-users-to-roles-mapping.properties** key, click **Browse** and browse to the file you created earlier that contains the Openshift users that you want to assign to the admin broker role.

   

   16. Click **Save**. 

1. Update the permissions for the new roles in the **extra-roles.properties** file you added to the JAAS configuration:

   1. In the OpenShift console menu, click **Workloads-\>Brokers.** 

   2. In the **Brokers** page, click the **three** **dots** at the end of the row for the new broker you created and click **Edit** **Broker**.

   3. Click **Access control**.
   

   4. Click the **rebuild security roles.** All the roles specified in the **extra-roles.properties** file are added to the list of security roles configured on the broker.

   5. Expand **Security roles** and update the permissions for the roles configured on the broker. By default, each role is granted all permissions, which is indicated by a value of **true** for each permission. If you want to remove a permission for a role, replace **true** with **false** and click **update**. 

   6. Click **Apply**.

NOTE: If you edit the JAAS configuration and add new roles, clicking **rebuild security roles** displays the new roles under **Security roles**. You can then customize the permissions assigned to the new roles. However, any customizations that you made to existing roles are overwritten. 

### **Configure an acceptor for external applications**

External applications run outside the OpenShift cluster. You can configure external applications to connect to a broker acceptor by using an ingress that is secured with a TLS certificate.

1. Click **Add an Acceptor**.

2. Click **Apply Preset**. 

   The SPP GUI contains pre-established configuration options called **presets**, which you can apply to objects.

3. Select the **Cert-Manager issuer and ingress exposure** preset.

   This preset creates a TLS certificate to secure the acceptor and exposes the acceptor using an ingress.

4. Click **Create a new chain of trust**.

5. In the **Name of the issuer** field specify the name of the issuer that will create the TLS certificate and click **Create.**

6. Click **Confirm**.

7. Click **Apply**.

8. Test connectivity to the broker from outside the OpenShift cluster.

   1. In the **Brokers** page, click the hyperlink for the broker in the **Name** column.

   

   2. Under **Connectivity**, complete the instructions to test connectivity to the broker acceptor.

## **Known issues**

The following are known issues with the dev preview release of the self-provisioning plugin:

* The Jolokia API server uses an unsecured connection to the broker even if you enable SSL for the AMQ Management console.

* If you modify security roles after you create the JAAS configuration and you then choose the **rebuild security roles** option, any changes you made to permissions for existing roles are overwritten.

