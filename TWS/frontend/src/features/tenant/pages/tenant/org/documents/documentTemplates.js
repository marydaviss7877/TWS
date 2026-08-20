/**
 * Document templates for the Documents app.
 * Each template provides initial HTML content that BlockNote parses into blocks.
 */

export const TEMPLATE_IDS = {
  BLANK: 'blank',
  PROPOSAL: 'proposal',
  CONTRACT: 'contract',
  MEETING_NOTES: 'meeting-notes',
  PROJECT_BRIEF: 'project-brief',
  SOW: 'sow',
  INVOICE_COVER: 'invoice-cover',
};

export const DOCUMENT_TEMPLATES = [
  {
    id: TEMPLATE_IDS.BLANK,
    name: 'Blank',
    description: 'Start from an empty document',
    icon: 'document',
    gradient: 'from-slate-500 to-slate-600',
    html: '',
  },
  {
    id: TEMPLATE_IDS.PROPOSAL,
    name: 'Proposal',
    description: 'Project or service proposal with scope and terms',
    icon: 'lightbulb',
    gradient: 'from-amber-500 to-orange-600',
    html: `
      <h1>Project Proposal</h1>
      <p><strong>Prepared for:</strong> [Client name]</p>
      <p><strong>Date:</strong> [Date]</p>
      <p><strong>Prepared by:</strong> [Your name / Company]</p>
      <h2>Executive summary</h2>
      <p>[Brief overview of the proposal and key outcomes.]</p>
      <h2>Objectives</h2>
      <ul>
        <li>[Objective 1]</li>
        <li>[Objective 2]</li>
        <li>[Objective 3]</li>
      </ul>
      <h2>Scope of work</h2>
      <p>[Describe deliverables and scope in detail.]</p>
      <h2>Timeline</h2>
      <p>[Phases and milestones with dates.]</p>
      <h2>Investment</h2>
      <p>[Pricing, payment terms, and optional packages.]</p>
      <h2>Terms &amp; conditions</h2>
      <p>[Standard terms, acceptance, and validity period.]</p>
      <p><br></p>
      <p>—</p>
      <p>Signature: _________________________ &nbsp; Date: _________________________</p>
    `,
  },
  {
    id: TEMPLATE_IDS.CONTRACT,
    name: 'Contract',
    description: 'Agreement or service contract template',
    icon: 'scale',
    gradient: 'from-emerald-500 to-teal-600',
    html: `
      <h1>Service Agreement</h1>
      <p><strong>Agreement date:</strong> [Date]</p>
      <p><strong>Between:</strong> [Party A] (“Client”)</p>
      <p><strong>And:</strong> [Party B] (“Provider”)</p>
      <h2>1. Services</h2>
      <p>[Description of services to be provided.]</p>
      <h2>2. Term</h2>
      <p>[Start date, end date, renewal terms.]</p>
      <h2>3. Fees and payment</h2>
      <p>[Fee structure, payment schedule, and method.]</p>
      <h2>4. Confidentiality</h2>
      <p>[Confidentiality and non-disclosure obligations.]</p>
      <h2>5. Termination</h2>
      <p>[Conditions and notice period for termination.]</p>
      <h2>6. General</h2>
      <p>[Governing law, amendments, entire agreement.]</p>
      <p><br></p>
      <p><strong>Client:</strong> _________________________ &nbsp; Date: _________________________</p>
      <p><strong>Provider:</strong> _________________________ &nbsp; Date: _________________________</p>
    `,
  },
  {
    id: TEMPLATE_IDS.MEETING_NOTES,
    name: 'Meeting notes',
    description: 'Structured notes for meetings and follow-ups',
    icon: 'users',
    gradient: 'from-accent-500 to-accent-600',
    html: `
      <h1>Meeting notes</h1>
      <p><strong>Meeting:</strong> [Title]</p>
      <p><strong>Date:</strong> [Date]</p>
      <p><strong>Attendees:</strong> [Names]</p>
      <p><strong>Location / Link:</strong> [Location or video link]</p>
      <h2>Agenda</h2>
      <ol>
        <li>[Item 1]</li>
        <li>[Item 2]</li>
        <li>[Item 3]</li>
      </ol>
      <h2>Discussion</h2>
      <p>[Key points discussed.]</p>
      <h2>Decisions</h2>
      <ul>
        <li>[Decision 1]</li>
        <li>[Decision 2]</li>
      </ul>
      <h2>Action items</h2>
      <table>
        <tr><th>Action</th><th>Owner</th><th>Due</th></tr>
        <tr><td>[Action 1]</td><td>[Name]</td><td>[Date]</td></tr>
        <tr><td>[Action 2]</td><td>[Name]</td><td>[Date]</td></tr>
      </table>
      <h2>Next meeting</h2>
      <p>[Date, time, and focus.]</p>
    `,
  },
  {
    id: TEMPLATE_IDS.PROJECT_BRIEF,
    name: 'Project brief',
    description: 'One-pager for project goals and requirements',
    icon: 'briefcase',
    gradient: 'from-blue-500 to-primary-600',
    html: `
      <h1>Project brief</h1>
      <p><strong>Project name:</strong> [Name]</p>
      <p><strong>Version:</strong> 1.0 &nbsp; | &nbsp; <strong>Date:</strong> [Date]</p>
      <h2>Background</h2>
      <p>[Context and why this project exists.]</p>
      <h2>Goals</h2>
      <ul>
        <li>[Goal 1]</li>
        <li>[Goal 2]</li>
      </ul>
      <h2>Target audience</h2>
      <p>[Who will use or benefit from this.]</p>
      <h2>Requirements</h2>
      <ul>
        <li>[Must-have 1]</li>
        <li>[Must-have 2]</li>
        <li>[Nice-to-have]</li>
      </ul>
      <h2>Success criteria</h2>
      <p>[How we will measure success.]</p>
      <h2>Constraints &amp; risks</h2>
      <p>[Budget, timeline, dependencies, risks.]</p>
    `,
  },
  {
    id: TEMPLATE_IDS.SOW,
    name: 'Statement of work',
    description: 'SOW with deliverables and acceptance criteria',
    icon: 'clipboard-document-list',
    gradient: 'from-rose-500 to-pink-600',
    html: `
      <h1>Statement of work (SOW)</h1>
      <p><strong>Project:</strong> [Project name]</p>
      <p><strong>Client:</strong> [Client]</p>
      <p><strong>Effective date:</strong> [Date]</p>
      <h2>1. Purpose</h2>
      <p>[Purpose and scope of this SOW.]</p>
      <h2>2. Deliverables</h2>
      <ul>
        <li><strong>[Deliverable 1]</strong> — [Description and acceptance criteria]</li>
        <li><strong>[Deliverable 2]</strong> — [Description and acceptance criteria]</li>
      </ul>
      <h2>3. Timeline</h2>
      <p>[Milestones and due dates.]</p>
      <h2>4. Assumptions</h2>
      <p>[Key assumptions and dependencies.]</p>
      <h2>5. Acceptance</h2>
      <p>[How deliverables will be reviewed and signed off.]</p>
      <p><br></p>
      <p>Approved by:</p>
      <p>_________________________ &nbsp; _________________________</p>
      <p>[Name, title] &nbsp; [Date]</p>
    `,
  },
  {
    id: TEMPLATE_IDS.INVOICE_COVER,
    name: 'Invoice cover letter',
    description: 'Short cover note to accompany an invoice',
    icon: 'banknotes',
    gradient: 'from-cyan-500 to-blue-600',
    html: `
      <h1>Invoice cover letter</h1>
      <p>[Date]</p>
      <p>[Client name / Company]<br>[Address]</p>
      <p>Re: Invoice #[Invoice number]</p>
      <p>Dear [Contact name],</p>
      <p>Please find attached invoice #[Invoice number] for [brief description of services or period].</p>
      <ul>
        <li><strong>Amount due:</strong> [Amount] [Currency]</li>
        <li><strong>Due date:</strong> [Date]</li>
        <li><strong>Payment method:</strong> [Bank transfer / Check / etc.]</li>
      </ul>
      <p>If you have any questions, please contact [name] at [email].</p>
      <p>Thank you for your business.</p>
      <p>Sincerely,<br>[Your name]<br>[Title]</p>
    `,
  },
];

export const getTemplateById = (id) =>
  DOCUMENT_TEMPLATES.find((t) => t.id === id) || DOCUMENT_TEMPLATES.find((t) => t.id === TEMPLATE_IDS.BLANK);

export const getTemplateHtml = (id) => {
  const t = getTemplateById(id);
  return t ? (t.html || '').trim() : '';
};
