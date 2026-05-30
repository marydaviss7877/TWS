import React from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import {
    ArrowRightIcon,
    ViewColumnsIcon,
    PresentationChartLineIcon,
    UsersIcon,
    BugAntIcon,
    DocumentTextIcon,
    UserGroupIcon,
    QueueListIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

import './SoftwareHouseProjects.css';
import SoftwareHouseNavbar from '../../../features/auth/components/SoftwareHouseNavbar';

const ProjectSystemPage = () => {
    const isDayMode = false;
    const prefersReducedMotion = useReducedMotion();
    const { scrollYProgress } = useScroll();

    // Flagship background transforms (Increased intensity)
    const y1 = useTransform(scrollYProgress, [0, 1], [0, -400]);
    const y2 = useTransform(scrollYProgress, [0, 1], [0, 400]);


    const projectFeatures = [
        { title: 'Sprint Management', path: 'Org → Projects → Sprints', icon: QueueListIcon, desc: 'Plan sprints with your team, assign tasks, track progress, and close them on time. Full Agile and Scrum support.' },
        { title: 'Kanban Boards', path: 'Org → [Project] → Board', icon: ViewColumnsIcon, desc: 'Visual task management with drag-and-drop cards per project. Move tasks across columns and keep your workflow clean.' },
        { title: 'Gantt Charts', path: 'Org → Projects → Gantt Chart', icon: PresentationChartLineIcon, desc: 'Timeline view for projects with dependencies, milestones, and deadline tracking. Spot blockers early.' },
        { title: 'Resource Allocation', path: 'Org → Projects → Resources', icon: UsersIcon, desc: 'See who\'s overloaded and who has capacity. Assign team members based on actual availability—not guesswork.' },
        { title: 'Change Requests', path: 'Org → Projects → Change Requests', icon: BugAntIcon, desc: 'Log scope changes, evaluate impact, and route them through approval tiers. Every change is tracked and audited.' },
        { title: 'Deliverables', path: 'Org → Projects → Deliverables', icon: DocumentTextIcon, desc: 'Define project deliverables, track completion, flag at-risk items, and send them through a sequential approval workflow.' },
        { title: 'Client Portal', path: 'Org → Clients → Portal', icon: UserGroupIcon, desc: 'Give clients a clean view of progress, deliverable status, and invoices. They stay informed without access to your internal workspace.' }
    ];

    const builtFeatures = [
        "Project creation with templates (Web Dev, Mobile App, API Development)",
        "Task management — assignments, priorities, statuses, due dates",
        "Sprint planning and sprint board (Agile/Scrum)",
        "Kanban board — per-project, drag-and-drop task columns",
        "Gantt chart with dependency management and auto-progress calculation",
        "Deliverable management with sequential approval workflow",
        "Change request management with approval tiers",
        "Client portal — read-only deliverable status and invoices",
        "Time tracking — billable hours linked directly to projects",
        "Resource allocation — team members per project",
        "Project analytics — progress, at-risk tracking, workspace stats",
        "Project templates — pre-built phases and default structure",
        "Role-based access — PM sees everything, client sees only their view"
    ];

    return (
        <MotionConfig reducedMotion="user">
        <div className={`sh-project-page sh-dot-grid min-h-screen ${isDayMode ? 'day-mode' : ''}`}>
            <div className="sh-noise-overlay" />
            <motion.div style={prefersReducedMotion ? undefined : { y: y1 }} className="sh-glow-orb sh-glow-1" />
            <motion.div style={prefersReducedMotion ? undefined : { y: y2 }} className="sh-glow-orb sh-glow-2" />
            <SoftwareHouseNavbar isDarkMode={!isDayMode} />

            <main className="relative z-10">
                {/* Flagship Hero Section */}
                <section className="sh-project-hero px-6 flex flex-col items-center justify-center min-h-[90vh]">
                    <div className="container mx-auto max-w-6xl text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 60 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <motion.span
                                className="sh-project-tag"
                                initial={{ opacity: 0, letterSpacing: "0.5em" }}
                                animate={{ opacity: 1, letterSpacing: "0.2em" }}
                                transition={{ duration: 1.5, delay: 0.2 }}
                            >
                                TWS PROJECTS
                            </motion.span>
                            <motion.h1
                                className="sh-project-title"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, delay: 0.4 }}
                            >
                                Plan it. Build it. Ship it. <br />
                                <span className="italic underline decoration-cyan-500/30">All in one place.</span>
                            </motion.h1>
                            <motion.p
                                className="max-w-3xl mx-auto text-xl text-[#8B8BA8] mb-12 font-dm-sans leading-relaxed"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1, delay: 0.8 }}
                            >
                                Most software houses run projects across five different tools. Trello for tasks. Google Sheets for timelines. WhatsApp for updates. Email for client reports. TWS Projects replaces all of it with one system built specifically for how software companies work.
                            </motion.p>
                            <motion.div
                                className="flex flex-col sm:flex-row items-center justify-center gap-8"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, delay: 1.1 }}
                            >
                                <Link to="/software-house-signup" className="sh-project-button">
                                    Start Free <ArrowRightIcon className="h-4 w-4" />
                                </Link>
                                <Link to="/software-house-signup" className="text-xs font-black uppercase tracking-[0.3em] text-white hover:text-cyan-500 transition-colors">
                                    Create Free Account
                                </Link>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* Flagship Features Section */}
                <section id="features" className="py-32 px-6 scroll-mt-24">
                    <div className="container mx-auto max-w-7xl">
                        <motion.div
                            className="flex flex-col md:flex-row justify-between items-end mb-24 gap-12"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1 }}
                            viewport={{ once: true, margin: "-100px" }}
                        >
                            <div className="max-w-2xl text-left">
                                <h2 className="font-sora text-5xl md:text-6xl font-black mb-6 tracking-tighter text-white">Everything your team needs to deliver</h2>
                                <p className="text-[#8B8BA8] text-lg font-dm-sans">No more context switching. Every tool is integrated into your project workflow.</p>
                            </div>
                        </motion.div>

                        <div className="sh-delivery-grid">
                            {projectFeatures.map((f, i) => (
                                <motion.div
                                    key={f.title}
                                    className="sh-delivery-card"
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                                    viewport={{ once: true, margin: "-50px" }}
                                >
                                    <span className="sh-delivery-path">{f.path}</span>
                                    <div className="w-14 h-14 bg-white/5 flex items-center justify-center mb-8">
                                        <f.icon className="h-7 w-7 text-white" />
                                    </div>
                                    <h3 className="font-sora text-xl font-bold mb-4 text-white text-left">{f.title}</h3>
                                    <p className="text-sm text-[#8B8BA8] font-dm-sans leading-relaxed text-left opacity-80">{f.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Flagship How It Works */}
                <section className="py-32 px-6 bg-white/[0.01]">
                    <div className="container mx-auto max-w-6xl">
                        <motion.div
                            className="text-center mb-24"
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="font-sora text-5xl font-black text-white mb-6 tracking-tighter">How it works</h2>
                            <p className="text-lg text-[#8B8BA8] font-dm-sans max-w-2xl mx-auto">From onboarding to delivery, TWS Projects guides your workflow.</p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { title: 'Create your project', desc: 'Choose a template (Web Development, Mobile App, API) or start from scratch. Set your timeline, budget, and team.' },
                                { title: 'Break it into deliverables', desc: 'Define milestones. Assign team members. Set dependencies so nothing falls through the cracks.' },
                                { title: 'Run your sprints', desc: 'Pull tasks into sprints. Your team works from the board. You track progress from the dashboard.' },
                                { title: 'Deliver to the client', desc: 'Submit deliverables for approval. Client reviews and signs off through the portal. No more WhatsApp voice notes.' }
                            ].map((s, i) => (
                                <motion.div
                                    key={i}
                                    className="sh-step-card"
                                    initial={{ opacity: 0, x: -30 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.8, delay: i * 0.15 }}
                                    viewport={{ once: true }}
                                >
                                    <span className="sh-step-number">{i + 1}</span>
                                    <h3 className="font-sora text-xl font-bold text-white mb-6 relative z-10">{s.title}</h3>
                                    <p className="text-sm text-[#8B8BA8] font-dm-sans leading-relaxed relative z-10">{s.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Built & Working Checklist (Overhauled with Node Grid & Split View) */}
                <section className="py-32 px-6">
                    <div className="container mx-auto max-w-6xl">
                        <div className="grid lg:grid-cols-3 gap-20">
                            <motion.div
                                className="text-left"
                                initial={{ opacity: 0, x: -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 1 }}
                                viewport={{ once: true }}
                            >
                                <h2 className="font-sora text-5xl md:text-6xl font-black text-white mb-8 leading-[1] tracking-tighter">What's built and working today</h2>
                                <p className="text-[#8B8BA8] text-lg leading-relaxed mb-10">No vaporware. These features are live and ready for your team. Every item below is ready for production work.</p>
                                <div className="h-1 w-20 bg-cyan-600" />
                            </motion.div>

                            <div className="lg:col-span-2">
                                <div className="sh-built-checklist">
                                    {builtFeatures.map((feat, i) => (
                                        <motion.div
                                            key={i}
                                            className="sh-checklist-node"
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: i * 0.04 }}
                                            viewport={{ once: true }}
                                        >
                                            <CheckCircleIcon className="sh-node-icon" />
                                            <span className="sh-node-text">{feat}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Flagship Differentiator Section */}
                <section className="py-32 px-6">
                    <div className="container mx-auto max-w-6xl">
                        <motion.div
                            className="sh-specifics-box relative overflow-hidden"
                            initial={{ opacity: 0, y: 80 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                            viewport={{ once: true }}
                        >
                            <div className="relative z-10">
                                <h2 className="font-sora text-5xl font-black text-white mb-8 tracking-tighter leading-tight">Built for software houses — <br /><span className="text-cyan-500 italic underline decoration-white/20">not generic teams</span></h2>
                                <p className="text-lg text-[#8B8BA8] font-dm-sans mb-12 max-w-2xl leading-relaxed">
                                    Generic project tools are built for marketing teams and event planners. TWS Projects is built for software companies where:
                                </p>
                                <div className="grid md:grid-cols-1 gap-6 mb-16">
                                    {[
                                        "Delivery is milestone-based with client sign-off",
                                        "Budgets are tied to project scope and change requests",
                                        "Clients need visibility without access to your internal team",
                                        "Billing is linked to hours logged and deliverables approved",
                                        "A delayed task affects three other tasks downstream"
                                    ].map((item, i) => (
                                        <motion.div
                                            key={i}
                                            className="sh-specific-item py-4 border-b border-white/5"
                                            initial={{ opacity: 0, x: -20 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                        >
                                            <div className="w-2 h-2 bg-cyan-500 rounded-full shrink-0 shadow-[0_0_10px_rgba(6,182,212,1)]" />
                                            <span className="text-[#F0F0F8] text-xl font-bold tracking-tight">{item}</span>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="pt-12 border-t border-white/10">
                                    <p className="text-white text-2xl font-black italic mb-12">If your current tool doesn't understand that — you're using the wrong tool.</p>
                                    <div className="flex flex-col sm:flex-row gap-10">
                                        <Link to="/software-house-signup" className="sh-project-button">
                                            Start Free Trial
                                        </Link>
                                        <Link to="/software-house-signup" className="text-xs font-black uppercase tracking-[0.4em] text-white hover:text-cyan-500 transition-all">
                                            Create Free Account
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Flagship Access Section */}
                <section className="py-40 px-6 text-center border-t border-white/5">
                    <div className="container mx-auto max-w-3xl">
                        <motion.h2
                            className="font-sora text-6xl font-black text-white mb-10 tracking-tighter"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            How to access
                        </motion.h2>
                        <motion.p
                            className="text-2xl text-[#8B8BA8] font-dm-sans mb-16 leading-relaxed"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            viewport={{ once: true }}
                        >
                            Sign up for TWS. Open your tenant. Go to <span className="text-white font-mono bg-white/5 px-3 py-1.5 rounded border border-white/10">Org → Projects</span> in the sidebar.
                            Your dashboard loads with your active projects, sprint status, and team workload — all on one screen.
                        </motion.p>
                        <Link to="/software-house" className="text-cyan-500 font-bold hover:underline font-sora text-sm uppercase tracking-widest">
                            ← Back to Software House
                        </Link>
                    </div>
                </section>
            </main>

            <footer className="py-20 px-6 border-t border-white/5 relative z-10 bg-black/80">
                <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-16">
                    <div className="flex items-center gap-6">
                        <span className="font-sora font-black text-3xl text-white tracking-tighter">TWS PROJECTS</span>
                        <span className="text-[10px] text-[#52526A] font-bold uppercase tracking-widest border-l border-white/10 pl-6 py-2">© 2025 The Wolf Stack</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-16">
                        <Link to="/software-house" className="text-[11px] font-black uppercase tracking-[0.2em] text-[#52526A] hover:text-white transition-colors">Platform</Link>
                        <Link to="/software-house/finance" className="text-[11px] font-black uppercase tracking-[0.2em] text-[#52526A] hover:text-white transition-colors">Finance</Link>
                        <Link to="/software-house/hrm" className="text-[11px] font-black uppercase tracking-[0.2em] text-[#52526A] hover:text-white transition-colors">HRM</Link>
                        <Link to="/software-house-signup" className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-500 hover:text-white transition-colors">Join Elite</Link>
                    </div>
                </div>
            </footer>
        </div>
        </MotionConfig>
    );
};

export default ProjectSystemPage;
