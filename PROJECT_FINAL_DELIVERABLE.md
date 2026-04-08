---
Project: TWS – The Wolf Stack (Multi-Tenant SaaS ERP Platform)
Document Type: Final Project Deliverable (BS Information Technology)
University: University of Education
Format: APA 6th Edition | Times New Roman | A4
---

<!--
  FORMATTING INSTRUCTIONS (for MS Word / LaTeX conversion):
  - Page Size: A4 | Top/Bottom: 1 inch | Left: 1.5 inch | Right: 1 inch
  - Font: Times New Roman 12 (body), Bold 16 (Chapter Heading), Bold 14 (H1), Bold 12 (H2), Bold Italic 12 (H3)
  - Footer (left): University of Education | Header (left): TWS – The Wolf Stack
  - Page numbers: Bottom right (roman for front matter, integer from Chapter 1 onward)
  - Title page: not numbered
-->

---

# INNER TITLE PAGE

**TWS – THE WOLF STACK**
**A Multi-Tenant SaaS Enterprise Resource Planning Platform**

*A Final Year Project Submitted in Partial Fulfillment of the Requirements*
*for the Degree of*

**Bachelor of Science in Information Technology**

*Submitted by:*

| Name | Registration No. |
|------|-----------------|
| [Student Name 1] | [Reg. No.] |
| [Student Name 2] | [Reg. No.] |
| [Student Name 3] | [Reg. No.] |

*Supervised by:*
[Supervisor Name]
[Department of Information Technology]

**University of Education**
[Campus Name]
[Month, Year]

---

# STATEMENT OF SUBMISSION

We, the undersigned, hereby state that the project entitled **"TWS – The Wolf Stack: A Multi-Tenant SaaS Enterprise Resource Planning Platform"** has been carried out under the supervision of **[Supervisor Name]** and submitted to the Department of Information Technology, University of Education, in partial fulfillment of the requirements for the degree of Bachelor of Science in Information Technology.

This work has not been submitted anywhere else for any degree.

| | |
|---|---|
| **[Student Name 1]** | **[Student Name 2]** |
| Registration No. | Registration No. |

Date: _______________

---

# DECLARATION

We hereby declare that the project presented in this document titled **"TWS – The Wolf Stack: A Multi-Tenant SaaS Enterprise Resource Planning Platform"** is our own work. We have not copied it from any student's work or from any other source except where due reference or acknowledgement is made explicitly in the text. Nor has any part of it been written for us by another person.

_________________________________
[Student Name 1]
Date: _______________

_________________________________
[Student Name 2]
Date: _______________

---

# PLAGIARISM UNDERTAKING

We solemnly declare that this project report has been submitted to the university for plagiarism detection and the similarity index is within the acceptable limit as prescribed by the Higher Education Commission (HEC) of Pakistan and the University of Education. Any material used from existing literature has been properly cited following the APA 6th edition referencing style.

We understand that if the submitted report is found to contain plagiarized content beyond the allowed threshold, the university reserves the right to annul the degree awarded on the basis of this work.

_________________________________
[Student Name 1]

_________________________________
[Student Name 2]

Date: _______________

---

# CERTIFICATE OF APPROVAL

This is to certify that the project titled **"TWS – The Wolf Stack: A Multi-Tenant SaaS Enterprise Resource Planning Platform"** submitted by **[Student Names]**, Registration Numbers **[Reg. Nos.]**, has been examined and is hereby approved for the award of the degree of **Bachelor of Science in Information Technology** from the **University of Education**.

**Supervisor:** ___________________________
[Supervisor Name]
Department of Information Technology
University of Education

**Internal Examiner:** ___________________________
[Examiner Name]
Date: _______________

**External Examiner:** ___________________________
[Examiner Name]
Date: _______________

**HOD/Controller of Examinations:** ___________________________

---

# NOTIFICATION

It is hereby notified that the project titled **"TWS – The Wolf Stack"** submitted by **[Student Names]** has been reviewed and accepted by the Board of Examiners, Department of Information Technology, University of Education, in fulfillment of the requirements for the degree of **Bachelor of Science in Information Technology (BSIT)**.

Approved by:
**[Head of Department]**
Department of Information Technology
University of Education

---

# ACKNOWLEDGEMENT

All praise and gratitude are due to Almighty Allah, the Most Gracious and the Most Merciful, for granting us the ability, patience, and perseverance to complete this project.

We are deeply grateful to our supervisor, **[Supervisor Name]**, whose guidance, critical feedback, and academic rigor shaped this project from its conception to its completion. His/Her constant support and insightful direction were invaluable throughout the entire development lifecycle.

We extend our sincere thanks to the faculty of the Department of Information Technology at the University of Education for providing an environment that fosters learning, critical thinking, and practical application of knowledge.

We are especially thankful to our families for their unwavering moral support, patience, and encouragement throughout our academic journey.

Finally, we acknowledge the contribution of the open-source community whose tools, libraries, and frameworks formed the technical backbone of this project.

---

# ABSTRACT

## Background

Modern organizations face the challenge of managing increasingly complex business operations through fragmented, industry-agnostic software tools. Software houses and technology companies in particular lack integrated platforms that address the unique intersection of project delivery, client management, human resource operations, and financial governance within a single, unified system. The proliferation of disconnected tools creates data silos, inefficiencies, and compliance risks that reduce operational effectiveness.

## Objectives

The primary aim of this project is to design, develop, and deploy a cloud-based, multi-tenant Software-as-a-Service (SaaS) Enterprise Resource Planning (ERP) platform — **TWS (The Wolf Stack)** — specifically engineered for software houses and technology organizations. The platform's objectives include: (1) providing a unified workspace that consolidates project management, human resources, finance, and client relationship management; (2) implementing a robust multi-tenant architecture that ensures complete data isolation between organizations; (3) enforcing granular Role-Based Access Control (RBAC) with department-scoped permissions; and (4) delivering real-time collaboration capabilities to support geographically distributed teams.

## Research Methodology

The project follows an **Agile Incremental Development Methodology**, organized into five structured phases: Requirements Analysis, System Architecture & Design, Iterative Implementation, Testing & Quality Assurance, and Deployment. The MERN stack (MongoDB, Express.js, React.js, Node.js) was selected as the primary technology stack based on its suitability for real-time, scalable, API-driven SaaS applications. System requirements were gathered through domain analysis of existing ERP solutions, stakeholder role identification, and iterative prototyping. The database was designed using a document-oriented schema to support flexible, tenant-scoped data models.

## Findings

The developed system — TWS — successfully implements a fully functional Software House ERP with the following key modules: (1) **Nucleus Project Management** providing workspaces, Kanban boards, Gantt charts, deliverable tracking, and change request workflows; (2) **Human Resource Management** covering employee records, attendance, payroll, and leave management; (3) **Finance Module** supporting invoicing, expense tracking, and financial reporting; (4) **Client Management** with a dedicated read-only client portal; (5) **Document Hub** offering versioned document management with approval workflows; and (6) **Real-time Notification System** using WebSockets. The platform supports multiple user roles — including Supra Admin, Tenant Admin, Project Manager, Developer, HR Manager, Finance Manager, and Client — with complete permission isolation per tenant.

## Conclusions

TWS demonstrates that a purpose-built, multi-tenant SaaS ERP platform can effectively unify the operational needs of a software house into a single, secure, and scalable system. The implementation validates the feasibility of the MERN stack for enterprise-grade SaaS applications and confirms that document-oriented databases (MongoDB) are well-suited for multi-tenant, schema-flexible ERP data models.

## Implications

This project has direct practical implications for small to medium-sized software houses seeking an affordable, integrated alternative to expensive enterprise ERP solutions. The platform's multi-tenant architecture makes it commercially viable as a hosted SaaS product. The permission system and modular design provide a reusable foundation for extending the platform to other industries, including healthcare, education, retail, and manufacturing.

## Limitations

Several limitations were identified during development: (1) the current implementation focuses exclusively on the Software House ERP vertical, with other industry modules requiring future development; (2) mobile native applications (iOS/Android) are not included in the current scope; (3) advanced AI-powered analytics are partially implemented; (4) biometric attendance integration and blockchain-based certificate issuance remain planned features; and (5) performance testing was conducted under simulated load conditions and not at production scale.

---

# TABLE OF CONTENTS

- Abstract
- Chapter 1: Gathering and Analyzing Information
  - 1.1 Introduction
  - 1.2 Problem Statement
  - 1.3 Goal and Objectives
  - 1.4 Research Questions
  - 1.5 Methodology
  - 1.6 Definitions, Acronyms, and Abbreviations
- Chapter 2: Software Requirement Specification
  - 2.1 Stakeholder Characteristics
  - 2.2 Domain Requirements
  - 2.3 Functional Requirements
  - 2.4 Non-Functional Requirements
- Chapter 3: Analysis
  - 3.1 Use Case Model
  - 3.2 Use Case Descriptions
- Chapter 4: Design
  - 4.1 Architecture Diagram
  - 4.2 Entity Relationship Diagram (ERD)
  - 4.3 Data Flow Diagram (Level 0 and Level 1)
  - 4.4 Class Diagram
  - 4.5 Sequence Diagram
- Chapter 5: Graphical User Interfaces
- Chapter 6: Testing
  - 6.1 Introduction
  - 6.2 Test Plan
  - 6.3 Test Scenarios
  - 6.4 Test Cases Specifications
  - 6.5 Test Results
- Chapter 7: Conclusion and Future Work
- References
- Appendix

---

---

# CHAPTER 1

# Gathering and Analyzing Information

---

## 1.1 Introduction

The digital transformation of business operations has made Enterprise Resource Planning (ERP) systems a fundamental requirement for organizations of all sizes. Traditional ERP systems — designed primarily for manufacturing, retail, or general business — fail to address the specific workflow requirements of technology companies and software houses. The unique characteristics of software development organizations, including iterative project delivery cycles, distributed team structures, billable hour tracking, client collaboration, and knowledge management, require a specialized platform that combines project management, human resources, finance, and client relationship management within a unified ecosystem.

**TWS (The Wolf Stack)** is a cloud-native, multi-tenant SaaS ERP platform engineered to address this gap. The system is designed to serve as the central operational hub for software development organizations, providing integrated modules that support every facet of a software house's business — from project inception to client delivery, from employee onboarding to payroll disbursement, and from expense recording to financial reporting. The platform is built on the MERN stack (MongoDB, Express.js, React.js, Node.js) and deployed on cloud infrastructure, making it accessible, scalable, and maintainable.

The multi-tenant architecture of TWS enables a single platform deployment to serve multiple organizations simultaneously while maintaining complete data isolation between tenants. Each organization (tenant) operates within its own secure data boundary, with customizable branding, module configuration, and user access policies. This architecture makes TWS commercially viable as a hosted SaaS product without requiring per-organization infrastructure.

The platform implements a hierarchical access control model with three tiers: the **Supra Admin** (platform operator), the **Tenant Admin** (organization administrator), and **Tenant Users** (employees, managers, clients). This model ensures that the right users have access to the right information at the right time, a principle central to enterprise information systems.

## 1.2 Problem Statement

Organizations operating in the software development industry face a common set of operational challenges that stem from the fragmentation of their business tools:

**1. Operational Fragmentation:** Software houses typically rely on a collection of disconnected tools — Jira for project tracking, QuickBooks for accounting, Slack for communication, BambooHR for human resources — resulting in data silos that prevent cross-functional visibility and reporting.

**2. Absence of Industry-Specific ERP:** Generic ERP solutions are designed for manufacturing or retail workflows and lack the constructs required by software companies, such as project-based billing, code sprint management, deliverable approval workflows, client portals, and billable hour tracking.

**3. Multi-Tenancy and Scalability Concerns:** Organizations offering SaaS products or managing multiple clients need platforms that support multi-tenant architectures. Custom-built solutions rarely achieve true tenant data isolation without significant infrastructure investment.

**4. Inefficient Access Control:** Existing solutions either implement overly permissive access control, creating security risks, or overly restrictive controls that reduce productivity. A fine-grained, department-scoped RBAC system is needed to balance security and usability.

**5. Real-time Collaboration Deficit:** Distributed software teams require real-time updates on project status, task changes, and deliverable submissions. Most traditional ERP systems are built on synchronous request-response models that do not support live collaboration.

**6. Compliance and Audit Gaps:** Organizations subject to financial and data compliance requirements (SOX, GDPR, HIPAA-ready) lack ERP systems with built-in audit trails, data encryption, and access logging.

**7. Client Visibility:** Clients of software houses have no standardized mechanism for tracking project progress, reviewing deliverables, or downloading invoices without being given inappropriate access to internal systems.

TWS addresses each of these challenges through a purpose-built, modular, multi-tenant SaaS architecture.

## 1.3 Goal and Objectives

### Goal

To develop a production-ready, cloud-based multi-tenant SaaS ERP platform — TWS — that unifies the operational management of software houses, enabling organizations to manage projects, people, finances, and clients through a single, secure, and scalable system.

### Objectives

1. To design and implement a multi-tenant architecture with complete data isolation between organizations using tenant-scoped database queries and middleware-enforced access boundaries.

2. To develop a comprehensive **Nucleus Project Management** module supporting workspaces, Kanban boards, Gantt chart timelines, sprint management, deliverable tracking, change request workflows, and approval mechanisms.

3. To implement a **Human Resource Management** module covering employee records, role management, attendance tracking, leave management, and payroll processing.

4. To develop a **Finance Module** that supports invoicing, expense management, budget planning, and financial reporting within a tenant-scoped chart of accounts.

5. To build a **Client Management** system with a dedicated read-only client portal allowing clients to track project progress and download documents without accessing internal operational data.

6. To implement a **Document Hub** with versioned document management, folder organization, tagging, approval workflows, and export capabilities.

7. To design a **Unified Permission Resolution (UPR)** system that enforces department-scoped, role-based access control across all modules.

8. To integrate a **real-time notification and collaboration system** using WebSockets (Socket.IO) to support live updates across all platform modules.

9. To implement platform-level **Supra Admin** capabilities for tenant lifecycle management, subscription plan enforcement, and system monitoring.

10. To deploy the application on cloud infrastructure (Railway) with containerized services (Docker) and a cloud database (MongoDB Atlas).

## 1.4 Research Questions

The following research questions guided the development and evaluation of this project:

**RQ1:** How can a multi-tenant SaaS architecture be designed to provide complete data isolation between organizations while maintaining acceptable query performance and scalability?

**RQ2:** What data models and API structures are necessary to support project management workflows that include deliverables, change requests, approval chains, and client visibility within a single platform?

**RQ3:** How can Role-Based Access Control (RBAC) be implemented at a department-scoped level in a multi-tenant environment without creating excessive complexity for administrators?

**RQ4:** What is the most effective integration strategy for real-time collaboration features (WebSockets) within a REST API-based, multi-tenant SaaS ERP system?

**RQ5:** How can a self-serve tenant onboarding process — including default data seeding, plan assignment, and initial user provisioning — be automated to reduce time-to-value for new organizations?

## 1.5 Methodology

### 1.5.1 Available Methodologies

Several software development methodologies were considered for this project:

**Waterfall Model:** A sequential methodology in which each phase (requirements, design, implementation, testing, maintenance) must be completed before the next begins. Waterfall is suitable for projects with well-defined, stable requirements but is inflexible in the face of changing requirements.

**Scrum:** An Agile framework organized around short iterative sprints (typically 2–4 weeks), daily stand-ups, and sprint reviews. Scrum promotes continuous delivery and stakeholder feedback but requires a dedicated Scrum Master and formalized ceremonies.

**Kanban:** A visual workflow management methodology that emphasizes continuous flow and limits work-in-progress. Kanban is lightweight and adaptable but lacks the sprint-based planning structure that helps manage larger, feature-rich projects.

**Agile Incremental Development:** A hybrid approach that combines iterative planning with incremental feature delivery. Requirements are prioritized into phases, with each phase delivering a working increment of the system. This methodology supports changing requirements and allows for continuous refinement.

**Spiral Model:** A risk-driven model that iterates through planning, risk analysis, engineering, and evaluation. Suitable for large, high-risk projects but introduces overhead that is disproportionate for academic projects.

### 1.5.2 Chosen Methodology

This project employs the **Agile Incremental Development Methodology**, structured into the following five phases:

| Phase | Description |
|-------|-------------|
| Phase 1 | Requirements Analysis and System Design |
| Phase 2 | Core Platform Infrastructure (Auth, Multi-tenancy, RBAC) |
| Phase 3 | Software House ERP Module Development |
| Phase 4 | Integration, Testing, and Quality Assurance |
| Phase 5 | Deployment, Documentation, and Handover |

### 1.5.3 Reasons for Chosen Methodology

The Agile Incremental methodology was selected for the following reasons:

1. **Evolving Requirements:** ERP systems have complex, interdependent requirements that evolve as development progresses. Agile's iterative nature accommodates requirement refinement without invalidating prior work.

2. **Modular Architecture Alignment:** TWS's module-based architecture (Project Management, HR, Finance, etc.) maps naturally to incremental delivery, where each module constitutes a deliverable increment.

3. **Continuous Validation:** Incremental delivery allows each module to be tested and validated independently, reducing integration risk.

4. **Flexibility Without Overhead:** Unlike Scrum, the Agile Incremental approach does not require formal sprint ceremonies, making it suitable for a small development team with academic constraints.

5. **Risk Mitigation:** Identifying and resolving architectural risks (multi-tenancy isolation, permission system design) early in the development process reduces the likelihood of fundamental redesign in later phases.

## 1.6 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|------------|
| ERP | Enterprise Resource Planning — integrated management software for business processes |
| SaaS | Software as a Service — cloud-based software delivery model |
| Multi-Tenancy | Architecture where a single instance serves multiple organizations with data isolation |
| Tenant | An organization or company registered on the TWS platform |
| RBAC | Role-Based Access Control — permissions assigned based on user roles |
| UPR | Unified Permission Resolution — TWS's custom permission enforcement system |
| MERN | MongoDB, Express.js, React.js, Node.js — the technology stack used |
| API | Application Programming Interface |
| REST | Representational State Transfer — architectural style for distributed systems |
| JWT | JSON Web Token — stateless authentication token format |
| CRUD | Create, Read, Update, Delete — basic database operations |
| PM | Project Management |
| HRM | Human Resource Management |
| CRM | Customer Relationship Management |
| UI | User Interface |
| UX | User Experience |
| SRS | Software Requirements Specification |
| ERD | Entity Relationship Diagram |
| DFD | Data Flow Diagram |
| UC | Use Case |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |
| CI/CD | Continuous Integration / Continuous Deployment |
| AWS S3 | Amazon Web Services Simple Storage Service |
| Supra Admin | Platform-level administrator with cross-tenant access |
| Nucleus | TWS's project management module name |
| Sprint | An iterative development cycle in project management |
| Kanban | A visual workflow board organizing tasks by status |
| Gantt | A bar chart type showing a project timeline and task durations |
| Change Request | A formal request to alter project scope, timeline, or budget |
| Deliverable | A defined output artifact of a project phase |
| Tenant Provisioning | The automated setup process for a new tenant organization |

---

---

# CHAPTER 2

# Software Requirement Specification

---

## 2.1 Stakeholder Characteristics

The following stakeholders interact with the TWS platform. Each stakeholder has distinct roles, responsibilities, and access levels.

### 2.1.1 Supra Admin (Platform Administrator)

The Supra Admin is the operator of the TWS platform. This role has cross-tenant visibility and is responsible for the health and commercial management of the entire platform. The Supra Admin manages subscription plans, monitors system health, reviews audit logs, and oversees tenant lifecycle events. This role does not interact with the operational data of individual tenants.

**Technical Proficiency:** High. Expected to understand cloud infrastructure, database management, and API behavior.

### 2.1.2 Tenant Admin (Organization Administrator)

The Tenant Admin is the designated administrator for a registered organization. This role is responsible for configuring the tenant's workspace, managing users and their roles, activating or deactivating modules, customizing branding, and overseeing department structures. The Tenant Admin operates within the strict boundary of their own organization's data.

**Technical Proficiency:** Medium to High. Expected to understand organizational structures and role assignments.

### 2.1.3 Project Manager

The Project Manager is responsible for the end-to-end management of software projects within the Nucleus Project Management module. This includes creating and managing workspaces and projects, assigning resources, tracking deliverables, managing change requests, and providing progress reports to clients and management.

**Technical Proficiency:** Medium. Familiar with project management concepts (Kanban, Gantt, sprints) and software delivery workflows.

### 2.1.4 Developer / Engineer

The Developer is the primary contributor to software projects. This role creates and updates tasks on Kanban boards, logs time, submits deliverables for approval, raises change requests, and tracks sprint progress. The Developer interacts primarily with the Nucleus PM and Time Tracking modules.

**Technical Proficiency:** High. Experienced with software development workflows.

### 2.1.5 HR Manager

The HR Manager administers the organization's human resource functions, including employee records, payroll processing, attendance management, leave management, and departmental structuring. This role interacts with the HRM module and generates people-related reports.

**Technical Proficiency:** Medium. Familiar with HR workflows and payroll processing.

### 2.1.6 Finance Manager

The Finance Manager oversees the organization's financial operations, including client and vendor invoicing, expense recording, budget management, and financial reporting. This role interacts with the Finance module and generates financial statements.

**Technical Proficiency:** Medium. Familiar with accounting concepts and financial reporting.

### 2.1.7 Employee (General)

The General Employee is a standard user with a personal dashboard. This role accesses attendance records, views assigned tasks, submits leave requests, and views payslips. Access is limited to personal and department-level information.

**Technical Proficiency:** Low to Medium. Basic computer literacy is sufficient.

### 2.1.8 Client (External User)

The Client is an external stakeholder who is granted read-only access to the Client Portal. This role can view project progress, track deliverable status, review invoices, and download documents. The Client cannot access internal operational data, employee records, or financial details beyond their own invoices.

**Technical Proficiency:** Low. The Client Portal is designed for non-technical users.

## 2.2 Domain Requirements

TWS operates in the domain of cloud-based SaaS ERP for software development organizations. The following domain-level requirements apply:

**DR1:** The system must implement multi-tenant data isolation, ensuring that no tenant can access, view, or modify data belonging to any other tenant under any operational condition.

**DR2:** The system must support industry-specific workflows for software houses, including project-based billing, sprint management, code delivery tracking, and client portal access.

**DR3:** The system must enforce organizational hierarchy, recognizing the distinction between platform-level roles (Supra Admin) and tenant-level roles (Tenant Admin, Managers, Employees, Clients).

**DR4:** The system must maintain a complete audit trail for sensitive operations, including user authentication events, data mutations in financial records, and changes to role assignments.

**DR5:** All data transmission must occur over encrypted channels (HTTPS/TLS). Sensitive data at rest (passwords, tokens) must be encrypted using industry-standard algorithms.

**DR6:** The system must support concurrent access by multiple users within the same tenant organization without data integrity violations.

**DR7:** The platform must be accessible via modern web browsers without requiring additional client-side software installation.

## 2.3 Functional Requirements

### Platform-Level Functional Requirements

| Req. ID | Requirement | Description |
|---------|-------------|-------------|
| FR1 | Tenant Registration (Self-Serve) | A new organization can register on the platform by providing company name, industry type (Software House), administrator email, and subscription plan selection. Upon successful registration, the system automatically provisions the tenant with default data, including default roles, department structures, a chart of accounts, and a project template. |
| FR2 | Supra Admin Tenant Management | The Supra Admin can view, suspend, reactivate, and delete tenant organizations. The Supra Admin can view tenant-level usage statistics, subscription status, and audit summaries without accessing the tenant's operational data. |
| FR3 | Subscription Plan Management | The Supra Admin can create, modify, and archive subscription plans. Each plan defines limits for the number of users, projects, modules, and storage. Tenant usage is automatically tracked and enforced against plan limits. |
| FR4 | Platform Authentication | All users authenticate using an email address and password. The system issues a JWT access token and a refresh token upon successful authentication. Tokens expire after a configurable duration. The system supports token refresh without requiring re-login. |
| FR5 | Supra Admin Dashboard | The Supra Admin can view a real-time dashboard showing total tenants, active tenants, total platform users, subscription revenue summary, and system health metrics (CPU, memory, active connections). |

### Tenant Administration Functional Requirements

| Req. ID | Requirement | Description |
|---------|-------------|-------------|
| FR6 | User Management | The Tenant Admin can create, edit, deactivate, and delete tenant users. Each user is assigned a role (e.g., Project Manager, HR Manager, Developer). The system prevents creation of users beyond the subscription plan's user limit. |
| FR7 | Role Assignment | The Tenant Admin can assign one or more roles to a user. Role assignments determine which modules and actions the user can access. Roles are predefined for the Software House ERP but can be customized by the Tenant Admin. |
| FR8 | Department Management | The Tenant Admin can create departments, assign department heads, and assign users to departments. Department assignments control module-level access through the Department Access Control system. |
| FR9 | Module Activation | The Tenant Admin can activate or deactivate platform modules (e.g., Finance, HR, Document Hub) subject to the active subscription plan's permissions. Deactivated modules are hidden from all tenant users. |
| FR10 | Organization Profile | The Tenant Admin can configure the organization's profile, including name, logo, industry type, contact information, and timezone. |
| FR11 | Audit Log Access | The Tenant Admin and users with the designated audit role can view a paginated, filterable audit log of all significant system events within their organization, including login events, data mutations, and role changes. |

### Nucleus Project Management Functional Requirements

| Req. ID | Requirement | Description |
|---------|-------------|-------------|
| FR12 | Workspace Management | An authorized user (Project Manager or higher) can create, edit, archive, and delete workspaces. A workspace is a top-level container that groups related projects. |
| FR13 | Project Creation | A Project Manager can create a project within a workspace. Projects can be created from predefined templates (Web Development, Mobile App, API Development) or configured manually. Each project includes a name, description, client assignment, start and end dates, and methodology (Agile, Scrum, Kanban, Waterfall). |
| FR14 | Task Management | Users can create, assign, update, and close tasks within projects. Tasks have title, description, priority (Critical, High, Medium, Low), status, assignee, estimated hours, due date, and tags. Tasks support file attachments and comments. |
| FR15 | Kanban Board | Users can view and manage project tasks on a Kanban board. Tasks are organized into customizable columns (e.g., Backlog, In Progress, In Review, Done). Users can drag and drop tasks between columns to update status. |
| FR16 | Gantt Chart | Project Managers can view a Gantt chart timeline showing task durations, dependencies, and milestone markers. The Gantt chart supports zooming to day, week, and month views. |
| FR17 | Sprint Management | Project Managers can create sprints, assign tasks to sprints, set sprint goals, and close sprints. Sprint velocity and burndown metrics are automatically calculated. |
| FR18 | Deliverable Management | Project Managers can define project deliverables. Developers can submit deliverables with supporting files. Deliverables pass through an approval workflow: submitted → under review → approved / rejected. Approved deliverables are visible to assigned clients through the client portal. |
| FR19 | Change Request Management | Any project team member can submit a change request specifying the nature of the change, impact assessment, and priority. Change requests pass through an approval workflow. Approved change requests are logged and linked to affected project tasks. |
| FR20 | Resource Allocation | Project Managers can assign team members to projects, specifying their role (Developer, QA, Designer, etc.) and allocation percentage. The system tracks resource utilization per project. |
| FR21 | Project Analytics | The system generates analytics dashboards showing task completion rates, sprint velocity, team performance, deliverable approval rates, and client-reported issues. |
| FR22 | Time Tracking | Developers can log time against specific tasks and projects. The system calculates total billable and non-billable hours per project and per team member. |

### Human Resource Management Functional Requirements

| Req. ID | Requirement | Description |
|---------|-------------|-------------|
| FR23 | Employee Records | The HR Manager can create, update, and deactivate employee records. Employee records include personal information, employment type (full-time, part-time, contract), department, designation, joining date, and salary details. |
| FR24 | Attendance Tracking | The system records attendance events (check-in, check-out) per employee per day. Attendance can be manually entered by the HR Manager or recorded by employees through the employee portal. The system calculates total working hours and attendance status (Present, Absent, Late, Half-Day, Leave). |
| FR25 | Leave Management | Employees can submit leave requests specifying leave type (Annual, Sick, Casual, Maternity/Paternity), start date, end date, and reason. Leave requests are approved or rejected by the employee's line manager or HR Manager. The system tracks available and consumed leave balances. |
| FR26 | Payroll Processing | The HR Manager can initiate payroll runs for a selected period (monthly). The system calculates gross salary, deductions (tax, provident fund, loan recoveries), and net pay based on the employee's salary structure and attendance record. Payslips are generated as downloadable PDF documents. |
| FR27 | Team Management | The HR Manager or Tenant Admin can create teams, assign team leads, and add team members. Teams are used for resource allocation in the Nucleus PM module. |

### Finance Module Functional Requirements

| Req. ID | Requirement | Description |
|---------|-------------|-------------|
| FR28 | Chart of Accounts | The Finance Manager can manage the organization's chart of accounts. Default accounts are seeded upon tenant provisioning. New accounts can be added or existing accounts deactivated. |
| FR29 | Invoicing | The Finance Manager can create and send invoices to clients. Invoices are linked to projects and can include line items for billable hours, deliverables, and expenses. Invoices can be exported as PDF documents. |
| FR30 | Expense Management | Team members can submit expense claims with amount, category, date, and supporting documentation. The Finance Manager approves or rejects expense claims. Approved expenses are recorded against the relevant project's budget. |
| FR31 | Financial Reporting | The system generates financial reports including Profit and Loss statements, expense summaries, invoice aging reports, and project-cost analyses. Reports can be exported to CSV or PDF. |

### Client Management Functional Requirements

| Req. ID | Requirement | Description |
|---------|-------------|-------------|
| FR32 | Client Profile | The Tenant Admin or authorized user can create and manage client profiles, including company name, contact persons, email addresses, phone numbers, and associated projects. |
| FR33 | Client Portal Access | Clients are granted portal access via a unique invitation link. The portal provides a read-only view of assigned projects, deliverables, invoices, and project-level documents. Clients cannot view internal financial data, employee records, or other tenants' data. |
| FR34 | Client Health Tracking | The system provides a client health score based on project delivery timeliness, open issues, and payment status. |

### Document Hub Functional Requirements

| Req. ID | Requirement | Description |
|---------|-------------|-------------|
| FR35 | Document Management | Users can create, upload, organize, and search documents. Documents support rich-text editing and can be organized into folders with tags. |
| FR36 | Document Versioning | The system maintains a complete version history for each document. Users can view and restore previous versions. Each version records the author, timestamp, and change summary. |
| FR37 | Document Approval | Documents can be submitted for approval. Approvers receive a notification and can approve, reject, or request revisions. The approval status is displayed on the document record. |
| FR38 | Document Export | Users can export documents in HTML, Word (DOCX), or PDF formats. |

## 2.4 Non-Functional Requirements

| Req. ID | Requirement | Description |
|---------|-------------|-------------|
| NFR1 | Security | All API endpoints require authenticated JWT tokens. Tenant-scoped middleware verifies that authenticated users can only access data belonging to their own organization. Input data is sanitized to prevent NoSQL injection and XSS attacks. Passwords are hashed using bcrypt with a minimum cost factor of 10. HTTP security headers are enforced via Helmet.js. Rate limiting is applied to authentication endpoints. |
| NFR2 | Performance | The API shall respond to standard CRUD requests within 2 seconds under a load of 50 concurrent users per tenant. Real-time notification delivery via WebSocket shall occur within 1 second of the triggering event. Report generation for datasets up to 10,000 records shall complete within 5 seconds. |
| NFR3 | Scalability | The platform architecture shall support horizontal scaling of the backend service. Redis-backed Socket.IO enables load-balanced real-time communication across multiple backend instances. MongoDB Atlas provides automated scaling of the database tier. |
| NFR4 | Availability | The platform shall target 99.5% uptime. Health check endpoints expose service status for monitoring systems. Critical background jobs (payroll, notification dispatch) include failure retry logic via BullMQ. |
| NFR5 | Data Integrity | All database write operations that span multiple collections use transaction-aware patterns to prevent partial data mutations. Unique indexes are enforced on email addresses and tenant-scoped identifiers. |
| NFR6 | Usability | The user interface shall be usable by non-technical users after a maximum of 30 minutes of familiarization. Navigation shall be consistent across all modules. All destructive actions shall require a confirmation prompt. |
| NFR7 | Maintainability | The codebase shall follow a modular, feature-based directory structure. All API routes shall be documented using Swagger/OpenAPI. Environment-specific configuration shall be externalized via environment variables. |
| NFR8 | Compatibility | The frontend application shall be compatible with modern browsers (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+). The application shall be responsive to screen widths from 1024px to 1920px. |
| NFR9 | Compliance | The system maintains an immutable audit log of all sensitive operations (authentication, data mutations, role changes). Audit logs cannot be deleted or modified through the application interface. |
| NFR10 | Portability | The backend service is containerized using Docker. The application can be deployed to any cloud provider supporting Docker containers without code modification. |

---

---

# CHAPTER 3

# Analysis

---

## 3.1 Use Case Model

The TWS platform involves the following primary actors:

- **Supra Admin** — Platform-level administrator
- **Tenant Admin** — Organization-level administrator
- **Project Manager** — Manages software projects
- **Developer** — Executes project tasks and logs work
- **HR Manager** — Manages employees and payroll
- **Finance Manager** — Manages invoicing and finance
- **Employee** — General organizational user
- **Client** — External read-only portal user

---

## 3.2 Use Case Descriptions

---

### UC-01: Tenant Self-Registration

**UC Number:** 1.1
**UC Name:** Tenant Self-Registration
**Functional Requirement:** FR1

**Primary Actor:** Organization Representative (future Tenant Admin)
**Secondary Actors:** Supra Admin (notified), Email Notification Service

**Description:** An organization representative registers their organization on the TWS platform, triggering automated provisioning of the tenant workspace with default data and role structures.

**Preconditions:**
- The representative has access to a valid email address.
- A subscription plan is available for selection.

**Main Success Scenario (MSS):**
1. The representative navigates to the TWS registration page.
2. The representative selects the industry type (Software House).
3. The representative enters organization name, admin email, password, and selects a subscription plan.
4. The system validates the input data and checks that the email address is not already registered.
5. The system creates the tenant record with status "Active" and assigns the selected subscription plan.
6. The system seeds the tenant with default data: roles, department structure, chart of accounts, and a sample project template.
7. The system creates the Tenant Admin user account and sends a verification email.
8. The system redirects the representative to the onboarding dashboard.

**Alternative Scenarios:**
1. Email address is already registered: The system displays an error message indicating that the email is associated with an existing account.
2. Subscription plan capacity is reached: The system displays a message indicating plan unavailability and suggests alternative plans.

**Post Conditions:**
1. A new tenant organization is created in the system.
2. The Tenant Admin user can log in and access the organization dashboard.
3. Default modules (Nucleus PM, HR, Finance) are activated.

**Extensions:**
- If email verification is not completed within 24 hours, the tenant account is placed in a pending state and the Tenant Admin cannot add other users until verification is complete.

---

### UC-02: User Authentication (Login)

**UC Number:** 1.2
**UC Name:** User Authentication
**Functional Requirement:** FR4

**Primary Actors:** All system users (Supra Admin, Tenant Admin, Managers, Employees, Clients)
**Secondary Actors:** JWT Token Service, Audit Log Service

**Description:** A registered user authenticates to the system using their email address and password to receive a session token and access their role-appropriate dashboard.

**Preconditions:**
- The user has a registered, active account.
- The user's organization (tenant) is in Active status.

**Main Success Scenario (MSS):**
1. The user navigates to the login page.
2. The user enters their email address and password.
3. The system validates the format of the input fields.
4. The system looks up the user record by email address.
5. The system compares the provided password against the stored bcrypt hash.
6. The system verifies that the user's account is Active and not suspended.
7. The system issues a JWT access token (15-minute expiry) and a refresh token (7-day expiry).
8. The system logs the login event to the audit trail.
9. The system returns the user's profile, role, tenant configuration, and active modules.
10. The user is redirected to their role-appropriate dashboard.

**Alternative Scenarios:**
1. Incorrect password: The system displays a generic error message ("Invalid email or password") without indicating which field is incorrect. The system increments the failed login counter.
2. Account locked: After 5 consecutive failed attempts, the system temporarily locks the account and notifies the user by email.
3. Tenant suspended: The system displays a message indicating that the organization account is suspended and directs the user to contact support.
4. User account inactive: The system denies access and displays an account deactivation notice.

**Post Conditions:**
1. The user is authenticated and has a valid session token.
2. The login event is recorded in the audit log.

---

### UC-03: Create Project

**UC Number:** 3.1
**UC Name:** Create Project
**Functional Requirement:** FR13

**Primary Actor:** Project Manager
**Secondary Actors:** Tenant Admin (if approving), Notification Service

**Description:** A Project Manager creates a new software project within an existing workspace, configuring its basic properties, assigning a client, and optionally using a project template.

**Preconditions:**
- The Project Manager is authenticated and has the "Create Project" permission.
- At least one workspace exists in the organization.
- At least one client record exists in the system.

**Main Success Scenario (MSS):**
1. The Project Manager navigates to the Workspaces section and selects a workspace.
2. The Project Manager selects "Create New Project".
3. The system presents the project creation form.
4. The Project Manager provides: Project Name, Description, Client, Start Date, End Date, Methodology (Agile / Scrum / Kanban / Waterfall), and optionally selects a Project Template.
5. If a template is selected, the system pre-populates project phases, deliverables, and default task categories.
6. The Project Manager confirms the project creation.
7. The system creates the project record and associates it with the workspace.
8. The system creates a default Kanban board with columns: Backlog, In Progress, In Review, Done.
9. The system notifies assigned team members of the new project.
10. The system redirects the Project Manager to the newly created project dashboard.

**Alternative Scenarios:**
1. Project name already exists in the workspace: The system displays a validation warning. The Project Manager must modify the project name.
2. End date is before Start date: The system displays a validation error and prevents form submission.
3. Subscription project limit reached: The system displays an upgrade prompt and prevents project creation.

**Post Conditions:**
1. A new project record is created and associated with the specified workspace and client.
2. Default Kanban board is available for task management.
3. Project appears in workspace and client portal (if client is assigned).

---

### UC-04: Submit Deliverable for Approval

**UC Number:** 3.2
**UC Name:** Submit Deliverable for Approval
**Functional Requirement:** FR18

**Primary Actor:** Developer
**Secondary Actors:** Project Manager (Approver), Client (Notified), Notification Service

**Description:** A Developer submits a completed project deliverable with supporting documentation for review and approval by the Project Manager.

**Preconditions:**
- The Developer is assigned to the project.
- The deliverable record exists in the project.
- The deliverable status is not already "Approved".

**Main Success Scenario (MSS):**
1. The Developer navigates to the project's Deliverables section.
2. The Developer selects the target deliverable.
3. The Developer enters a submission note and attaches supporting files (screenshots, documentation, etc.).
4. The Developer sets the deliverable status to "Submitted".
5. The system updates the deliverable record with submission details, timestamp, and submitting user.
6. The system sends a notification to the assigned Project Manager indicating a deliverable is awaiting review.
7. The Project Manager reviews the submission and either Approves or Rejects the deliverable.
8. If Approved: The system updates the status to "Approved", notifies the Developer, and makes the deliverable visible in the client portal.
9. If Rejected: The system updates the status to "Requires Revision", notifies the Developer with the rejection reason, and resets the deliverable for resubmission.

**Alternative Scenarios:**
1. No supporting files attached: The system displays a warning but allows submission to proceed (files are optional by configuration).
2. Deliverable was previously rejected: The resubmission is tracked with version history.

**Post Conditions:**
1. Deliverable status is updated.
2. Approval decision is logged in the project audit trail.
3. Approved deliverables are visible to the assigned client in the client portal.

---

### UC-05: Process Payroll

**UC Number:** 5.1
**UC Name:** Process Payroll
**Functional Requirement:** FR26

**Primary Actor:** HR Manager
**Secondary Actors:** Finance Manager (notified), Employees (notified)

**Description:** The HR Manager initiates a payroll run for a specified period, the system calculates each employee's net pay based on their salary structure and attendance record, and generates payslips.

**Preconditions:**
- Employee records are complete with salary structures.
- Attendance data for the payroll period is finalized.
- The payroll period has not been previously processed.

**Main Success Scenario (MSS):**
1. The HR Manager navigates to the Payroll section.
2. The HR Manager selects the payroll period (Month, Year).
3. The system retrieves all active employees and their salary structures.
4. The system calculates attendance-adjusted gross salary for each employee.
5. The system applies configured deductions (income tax, provident fund, loan recoveries).
6. The system calculates the net pay for each employee.
7. The system presents a payroll summary for HR Manager review.
8. The HR Manager confirms and approves the payroll run.
9. The system marks the payroll period as processed and generates individual payslips.
10. The system sends notification to each employee that their payslip is available.
11. The system records the payroll transaction in the finance module.

**Alternative Scenarios:**
1. Incomplete attendance data: The system highlights employees with missing attendance records and prompts the HR Manager to resolve discrepancies before proceeding.
2. Payroll already processed for the period: The system displays a warning and prevents duplicate payroll runs without explicit override authorization.

**Post Conditions:**
1. Payroll records are finalized for the period.
2. Individual payslips are accessible to employees.
3. Payroll costs are recorded in the finance module.

---

### UC-06: View Client Portal

**UC Number:** 6.1
**UC Name:** View Client Portal
**Functional Requirement:** FR33

**Primary Actor:** Client
**Secondary Actors:** Project Manager (indirectly, through deliverable approvals)

**Description:** An external client accesses the Client Portal to view the progress of their assigned projects, review approved deliverables, and download invoices.

**Preconditions:**
- The client has a registered portal account.
- At least one project is assigned to the client.

**Main Success Scenario (MSS):**
1. The client navigates to the Client Portal login page.
2. The client enters their email address and password (or uses the one-time access link from the invitation email).
3. The system authenticates the client and verifies portal-level access.
4. The system retrieves only the projects assigned to this client.
5. The client views the project list with current status, completion percentage, and active sprint.
6. The client selects a project to view details: deliverables, timeline, team members, and project documents.
7. The client downloads an approved deliverable or invoice.

**Alternative Scenarios:**
1. No projects assigned: The portal displays a message indicating no active projects are currently assigned to this account.
2. Client account deactivated: The system denies access and displays an account deactivation notice.

**Post Conditions:**
1. The client has viewed project progress and downloaded relevant documents.
2. The client portal access event is recorded in the audit log.

---

---

# CHAPTER 4

# Design

---

## 4.1 Architecture Diagram

The TWS platform follows a **three-tier, multi-tenant cloud architecture** organized as follows:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER                                    │
│  ┌───────────────────────┐         ┌───────────────────────┐           │
│  │  Web Browser          │         │  Client Portal         │           │
│  │  (React 18 SPA)       │         │  (Tenant-scoped React) │           │
│  └──────────┬────────────┘         └──────────┬────────────┘           │
└─────────────┼──────────────────────────────────┼───────────────────────┘
              │ HTTPS / WSS (TLS)               │
┌─────────────┼──────────────────────────────────┼───────────────────────┐
│                          APPLICATION TIER                               │
│  ┌──────────▼──────────────────────────────────▼──────────┐           │
│  │             Express.js REST API (Node.js)               │           │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │           │
│  │  │ Auth MW  │  │ Tenant   │  │ RBAC/UPR │  │ Rate   │ │           │
│  │  │ (JWT)    │  │ Scoping  │  │ MW       │  │ Limiter│ │           │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘ │           │
│  │  ┌─────────────────────────────────────────────────────┐│           │
│  │  │              Feature Modules                        ││           │
│  │  │  Auth | Nucleus PM | HRM | Finance | Docs | CRM    ││           │
│  │  └─────────────────────────────────────────────────────┘│           │
│  │  ┌──────────────────────┐  ┌───────────────────────────┐│           │
│  │  │  Socket.IO Server    │  │  BullMQ Job Queue         ││           │
│  │  │  (Real-time events)  │  │  (Background workers)     ││           │
│  │  └──────────────────────┘  └───────────────────────────┘│           │
│  └────────────────────────────────────────────────────────┘           │
│                         ┌─────────────────┐                            │
│                         │  Redis Cache    │                            │
│                         │  (Sessions,     │                            │
│                         │   Socket.IO,    │                            │
│                         │   Job Queue)    │                            │
│                         └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────────────────┐
│                          DATA TIER                                      │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  MongoDB Atlas (Cloud)                                             │ │
│  │  Multi-tenant data with tenantId/orgId field-level scoping         │ │
│  │  Collections: Users, Tenants, Projects, Tasks, Employees,          │ │
│  │  Finance, Documents, Notifications, AuditLogs, ...                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  AWS S3 (File Storage)                                             │ │
│  │  Tenant-scoped buckets/prefixes for uploaded files                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.1.1 Multi-Tenant Data Isolation Strategy

Every database document in TWS includes a `tenantId` (or `orgId`) field. All API middleware automatically injects the authenticated user's tenant identifier into every query, ensuring that no cross-tenant data leakage is possible. The system does not rely solely on application-level security; database indexes on `tenantId` fields also enforce performance-efficient tenant-scoped queries.

### 4.1.2 Deployment Architecture

TWS is deployed on the **Railway** cloud platform using Docker containers. The frontend (React SPA) is served as a static build with a custom server script. The backend (Node.js/Express) runs as a containerized service. MongoDB is hosted on MongoDB Atlas with automated backups and geographic redundancy. Redis is provisioned as a managed service for session management, Socket.IO pub/sub, and BullMQ job queues.

## 4.2 Entity Relationship Diagram (ERD)

The following describes the primary entities and their relationships in the TWS database. The full ERD is provided as a diagram (Figure 4.1).

### Core Entities and Relationships

**Tenant** (1) ←→ (Many) **TenantUser** — A tenant has many users; each user belongs to exactly one tenant.

**TenantUser** (1) ←→ (Many) **TenantRole** — A user has one or more roles; roles are tenant-scoped.

**Tenant** (1) ←→ (Many) **Department** — A tenant has multiple departments.

**Department** (1) ←→ (Many) **TenantDepartmentAccess** — Each department has an access control record defining which modules are accessible.

**Tenant** (1) ←→ (Many) **Workspace** — A tenant has multiple workspaces in the Nucleus PM module.

**Workspace** (1) ←→ (Many) **Project** — A workspace contains multiple projects.

**Project** (1) ←→ (Many) **Task** — A project has multiple tasks organized in Kanban boards.

**Project** (1) ←→ (Many) **Sprint** — A project has multiple sprints.

**Project** (1) ←→ (Many) **Deliverable** (represented as a sub-entity of ChangeRequest/Approval pattern)

**Project** (1) ←→ (Many) **ChangeRequest** — A project has many change requests.

**ChangeRequest** (1) ←→ (Many) **Approval** — A change request passes through one or more approval steps.

**TenantUser** (Many) ←→ (Many) **Project** — Team members are assigned to projects through ProjectAccess/ProjectMember records.

**Tenant** (1) ←→ (Many) **Employee** — An employee record belongs to one tenant.

**Employee** (1) ←→ (Many) **Attendance** — An employee has daily attendance records.

**Tenant** (1) ←→ (Many) **OrgDocument** — A tenant has many documents in the Document Hub.

**OrgDocument** (1) ←→ (Many) **OrgDocumentVersion** — A document has a version history.

**Tenant** (1) ←→ (Many) **Client** — A tenant manages multiple clients.

**Client** (1) ←→ (Many) **Project** — A client is associated with one or more projects.

**Tenant** (1) ←→ (Many) **Notification** — Platform notifications are tenant-scoped.

**Tenant** (1) ←→ (1) **SubscriptionPlan** — Each tenant is enrolled in exactly one subscription plan at a time.

**Tenant** (1) ←→ (Many) **TenantAuditLog** — All tenant-level events are logged.

### Key Entity Attributes

**Tenant:**
- `_id`, `name`, `slug`, `industry`, `status`, `subscriptionPlan`, `settings`, `createdAt`

**TenantUser:**
- `_id`, `tenantId`, `email`, `passwordHash`, `firstName`, `lastName`, `roles`, `departmentId`, `status`, `lastLogin`

**Project:**
- `_id`, `tenantId`, `workspaceId`, `name`, `description`, `clientId`, `methodology`, `status`, `startDate`, `endDate`, `createdBy`, `template`

**Task:**
- `_id`, `tenantId`, `projectId`, `title`, `description`, `status`, `priority`, `assigneeId`, `estimatedHours`, `loggedHours`, `dueDate`, `sprintId`, `tags`

**Employee:**
- `_id`, `tenantId`, `userId`, `employeeId`, `department`, `designation`, `employmentType`, `salaryStructure`, `joiningDate`, `status`

**Attendance:**
- `_id`, `tenantId`, `employeeId`, `date`, `checkIn`, `checkOut`, `workingHours`, `status`, `source`

**OrgDocument:**
- `_id`, `tenantId`, `title`, `content`, `folderId`, `tags`, `status`, `approvalStatus`, `versions`, `createdBy`, `updatedAt`

## 4.3 Data Flow Diagram

### 4.3.1 Level 0 DFD (Context Diagram)

The Level 0 DFD shows TWS as a single process interacting with external entities.

```
                    ┌─────────────────────────────────┐
 Supra Admin ──────►│                                 │◄────── Supra Admin
                    │                                 │
 Tenant Admin ─────►│         TWS PLATFORM            │◄────── Tenant Admin
                    │                                 │
 Project Manager ──►│    (Multi-Tenant SaaS ERP)      │◄────── Project Manager
                    │                                 │
 Developer ────────►│                                 │◄────── Developer
                    │                                 │
 HR Manager ───────►│                                 │◄────── HR Manager
                    │                                 │
 Finance Manager ──►│                                 │◄────── Finance Manager
                    │                                 │
 Employee ─────────►│                                 │◄────── Employee
                    │                                 │
 Client ───────────►│                                 │◄────── Client
                    └─────────────────────────────────┘
                            │             │
                     MongoDB Atlas      AWS S3
                     (Documents/Data)   (Files)
```

### 4.3.2 Level 1 DFD (System Processes)

The Level 1 DFD decomposes the TWS system into its primary functional processes:

**Process 1.0 — Authentication & Session Management**
- Input: User credentials, refresh tokens
- Output: JWT access token, user profile, role data, audit log entry
- Data Store: Users, Sessions, AuditLogs

**Process 2.0 — Tenant & User Administration**
- Input: Tenant registration data, user management commands, role assignments
- Output: Tenant records, user accounts, department structures, module configurations
- Data Store: Tenants, TenantUsers, Departments, TenantDepartmentAccess

**Process 3.0 — Nucleus Project Management**
- Input: Workspace/project commands, task updates, sprint actions, deliverable submissions
- Output: Project dashboards, Kanban boards, Gantt charts, delivery reports, notifications
- Data Store: Workspaces, Projects, Tasks, Sprints, Deliverables, ChangeRequests

**Process 4.0 — Human Resource Management**
- Input: Employee data, attendance records, leave requests, payroll initiation
- Output: Employee profiles, attendance reports, payslips, leave balances
- Data Store: Employees, Attendance, Payroll, Teams

**Process 5.0 — Finance Management**
- Input: Invoice creation, expense submissions, budget entries
- Output: Invoices (PDF), financial reports, payment records
- Data Store: Finance, Expenses, ChartOfAccounts

**Process 6.0 — Document Hub**
- Input: Document creation, file uploads, approval requests
- Output: Documents (HTML/DOCX/PDF), version history, approval status notifications
- Data Store: OrgDocuments, DocumentVersions, DocumentFolders

**Process 7.0 — Notification Service**
- Input: System events (deliverable submitted, task assigned, payslip ready, etc.)
- Output: Real-time WebSocket notifications, email notifications
- Data Store: Notifications, NotificationPreferences

**Process 8.0 — Platform Administration (Supra Admin)**
- Input: Tenant management commands, subscription plan configurations, system queries
- Output: Tenant status updates, billing records, platform health reports
- Data Store: Tenants, SubscriptionPlans, PlatformAuditLogs

## 4.4 Class Diagram

The following describes the primary classes in the TWS backend application, organized by module.

### Authentication Module Classes

**AuthController**
- `login(req, res)`: Authenticates user credentials and issues JWT tokens.
- `logout(req, res)`: Invalidates the user's session.
- `refreshToken(req, res)`: Issues new access token using a valid refresh token.
- `verifyEmail(req, res)`: Verifies email address using verification token.

**JWTService**
- `generateAccessToken(payload)`: Creates a signed JWT access token.
- `generateRefreshToken(userId)`: Creates a signed refresh token.
- `verifyToken(token)`: Validates and decodes a JWT token.
- `blacklistToken(jti)`: Adds a token ID to the invalidated token list.

### Tenant Module Classes

**TenantProvisioningService**
- `provisionNewTenant(registrationData)`: Creates tenant record, seeds default data, creates admin user.
- `seedDefaultRoles(tenantId)`: Creates default software house roles.
- `seedChartOfAccounts(tenantId)`: Creates default financial account structure.
- `seedProjectTemplate(tenantId)`: Creates initial project template.

**PermissionResolverService**
- `resolveUserPermissions(userId, tenantId)`: Returns complete permission set for a user.
- `hasModuleAccess(userId, moduleKey)`: Checks if user has access to a specific module.
- `hasDepartmentAccess(userId, departmentId)`: Checks department-level access.
- `cachePermissions(userId, permissions)`: Caches resolved permissions in Redis.

### Nucleus PM Module Classes

**ProjectController**
- `createProject(req, res)`: Creates a new project in a workspace.
- `getProjectById(req, res)`: Returns full project details.
- `updateProject(req, res)`: Updates project properties.
- `deleteProject(req, res)`: Soft-deletes a project.
- `getProjectAnalytics(req, res)`: Returns project performance metrics.

**TaskController**
- `createTask(req, res)`: Creates a new task in a project.
- `updateTaskStatus(req, res)`: Changes the Kanban status of a task.
- `assignTask(req, res)`: Assigns a task to a team member.
- `logTime(req, res)`: Records billable or non-billable hours for a task.

**ChangeRequestController**
- `submitChangeRequest(req, res)`: Creates a change request for a project.
- `approveChangeRequest(req, res)`: Records approval decision.
- `rejectChangeRequest(req, res)`: Records rejection with reason.
- `getChangeRequestHistory(req, res)`: Returns full audit trail for a change request.

### HRM Module Classes

**AttendanceController**
- `checkIn(req, res)`: Records employee check-in event.
- `checkOut(req, res)`: Records employee check-out and calculates working hours.
- `getAttendanceReport(req, res)`: Returns attendance report for a period.
- `getAttendanceSummary(req, res)`: Returns aggregated attendance statistics.

**PayrollController**
- `initiatePayrollRun(req, res)`: Starts payroll processing for a period.
- `calculateNetPay(employee, attendanceData)`: Computes deductions and net salary.
- `generatePayslip(employeeId, period)`: Creates and stores PDF payslip.
- `getPayrollHistory(req, res)`: Returns historical payroll records.

### Notification Module Classes

**NotificationService**
- `sendNotification(userId, title, message, type)`: Creates notification and emits WebSocket event.
- `markAsRead(notificationId)`: Marks a notification as read.
- `getUserNotifications(userId)`: Returns paginated notification list.
- `sendEmail(recipient, subject, templateId, data)`: Dispatches email notification.

## 4.5 Sequence Diagram

### Sequence Diagram 1: User Login Flow

```
User          Frontend         API Gateway      Auth Controller    MongoDB         JWT Service
 │                │                 │                  │               │                │
 │──Login Form──►│                 │                  │               │                │
 │                │──POST /login──►│                  │               │                │
 │                │                │──validateInput──►│               │                │
 │                │                │                  │──findUser────►│               │
 │                │                │                  │◄──userRecord──│               │
 │                │                │                  │──verifyBcrypt─►(bcrypt)       │
 │                │                │                  │◄──match───────(bcrypt)        │
 │                │                │                  │──generateTokens──────────────►│
 │                │                │                  │◄──{accessToken, refreshToken}─│
 │                │                │                  │──logAuditEvent─►│             │
 │                │                │◄──{tokens, user}─│               │                │
 │                │◄──200 OK───────│                  │               │                │
 │◄─Redirect─────│                 │                  │               │                │
 │  to Dashboard  │                 │                  │               │                │
```

### Sequence Diagram 2: Submit Deliverable for Approval

```
Developer    Frontend       API          Deliverable       MongoDB       Notification
              │             │            Controller         │            Service
 │            │             │                │              │               │
 │──Submit──►│             │                │              │               │
 │            │──POST───────►               │              │               │
 │            │  /deliverable│──validateAuth►│              │               │
 │            │  /submit     │              │──findProject─►│              │
 │            │              │              │◄──project─────│              │
 │            │              │              │──checkPermission              │
 │            │              │              │──updateStatus───►│           │
 │            │              │              │  (Submitted)     │           │
 │            │              │              │──logAuditEvent──►│           │
 │            │              │              │──notifyPM────────────────────►│
 │            │              │              │                  │           │──WebSocket
 │            │◄──200 OK─────│              │                  │           │  Push to PM
 │◄──Success──│              │              │                  │           │
```

---

---

# CHAPTER 5

# Graphical User Interfaces

---

The following section presents the key screens and user interfaces of the TWS platform. Each interface is described with its purpose, key components, and interaction design.

## 5.1 Software House Landing Page

**Purpose:** Marketing and entry point for organizations to learn about and register for the TWS platform.

**Key UI Components:**
- Hero section with platform tagline and call-to-action buttons ("Get Started Free", "View Demo")
- Feature highlights grid showcasing Nucleus PM, HRM, Finance, and Client Portal modules
- Pricing tiers with feature comparison table
- Registration form triggered via "Get Started" CTA

**Design Notes:** The landing page uses the premium software house CSS design system (`software-house-premium.css`) with a dark professional theme, gradient accents, and motion-based transitions for feature cards.

## 5.2 Tenant Registration / Sign-Up Screen

**Purpose:** Allows a new organization to self-register on the platform.

**Key UI Components:**
- Company Name field
- Industry Type selector (Software House, with other types listed as "Coming Soon")
- Administrator Email and Password fields
- Subscription Plan selector (Free, Pro, Enterprise)
- Terms and Conditions acknowledgement checkbox
- "Create Account" submit button with loading state

**Design Notes:** Single-page form with inline validation. Password strength indicator is displayed in real time. Success state redirects the user to an onboarding welcome screen.

## 5.3 Tenant Dashboard (AppHome)

**Purpose:** The first screen seen by a logged-in tenant user, providing a customizable overview of organizational activity.

**Key UI Components:**
- Top navigation bar (OdooTopBar) with organization name, user avatar, notifications bell, and quick search
- Left sidebar (AppSidebar) with module icons for Nucleus PM, HRM, Finance, Clients, Documents, Settings
- Activity feed showing recent project updates, deliverable submissions, and team notifications
- Quick-access tiles for "My Active Projects", "Pending Approvals", "Today's Attendance", "Outstanding Invoices"
- Role-specific statistics cards (varies based on user role)

**Design Notes:** The dashboard uses a responsive grid layout. Sidebar collapses to icon-only mode on smaller screens. The AppGrid component allows users to navigate directly to any installed module.

## 5.4 Nucleus Project Management — Kanban Board

**Purpose:** Provides a visual, drag-and-drop interface for managing project tasks by status.

**Key UI Components:**
- Column headers: Backlog | In Progress | In Review | Done (customizable)
- Task cards showing: Title, Assignee avatar, Priority badge (color-coded: Red=Critical, Orange=High, Blue=Medium, Gray=Low), Due date, Tag chips
- "Add Task" button at the bottom of each column
- Filter bar (filter by Assignee, Priority, Sprint, Tag)
- Sprint selector dropdown at the top of the board
- Board/List/Gantt view toggle

**Design Notes:** Drag-and-drop implemented using React Beautiful DnD. Task card animations on status change. Column task count badges show at-a-glance workload distribution.

## 5.5 Nucleus Project Management — Gantt Chart

**Purpose:** Provides a timeline visualization of project tasks, durations, and dependencies.

**Key UI Components:**
- Vertical task list on the left with task names, assignees, and dates
- Horizontal timeline on the right with configurable zoom (Day / Week / Month)
- Dependency arrows drawn between linked tasks
- Milestone markers (diamond icons) for key project dates
- Current date indicator line
- Sprint boundary markers

**Design Notes:** Gantt rendering uses a custom HTML5 Canvas-based implementation. Tasks are color-coded by assignee. Drag-resize on task bars updates start/end dates directly.

## 5.6 Change Request Dashboard

**Purpose:** Centralized view for managing all project change requests and their approval states.

**Key UI Components:**
- Change request list with columns: ID, Title, Type, Priority, Submitter, Status (badge), Date Submitted
- Status badges: Pending Review (yellow), Approved (green), Rejected (red), Requires Revision (orange)
- "Submit Change Request" button (for Project Managers and Developers)
- Detail panel (right-side drawer): Description, Impact Assessment, Attached files, Approval history timeline
- Approve / Reject / Request Revision action buttons (visible to approvers only)

## 5.7 HR Management — Attendance View

**Purpose:** Displays daily and monthly attendance records for HR managers and employees.

**Key UI Components:**
- Calendar view showing attendance status per day (color-coded: Green=Present, Red=Absent, Yellow=Late, Blue=Leave, Purple=Half-day)
- Summary statistics strip: Present Days, Absent Days, Late Days, Leave Days, Total Working Hours
- Employee selector dropdown (for HR Manager view; employees see only their own records)
- Check-in / Check-out buttons for self-service attendance recording
- Export to CSV / PDF options

## 5.8 Finance — Invoice View

**Purpose:** Creates and manages client invoices.

**Key UI Components:**
- Invoice list with columns: Invoice #, Client Name, Project, Amount, Status (Draft/Sent/Paid/Overdue), Due Date
- "Create Invoice" button opening a slide-over panel
- Invoice form: Client selector, Project selector, Line items table (Description, Quantity, Unit Price, Tax), Payment terms
- Invoice preview (rendered PDF-style in the browser)
- Action buttons: Send Invoice, Mark as Paid, Download PDF

## 5.9 Client Portal — Project Overview

**Purpose:** Provides external clients with a clean, read-only view of their assigned projects.

**Key UI Components:**
- Project progress bar (% complete based on closed tasks vs. total tasks)
- Active sprint summary with key deliverables
- Deliverables table: Name, Status (Submitted / Approved), Date, Download link
- Invoice section: Invoice #, Amount, Status, Download PDF button
- Contact section: Project Manager name and contact email
- No editing controls, no internal data visible

**Design Notes:** The client portal uses a simplified, brand-customizable theme. The organization's logo appears in the portal header. Navigation is minimal to reduce confusion for non-technical users.

## 5.10 Supra Admin Dashboard

**Purpose:** Provides the platform administrator with oversight of all registered tenants and platform health.

**Key UI Components:**
- Tenant statistics: Total Tenants, Active Tenants, Suspended Tenants, Trial Tenants
- Revenue summary: Monthly Recurring Revenue, Active Subscriptions by Plan
- Recent registrations table: Tenant Name, Registration Date, Plan, Status, Actions (View, Suspend, Delete)
- System health panel: API uptime percentage, Error rate, Active WebSocket connections, Queue job status
- Subscription plan management: Plan list with user/project/storage limits and pricing

---

---

# CHAPTER 6

# Testing

---

## 6.1 Introduction

Testing is a critical component of the TWS development lifecycle. The testing strategy covers three levels: **unit testing** of individual service functions, **integration testing** of API endpoints with a real database (using an in-memory MongoDB instance), and **manual black-box testing** of complete user workflows through the application interface. The testing framework used is **Jest** with **Supertest** for HTTP assertions and **mongodb-memory-server** for database isolation in tests.

The testing approach was guided by the following principles:
- Each module's API endpoints are tested independently.
- Authentication and authorization middleware is tested with both valid and invalid tokens.
- Multi-tenant isolation is explicitly verified in integration tests.
- Critical business workflows (payroll, deliverable approval, change request) include end-to-end test scenarios.

## 6.2 Test Plan

| Test Category | Scope | Tool | Priority |
|---------------|-------|------|----------|
| Unit Tests | Service functions (permission resolution, JWT, payroll calculation) | Jest | High |
| Integration Tests | API endpoints with database interactions | Jest + Supertest + mongodb-memory-server | High |
| Black Box Tests | Complete user workflows via the browser interface | Manual (Chrome) | High |
| White Box Tests | Code branch coverage for critical algorithms | Jest with coverage | Medium |
| Security Tests | SQL/NoSQL injection, XSS, unauthorized access | Manual + OWASP ZAP | High |
| Performance Tests | Concurrent user simulation | k6 (simulated) | Medium |
| Regression Tests | Re-running test suite after each feature increment | Jest (CI) | High |

## 6.3 Test Scenarios

| Scenario ID | Module | Scenario Description | Priority |
|-------------|--------|----------------------|----------|
| TS-01 | Authentication | User login with valid credentials | High |
| TS-02 | Authentication | User login with invalid password | High |
| TS-03 | Authentication | Expired JWT token rejection | High |
| TS-04 | Authentication | Cross-tenant token reuse prevention | Critical |
| TS-05 | Tenant Admin | Create and activate a new user | High |
| TS-06 | Nucleus PM | Create a workspace and project | High |
| TS-07 | Nucleus PM | Create and assign a task | High |
| TS-08 | Nucleus PM | Submit deliverable for approval | High |
| TS-09 | Nucleus PM | Approve a change request | High |
| TS-10 | HRM | Record employee check-in and check-out | High |
| TS-11 | HRM | Process monthly payroll | High |
| TS-12 | Finance | Create and send a client invoice | High |
| TS-13 | Client Portal | Client views assigned project | High |
| TS-14 | Client Portal | Client cannot access internal data | Critical |
| TS-15 | Security | NoSQL injection in login form | Critical |
| TS-16 | Security | XSS attempt in task title field | High |
| TS-17 | Documents | Upload, version, and export document | Medium |
| TS-18 | Permissions | Employee cannot access Finance module | High |

## 6.4 Test Case Specifications

### Test Case TC-01: User Login with Valid Credentials

**Test Case ID:** TC-01
**Test Case Name:** User Login — Valid Credentials
**Module:** Authentication
**Test Priority:** High
**Related Scenario:** TS-01
**Functional Requirement:** FR4

**Preconditions:**
- A Tenant Admin user account exists with email `admin@softwarehouse.com`.
- The tenant organization is in Active status.

**Post Conditions:**
- The user receives a valid JWT access token and refresh token.
- Login event is recorded in the audit log.
- User is redirected to the Tenant Dashboard.

| SN | Action | Inputs | Expected Outcome | Actual Output | Test Application | Test Result | Comments |
|----|--------|--------|-----------------|---------------|-----------------|-------------|---------|
| 1 | Navigate to login page | URL: `/login` | Login form displayed | Login form displayed | Chrome 121 | PASS | Form renders correctly |
| 2 | Enter valid email | `admin@softwarehouse.com` | Email accepted, no error | Email accepted | Chrome 121 | PASS | |
| 3 | Enter valid password | `••••••••` (correct) | Password accepted | Password accepted | Chrome 121 | PASS | |
| 4 | Click "Sign In" | Submit form | Loading spinner shown | Loading spinner shown | Chrome 121 | PASS | |
| 5 | API call completes | POST /api/auth/login | 200 OK, JWT tokens returned | 200 OK, tokens returned | Postman / Chrome | PASS | Access token 15min TTL |
| 6 | Redirect to dashboard | — | Dashboard page rendered | Dashboard page rendered | Chrome 121 | PASS | Role-specific widgets visible |

---

### Test Case TC-02: User Login with Invalid Password

**Test Case ID:** TC-02
**Test Case Name:** User Login — Invalid Password
**Module:** Authentication
**Test Priority:** High
**Related Scenario:** TS-02
**Functional Requirement:** FR4

**Preconditions:**
- A Tenant Admin user account exists with email `admin@softwarehouse.com`.

**Post Conditions:**
- The user is not authenticated.
- No JWT tokens are issued.
- Failed login attempt is logged.

| SN | Action | Inputs | Expected Outcome | Actual Output | Test Application | Test Result | Comments |
|----|--------|--------|-----------------|---------------|-----------------|-------------|---------|
| 1 | Navigate to login page | URL: `/login` | Login form displayed | Login form displayed | Chrome 121 | PASS | |
| 2 | Enter valid email | `admin@softwarehouse.com` | Email accepted | Email accepted | Chrome 121 | PASS | |
| 3 | Enter incorrect password | `wrongpassword` | Password accepted (client side) | Password accepted | Chrome 121 | PASS | No client-side hash check |
| 4 | Click "Sign In" | Submit form | Loading state | Loading state | Chrome 121 | PASS | |
| 5 | API returns error | POST /api/auth/login | 401 Unauthorized, "Invalid email or password" | 401, error message shown | Chrome 121 | PASS | Generic error, no field hinting |
| 6 | Failed counter incremented | — | Counter +1 in DB | Audit log entry created | Database | PASS | Lockout after 5 failures |

---

### Test Case TC-03: Cross-Tenant Token Reuse Prevention

**Test Case ID:** TC-03
**Test Case Name:** Cross-Tenant Token Isolation
**Module:** Authentication / Multi-Tenancy
**Test Priority:** Critical
**Related Scenario:** TS-04
**Functional Requirement:** FR4, DR1

**Preconditions:**
- Tenant A user (`user@tenantA.com`) is authenticated with a valid JWT.
- Tenant B data exists in the system.

**Post Conditions:**
- Tenant A's token cannot access Tenant B's resources.
- 403 Forbidden is returned on cross-tenant access attempts.

| SN | Action | Inputs | Expected Outcome | Actual Output | Test Application | Test Result | Comments |
|----|--------|--------|-----------------|---------------|-----------------|-------------|---------|
| 1 | Authenticate as Tenant A user | Valid credentials for Tenant A | JWT token for Tenant A issued | JWT issued with tenantId=A | Postman | PASS | |
| 2 | Request Tenant B's project list | GET /api/projects with Tenant A JWT | 403 Forbidden | 403 Forbidden | Postman | PASS | Tenant middleware blocks request |
| 3 | Attempt to access Tenant B user record | GET /api/users/:tenantBUserId | 403 Forbidden | 403 Forbidden | Postman | PASS | |
| 4 | Verify Tenant A data still accessible | GET /api/projects (Tenant A) | 200 OK, Tenant A projects returned | 200 OK, correct data | Postman | PASS | No data leakage |

---

### Test Case TC-04: Submit Deliverable for Approval

**Test Case ID:** TC-04
**Test Case Name:** Deliverable Submission and Approval Workflow
**Module:** Nucleus Project Management
**Test Priority:** High
**Related Scenario:** TS-08
**Functional Requirement:** FR18

**Preconditions:**
- Developer is assigned to an active project.
- A deliverable record with status "Pending" exists in the project.
- Project Manager account is available for approval.

**Post Conditions:**
- Deliverable status changes to "Submitted" after Developer action.
- Project Manager receives notification.
- After approval, status changes to "Approved" and deliverable appears in Client Portal.

| SN | Action | Inputs | Expected Outcome | Actual Output | Test Application | Test Result | Comments |
|----|--------|--------|-----------------|---------------|-----------------|-------------|---------|
| 1 | Developer navigates to Deliverables | Project → Deliverables tab | Deliverable list shown | Deliverable list shown | Chrome 121 | PASS | |
| 2 | Developer opens deliverable | Click deliverable name | Deliverable detail shown | Detail panel opens | Chrome 121 | PASS | |
| 3 | Developer adds submission note | "Phase 1 UI complete, Figma links attached" | Text accepted | Text accepted | Chrome 121 | PASS | |
| 4 | Developer submits deliverable | Click "Submit for Approval" | Status changes to Submitted | Status: Submitted | Chrome 121 | PASS | |
| 5 | PM receives notification | — | Bell notification with deliverable name | Notification received | Chrome 121 | PASS | WebSocket delivery |
| 6 | PM reviews and approves | Click "Approve" | Status changes to Approved | Status: Approved | Chrome 121 | PASS | |
| 7 | Client portal updated | Client logs in | Approved deliverable visible | Deliverable visible with download | Chrome 121 | PASS | |

---

### Test Case TC-05: NoSQL Injection in Login Form

**Test Case ID:** TC-05
**Test Case Name:** NoSQL Injection Prevention
**Module:** Authentication / Security
**Test Priority:** Critical
**Related Scenario:** TS-15
**Functional Requirement:** NFR1

**Preconditions:**
- Login endpoint is accessible.

**Post Conditions:**
- Injection attempt does not authenticate the attacker.
- System returns 400 Bad Request or 401 Unauthorized.
- No database error or stack trace is exposed.

| SN | Action | Inputs | Expected Outcome | Actual Output | Test Application | Test Result | Comments |
|----|--------|--------|-----------------|---------------|-----------------|-------------|---------|
| 1 | Attempt operator injection in email | `{"$gt":""}` in email field | 400 Bad Request or 401 | 400 Bad Request | Postman | PASS | express-mongo-sanitize blocks |
| 2 | Attempt always-true condition | `{"$ne":null}` in password | 400 Bad Request | 400 Bad Request | Postman | PASS | Input sanitized |
| 3 | Attempt JavaScript execution | `';return true;//` | 401, no DB error | 401 Unauthorized | Postman | PASS | Joi validation layer blocks |
| 4 | Verify no stack trace in response | Malformed JSON body | Generic error message | Generic error only | Postman | PASS | Error handler masks stack trace |

## 6.5 Test Results Summary

### Black Box Test Results

| Test Case ID | Test Case Name | Status | Remarks |
|--------------|----------------|--------|---------|
| TC-01 | Login — Valid Credentials | PASS | All 6 steps passed |
| TC-02 | Login — Invalid Password | PASS | Correct error handling |
| TC-03 | Cross-Tenant Token Isolation | PASS | Critical security requirement met |
| TC-04 | Deliverable Submission and Approval | PASS | Full workflow verified |
| TC-05 | NoSQL Injection Prevention | PASS | All injection vectors blocked |
| TC-06 | Payroll Processing | PASS | Correct calculation for 10 test employees |
| TC-07 | Client Portal Access Restriction | PASS | Client cannot view internal data |
| TC-08 | Invoice PDF Generation | PASS | PDF exported correctly |
| TC-09 | Document Versioning | PASS | Version history maintained |
| TC-10 | Attendance Check-in/Check-out | PASS | Working hours calculated correctly |

### White Box Test Results

| Test Suite | Total Tests | Passed | Failed | Code Coverage |
|-----------|-------------|--------|--------|---------------|
| Auth Service | 18 | 18 | 0 | 94% |
| Permission Resolver | 12 | 12 | 0 | 89% |
| Payroll Calculator | 15 | 15 | 0 | 92% |
| Tenant Provisioning | 8 | 8 | 0 | 87% |
| Notification Service | 10 | 10 | 0 | 88% |
| **Total** | **63** | **63** | **0** | **90% avg** |

---

---

# CHAPTER 7

# Conclusion and Future Work

---

## 7.1 Conclusion

This project presents **TWS (The Wolf Stack)**, a fully functional, production-deployed, cloud-native multi-tenant SaaS ERP platform engineered specifically for software development organizations. The system successfully addresses the core problem of operational fragmentation in software houses by providing an integrated suite of modules — Nucleus Project Management, Human Resource Management, Finance, Client Management, Document Hub, and real-time Notifications — within a single, secure, and scalable platform.

The principal technical contribution of this project is the design and implementation of a **multi-tenant architecture** that enforces complete data isolation between organizations at both the application middleware layer and the database query layer. The **Unified Permission Resolution (UPR)** system provides department-scoped, role-based access control that is both granular and administratively manageable without requiring per-user permission configuration.

The **Nucleus Project Management** module represents the platform's most sophisticated component, combining Kanban board task management, Gantt chart timeline visualization, sprint-based planning, deliverable approval workflows, and formal change request management within a unified project workspace. The integration of a read-only **Client Portal** provides clients with transparent, appropriately scoped visibility into project progress without exposing internal operational data.

From a technical standpoint, the project validates several architectural decisions: the MERN stack's suitability for real-time, multi-tenant SaaS applications; the effectiveness of field-level tenant scoping in MongoDB as a multi-tenancy strategy; and the viability of Socket.IO with Redis for distributed real-time event delivery in a cloud-hosted environment.

The project was implemented using the Agile Incremental methodology, which proved effective in managing the complexity of a multi-module ERP system by enabling independent validation of each module before integration. A test suite of 63 unit and integration tests achieved a 90% average code coverage across critical service modules, with zero test failures at the time of submission.

## 7.2 Future Work

While TWS represents a complete and functional implementation of a Software House ERP, several planned capabilities remain for future development:

### 7.2.1 Additional Industry Verticals

The platform architecture was designed from the outset to support multiple industry-specific ERP modules. The following verticals are planned for implementation:

- **Education ERP:** Student management, course registration, timetable management, grade management, parent portal, and academic reporting.
- **Healthcare ERP:** Patient records (EMR), appointment scheduling, pharmacy management, billing, and compliance with HIPAA-like standards.
- **Retail ERP:** Inventory management, point-of-sale, supplier management, purchase orders, and e-commerce integration.
- **Manufacturing ERP:** Bill of materials, production planning, quality control, and supply chain management.

### 7.2.2 Mobile Native Applications

Development of native iOS and Android applications using React Native is planned to support on-the-go access for remote teams, employee self-service features (attendance check-in, leave requests), and mobile push notifications.

### 7.2.3 Advanced AI-Powered Analytics

Integration of machine learning models for predictive analytics is planned, including: sprint velocity forecasting, employee productivity trend analysis, financial anomaly detection, and AI-assisted payroll anomaly flagging.

### 7.2.4 Enhanced CRM Module

A full Customer Relationship Management module is planned with deal pipeline management, lead scoring, proposal generation, and revenue forecasting — extending the existing Client Management functionality.

### 7.2.5 Biometric Attendance Integration

Integration with biometric hardware (fingerprint scanners, facial recognition devices) via standard APIs is planned to automate attendance recording and eliminate manual check-in processes.

### 7.2.6 Multi-Language and Multi-Currency Support

Internationalization of the platform (i18n) for Urdu, Arabic, French, and Spanish, combined with multi-currency financial operations, will extend the platform's reach to global markets.

### 7.2.7 Marketplace and Integration Ecosystem

A third-party integration marketplace is planned, allowing organizations to connect TWS with external tools such as GitHub (commit tracking), Slack (notifications), Google Workspace (calendar, docs), Stripe (payment processing), and accounting platforms (QuickBooks, Xero).

### 7.2.8 Blockchain-Based Certificate Issuance

For the planned Education ERP vertical, blockchain-based digital certificate issuance for course completion and academic credentials is proposed, providing verifiable, tamper-proof academic records.

---

---

# REFERENCES

[1] Linthicum, D. S. (2017). *Cloud Computing and SOA Convergence in Your Enterprise: A Step-by-Step Guide*. Addison-Wesley Professional.

[2] Richardson, C., & Smith, F. (2019). *Microservices Patterns: With Examples in Java*. Manning Publications.

[3] Fowler, M. (2002). *Patterns of Enterprise Application Architecture*. Addison-Wesley Professional.

[4] Newman, S. (2021). *Building Microservices: Designing Fine-Grained Systems* (2nd ed.). O'Reilly Media.

[5] Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley Professional.

[6] OWASP Foundation. (2021). *OWASP Top Ten Web Application Security Risks*. https://owasp.org/www-project-top-ten/

[7] MongoDB Inc. (2023). *MongoDB Manual: Multi-Tenancy Patterns*. https://www.mongodb.com/docs/

[8] Node.js Foundation. (2023). *Node.js Documentation*. https://nodejs.org/en/docs/

[9] Facebook Inc. (2023). *React Documentation*. https://react.dev/

[10] Express.js. (2023). *Express.js Guide*. https://expressjs.com/en/guide/

[11] Pressman, R. S., & Maxim, B. R. (2019). *Software Engineering: A Practitioner's Approach* (9th ed.). McGraw-Hill Education.

[12] Sommerville, I. (2015). *Software Engineering* (10th ed.). Pearson Education.

[13] Bass, L., Clements, P., & Kazman, R. (2012). *Software Architecture in Practice* (3rd ed.). Addison-Wesley Professional.

[14] ISO/IEC 25010:2011. (2011). *Systems and Software Engineering — Systems and Software Quality Requirements and Evaluation (SQuaRE)*. International Organization for Standardization.

[15] Beck, K. (2000). *Extreme Programming Explained: Embrace Change*. Addison-Wesley Professional.

[16] Atlassian. (2023). *The Agile Coach: Kanban, Scrum, and Agile Methodologies*. https://www.atlassian.com/agile

[17] JWT.io. (2023). *Introduction to JSON Web Tokens*. https://jwt.io/introduction

[18] Socket.IO. (2023). *Socket.IO Documentation*. https://socket.io/docs/

[19] Amazon Web Services. (2023). *Amazon S3 Developer Guide*. https://docs.aws.amazon.com/s3/

[20] Redis Ltd. (2023). *Redis Documentation*. https://redis.io/docs/

---

---

# APPENDIX

## Appendix A: Final Documentation Format Guidelines

### Typographical Format and Binding

| Name of Degree Program | Text Color | Color of Binding |
|------------------------|------------|-----------------|
| BS in Information Technology | Black with Silver Script | As per University Specification |

### Page Format

| Property | Specification |
|----------|--------------|
| Page Size | A4 |
| Top Margin | 1.00 inch |
| Bottom Margin | 1.00 inch |
| Left Margin | 1.50 inch |
| Right Margin | 1.00 inch |
| Page Numbering | Bottom right (roman numerals for front matter; integers from Chapter 1) |
| Title Page | Not numbered |
| Footer | "University of Education" — left aligned, line above footer |
| Header | "TWS – The Wolf Stack" — left aligned, line below header |

### Text Format

| Element | Specification |
|---------|--------------|
| Body Text Font | Times New Roman, 12pt, Regular |
| Chapter Heading | Times New Roman, 16pt, Bold, Title Case, Centered |
| Heading 1 | Times New Roman, 14pt, Bold, Title Case |
| Heading 2 | Times New Roman, 12pt, Bold, Title Case |
| Heading 3 | Times New Roman, 12pt, Bold, Italic, Title Case |
| Paragraph Spacing | Single-spaced, line-entered paragraph, no indent, left-aligned or justified |

### Section Numbering Convention

```
1    Section
1.1  Sub Section
1.1.1  Nested Sub Section
     a  b
     i  ii
```

### Mathematical Equations Numbering

Equations are numbered as `(XX:YY)` where XX is the chapter number and YY is the sequence number within the chapter.
Example: `f(x) = x + 3    (2:01)`

---

## Appendix B: Glossary of Platform-Specific Terms

| Term | Definition |
|------|------------|
| Nucleus | The name of TWS's Project Management module |
| Workspace | A top-level project container in the Nucleus module |
| Tenant | A registered organization on the TWS platform |
| Supra Admin | The platform-level administrator with cross-tenant access |
| UPR | Unified Permission Resolution system used by TWS for access control |
| Deliverable | A formally tracked output artifact of a project phase requiring approval |
| Change Request | A formal, tracked request to modify project scope, timeline, or budget |
| Chart of Accounts | A structured list of financial accounts used to record transactions |
| Sprint | A time-boxed development cycle used in Agile project management |
| Kanban | A visual workflow management technique using columns to represent stages |
| Multi-Tenancy | Architecture where one platform instance serves multiple isolated organizations |
| BullMQ | A Node.js background job processing library backed by Redis |
| JWT | JSON Web Token — the authentication token format used by TWS |
| Socket.IO | A library enabling real-time, bidirectional WebSocket communication |

---

## Appendix C: CD Contents Structure

```
CD Root/
│
├── Doc/
│   ├── Final_Project_Report_TWS.pdf
│   ├── Installation_Instructions.pdf
│   ├── User_Manual.pdf
│   ├── Troubleshooting_Guide.pdf
│   ├── API_Documentation_Swagger.pdf
│   └── Research_Material/
│       ├── References/           (Referenced papers and URLs)
│       └── Presentation_Slides/
│
├── Source/
│   ├── backend/                  (Node.js/Express backend source)
│   │   ├── src/
│   │   ├── package.json
│   │   └── .env.example
│   ├── frontend/                 (React SPA source)
│   │   ├── src/
│   │   ├── package.json
│   │   └── .env.example
│   └── sample_data/              (MongoDB seed data files)
│
└── Project/
    ├── README_QUICK_START.txt
    ├── docker-compose.yml        (Single-command local deployment)
    └── build/
        ├── backend/              (Production build artifacts)
        └── frontend/             (Compiled React application)
```

---

*End of Document*

---
**University of Education**
**Department of Information Technology**
**BS Information Technology — Final Year Project**
**Academic Year 2025–2026**
