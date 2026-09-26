# Verify Security Requirement Evidence for COS + DB

## IBM Cloud Object Storage

### Encryption at rest

IBM Cloud Object Storage documentation confirms that data stored in COS is encrypted at rest by default using provider-side AES-256 encryption.

### Encryption in transit

IBM Cloud Object Storage documentation confirms that data in motion is protected using TLS/SSL. IBM also documents that COS endpoints support TLS 1.2 and reject plain-text IAM requests.

### COS result

**PASS — verified**

### Evidence sources

- IBM Cloud Object Storage — FAQ: Encryption  
  https://cloud.ibm.com/docs/cloud-object-storage?topic=cloud-object-storage-faq-encryption

- IBM Cloud Object Storage — Data security  
  https://cloud.ibm.com/docs/cloud-object-storage?topic=cloud-object-storage-security

- IBM Cloud Object Storage — Endpoints and storage locations  
  https://cloud.ibm.com/docs/cloud-object-storage?topic=cloud-object-storage-endpoints

---

## PostgreSQL database

### Current architecture

The project is currently using a PostgreSQL database container, as suggested by the client, rather than an IBM managed database service.

The database has not yet been deployed to Code Engine, so there is no live database instance or final runtime configuration available to inspect.

### Encryption in transit

The current project setup does not explicitly configure TLS for backend-to-PostgreSQL communication.

Because TLS is not yet configured, the team cannot currently provide evidence that backend-to-database traffic is encrypted in transit.

### Encryption at rest

The current container-based database design does not yet have a finalised storage approach that provides documented evidence of database encryption at rest.

IBM Code Engine provides ephemeral container storage, but this does not by itself provide the project with verifiable database-at-rest encryption evidence for the planned PostgreSQL deployment.

### DB result

**GAP IDENTIFIED — not yet verified**

The database security controls still need to be finalised before deployment.

The team needs to decide and document:

- how TLS will be configured between the backend and PostgreSQL; and
- how PostgreSQL data will be stored so that encryption at rest can be verified.

## Overall result

**PARTIAL PASS / BLOCKED**

- [x] COS encryption at rest verified.
- [x] COS encryption in transit verified.
- [x] Official IBM documentation recorded as evidence.
- [x] Current database architecture confirmed as PostgreSQL-in-container.
- [x] Database encryption gap identified and documented.
- [ ] Database encryption in transit verified.
- [ ] Database encryption at rest verified.

## Security gap / follow-up

The project is currently using a PostgreSQL database container as suggested by the client, but the team has not yet finalised how the database will be secured for encryption at rest and in transit.

This remains an open technical/security decision and should be resolved before deployment.

