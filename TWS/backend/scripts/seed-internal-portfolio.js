#!/usr/bin/env node
/**
 * Publish a comprehensive internal portfolio library to one explicit tenant.
 *
 * Usage:
 *   node scripts/seed-internal-portfolio.js --tenant=<slug> --dry-run
 *   node scripts/seed-internal-portfolio.js --tenant=<slug>
 *
 * Idempotent: records use deterministic slugs and are updated on repeat runs.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Tenant = require('../src/models/tenant/Tenant');
const TenantUser = require('../src/models/tenant/TenantUser');
const User = require('../src/models/users-auth/User');
const PortfolioItem = require('../src/models/portfolio/PortfolioItem');

const argv = process.argv.slice(2);
const arg = name => argv.find(value => value.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const tenantSlug = arg('tenant');
const dryRun = argv.includes('--dry-run');
const TYPES = ['case_study', 'project', 'showcase', 'testimonial', 'resource'];

const concepts = [
  { domain: 'media-buying', service: 'Media Buying', industry: 'E-commerce', topic: 'Scaling Meta Ads Without Sacrificing MER', result: '+184% revenue', metric: ['Blended MER', '4.7x', 'From 2.9x in 90 days'], tech: ['Meta Ads', 'GA4', 'Triple Whale'] },
  { domain: 'media-buying', service: 'Media Buying', industry: 'SaaS', topic: 'Full-funnel LinkedIn Demand Generation', result: '-38% CAC', metric: ['Customer acquisition cost', '-38%', 'Quarter over quarter'], tech: ['LinkedIn Ads', 'HubSpot', 'Looker Studio'] },
  { domain: 'media-buying', service: 'Paid Search', industry: 'Home Services', topic: 'Restructuring Google Ads Around Profit', result: '+73% qualified leads', metric: ['Qualified leads', '+73%', 'At the same monthly spend'], tech: ['Google Ads', 'CallRail', 'GA4'] },
  { domain: 'media-buying', service: 'Creative Strategy', industry: 'Consumer Goods', topic: 'Building a High-velocity Creative Testing System', result: '3.2x faster learning', metric: ['Creative learning velocity', '3.2x', 'Winning concepts identified weekly'], tech: ['Meta Ads', 'Motion', 'Airtable'] },
  { domain: 'media-buying', service: 'Performance Marketing', industry: 'Education', topic: 'Turning Webinar Traffic Into Enrollments', result: '+61% applications', metric: ['Completed applications', '+61%', 'Across two enrollment cycles'], tech: ['YouTube Ads', 'Google Ads', 'GA4'] },
  { domain: 'media-buying', service: 'Attribution', industry: 'B2B Services', topic: 'Recovering Revenue Attribution Across Channels', result: '92% attribution coverage', metric: ['Attributed pipeline', '92%', 'Up from 54%'], tech: ['GA4', 'GTM', 'Looker Studio'] },
  { domain: 'media-buying', service: 'Paid Social', industry: 'Healthcare', topic: 'Privacy-conscious Patient Acquisition Campaigns', result: '-29% cost per booking', metric: ['Cost per booking', '-29%', 'With compliant conversion tracking'], tech: ['Meta Ads', 'Google Ads', 'Server-side GTM'] },
  { domain: 'ghl', service: 'GoHighLevel Automation', industry: 'Real Estate', topic: 'Automating Lead-to-appointment Follow-up', result: '+46% booked appointments', metric: ['Booked appointments', '+46%', 'Within eight weeks'], tech: ['GoHighLevel', 'Twilio', 'Zapier'] },
  { domain: 'ghl', service: 'CRM Implementation', industry: 'Agency', topic: 'Consolidating the Agency Sales Stack in GHL', result: '11 tools reduced to 4', metric: ['Software footprint', '-64%', 'Without losing core workflows'], tech: ['GoHighLevel', 'Stripe', 'Slack'] },
  { domain: 'ghl', service: 'Workflow Automation', industry: 'Dental', topic: 'Reducing No-shows With Smart Reminders', result: '-41% no-shows', metric: ['Appointment no-show rate', '-41%', 'Across three locations'], tech: ['GoHighLevel', 'Twilio', 'Google Calendar'] },
  { domain: 'ghl', service: 'Funnel Development', industry: 'Coaching', topic: 'Launching an Evergreen Coaching Funnel', result: '6.1x campaign ROAS', metric: ['Campaign ROAS', '6.1x', 'First 60 days'], tech: ['GoHighLevel', 'Stripe', 'Meta Ads'] },
  { domain: 'ghl', service: 'Reputation Management', industry: 'Home Services', topic: 'Systemizing Review Generation and Recovery', result: '+218 new reviews', metric: ['New verified reviews', '218', 'Average rating increased to 4.8'], tech: ['GoHighLevel', 'Google Business Profile', 'Twilio'] },
  { domain: 'ghl', service: 'Pipeline Automation', industry: 'Legal', topic: 'Building a Measurable Intake Pipeline', result: '-67% response time', metric: ['Median first response', '-67%', 'From 34 minutes to 11'], tech: ['GoHighLevel', 'CallRail', 'DocuSign'] },
  { domain: 'ghl', service: 'SaaS Mode', industry: 'Marketing Agency', topic: 'Productizing CRM Delivery With GHL SaaS', result: '+$42k MRR', metric: ['New recurring revenue', '$42k', 'Within six months'], tech: ['GoHighLevel', 'Stripe', 'Make'] },
  { domain: 'development', service: 'Web Application Development', industry: 'Logistics', topic: 'Replacing Spreadsheet Dispatch With a Web Platform', result: '18 hours saved weekly', metric: ['Operations time saved', '18 hrs/week', 'Across dispatch and reporting'], tech: ['React', 'Node.js', 'MongoDB', 'AWS'] },
  { domain: 'development', service: 'Mobile Development', industry: 'Fintech', topic: 'Shipping a Secure Mobile Wallet MVP', result: '32k users in 90 days', metric: ['Verified users', '32k', 'First 90 days after launch'], tech: ['React Native', 'Node.js', 'PostgreSQL', 'AWS'] },
  { domain: 'development', service: 'Platform Modernization', industry: 'Healthcare', topic: 'Modernizing a Legacy Patient Portal', result: '-54% task completion time', metric: ['Patient task completion', '-54%', 'For booking and results access'], tech: ['React', 'Express', 'MongoDB', 'Docker'] },
  { domain: 'development', service: 'API Development', industry: 'E-commerce', topic: 'Building a Resilient Order Integration Layer', result: '99.98% sync reliability', metric: ['Order sync reliability', '99.98%', 'Across six commerce channels'], tech: ['Node.js', 'Kafka', 'PostgreSQL', 'Kubernetes'] },
  { domain: 'development', service: 'SaaS Development', industry: 'HR Technology', topic: 'Taking a Multi-tenant HR SaaS From MVP to Scale', result: '10x tenant capacity', metric: ['Supported tenant capacity', '10x', 'At equal infrastructure cost'], tech: ['React', 'Node.js', 'MongoDB', 'Redis'] },
  { domain: 'development', service: 'DevOps', industry: 'B2B SaaS', topic: 'Creating a Zero-downtime Delivery Pipeline', result: '-76% deployment time', metric: ['Deployment lead time', '-76%', 'With automated rollback'], tech: ['GitHub Actions', 'Docker', 'AWS', 'Terraform'] },
  { domain: 'development', service: 'Product Design & Development', industry: 'Professional Services', topic: 'Launching a Client Collaboration Portal', result: '+35 NPS points', metric: ['Client NPS', '+35 points', 'Six months after rollout'], tech: ['Figma', 'React', 'Node.js', 'PostgreSQL'] }
];

const typeFraming = {
  case_study: {
    prefix: 'Case Study',
    summary: c => `${c.result}: how an outcome-led ${c.service.toLowerCase()} engagement created measurable change for a ${c.industry.toLowerCase()} organization.`
  },
  project: {
    prefix: 'Project',
    summary: c => `An internal delivery record for ${c.topic.toLowerCase()}, including scope, implementation decisions, stack, and the ${c.result} outcome.`
  },
  showcase: {
    prefix: 'Showcase',
    summary: c => `A visual and technical showcase of ${c.topic.toLowerCase()}, highlighting the strongest execution details and ${c.result} impact.`
  },
  testimonial: {
    prefix: 'Client Story',
    summary: c => `The client perspective on a ${c.service.toLowerCase()} partnership that delivered ${c.result} with clear communication and dependable execution.`
  },
  resource: {
    prefix: 'Playbook',
    summary: c => `A reusable internal playbook derived from ${c.topic.toLowerCase()}, with the process, checks, templates, and lessons behind ${c.result}.`
  }
};

function buildItem(type, concept, index, context) {
  const frame = typeFraming[type];
  const title = `${frame.prefix}: ${concept.topic}`;
  const challenge = `${concept.industry} teams often struggle to connect execution with a reliable operating signal. In this engagement, fragmented workflows, inconsistent measurement, and slow feedback loops made it difficult to scale confidently. The mandate was to improve performance without hiding risk behind vanity metrics.`;
  const approach = `We established a baseline, interviewed stakeholders, mapped the customer journey, and prioritized the constraints most likely to affect revenue or delivery quality. Work moved through short test-and-learn cycles with weekly decision reviews. Measurement definitions were agreed before execution so the team could distinguish activity from actual progress.`;
  const solution = `The team implemented a focused ${concept.service.toLowerCase()} system using ${concept.tech.join(', ')}. Automation handled repeatable steps, dashboards exposed decision-ready signals, and documented handoffs made the operating model usable beyond the original delivery team. Quality checks and rollback paths were included from the start.`;
  const outcome = `${concept.result} was achieved while improving visibility and maintainability. The organization retained the dashboards, operating checklist, and ownership model needed to repeat the result. The metric is presented with its measurement window so internal teams can reuse the learning responsibly.`;
  return {
    orgId: context.orgId,
    tenantId: context.tenantId,
    title,
    slug: `portfolio-2026-${type.replace('_', '-')}-${String(index + 1).padStart(2, '0')}-${concept.domain}`,
    summary: frame.summary(concept),
    type,
    status: 'published',
    client: {
      name: `${concept.industry} Partner ${String(index + 1).padStart(2, '0')}`,
      industry: concept.industry,
      confidential: index % 4 === 0
    },
    services: [concept.service, type === 'resource' ? 'Enablement' : 'Strategy'],
    technologies: concept.tech,
    tags: [concept.domain, concept.industry.toLowerCase().replace(/\s+/g, '-'), type.replace('_', '-')],
    challenge,
    approach,
    solution,
    outcome,
    metrics: [{ label: concept.metric[0], value: concept.metric[1], context: concept.metric[2] }],
    testimonial: type === 'testimonial' ? {
      quote: `The team gave us a clear system, not just a one-off deliverable. We could see what was working, understand the trade-offs, and confidently build on the ${concept.result} result.`,
      author: 'Verified client stakeholder',
      role: `Operations Lead, ${concept.industry}`
    } : undefined,
    blocks: [
      { type: 'heading', title: 'What changed', body: '', order: 0 },
      { type: 'text', title: '', body: outcome, order: 1 },
      { type: 'quote', title: 'Internal learning', body: `Define the decision and measurement window before selecting the tool. ${concept.tech[0]} enabled the work; it was not the strategy by itself.`, order: 2 }
    ],
    featured: index < 3,
    sortOrder: TYPES.indexOf(type) * 100 + index,
    projectDate: new Date(Date.UTC(2025 + (index % 2), index % 12, 1)),
    publishedAt: new Date(),
    createdBy: context.userId,
    updatedBy: context.userId,
    deletedAt: null
  };
}

async function resolveContext() {
  if (!tenantSlug) throw new Error('Missing required --tenant=<slug>. No tenant will be selected implicitly.');
  const tenant = await Tenant.findOne({ slug: tenantSlug, status: 'active' }).lean();
  if (!tenant) throw new Error(`Active tenant not found: ${tenantSlug}`);
  const orgId = tenant.organizationId || tenant.orgId;
  if (!orgId) throw new Error(`Tenant ${tenantSlug} has no organization`);
  let tenantUser = await TenantUser.findOne({ tenantId: tenant._id, status: 'active' }).select('userId').lean();
  let userId = tenantUser?.userId;
  if (!userId) {
    const user = await User.findOne({ orgId, status: 'active' }).select('_id').lean();
    userId = user?._id;
  }
  if (!userId) throw new Error(`Tenant ${tenantSlug} has no active user to attribute as publisher`);
  return { tenantId: tenant._id, orgId, userId, tenantName: tenant.name };
}

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) throw new Error('No MongoDB connection URI is configured');
  await mongoose.connect(uri);
  const context = await resolveContext();
  const items = TYPES.flatMap(type => concepts.map((concept, index) => buildItem(type, concept, index, context)));
  const distribution = Object.fromEntries(TYPES.map(type => [type, items.filter(item => item.type === type).length]));
  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, tenant: tenantSlug, tenantName: context.tenantName, total: items.length, distribution }, null, 2));
    return;
  }
  const operations = items.map(item => ({
    updateOne: {
      filter: { orgId: context.orgId, slug: item.slug },
      update: { $set: item },
      upsert: true
    }
  }));
  const result = await PortfolioItem.bulkWrite(operations, { ordered: false });
  const verified = await PortfolioItem.aggregate([
    { $match: { orgId: context.orgId, status: 'published', slug: /^portfolio-2026-/ } },
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);
  console.log(JSON.stringify({
    tenant: tenantSlug,
    tenantName: context.tenantName,
    requested: items.length,
    upserted: result.upsertedCount,
    modified: result.modifiedCount,
    verified: Object.fromEntries(verified.map(row => [row._id, row.count]))
  }, null, 2));
}

run()
  .catch(error => {
    console.error(`Portfolio seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
