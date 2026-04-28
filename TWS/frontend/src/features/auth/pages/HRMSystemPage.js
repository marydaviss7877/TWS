import React from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import {
    UserGroupIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    BriefcaseIcon,
    ClockIcon,
    UserPlusIcon,
    BuildingOfficeIcon,
    LockClosedIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';

import './SoftwareHouseHRM.css';
import { useTheme } from '../../../app/providers/ThemeContext';
import SoftwareHouseNavbar from '../components/SoftwareHouseNavbar';

const HRMSystemPage = () => {
    const { isDarkMode } = useTheme();
    const prefersReducedMotion = useReducedMotion();
    const { scrollYProgress } = useScroll();

    // Premium background transforms
    const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
    const y2 = useTransform(scrollYProgress, [0, 1], [0, 200]);

    const hrmModules = [
        { title: 'Employee Management', path: 'Org → HRM → Employees', icon: UserGroupIcon, desc: 'Complete employee profiles—personal info, department, position, and documents. Your entire team directory in one place.' },
        { title: 'Payroll', path: 'Org → HRM → Payroll', icon: BriefcaseIcon, desc: 'Run payroll, set frequencies, and generate salary slips. Connected directly to your Finance module—no double entry.' },
        { title: 'Attendance Tracking', path: 'Org → HRM → Attendance', icon: ClockIcon, desc: 'Multiple modes: check-in, calendar-based, or software house specific. Track hours, overtime, and remote work.' },
        { title: 'Leave Management', path: 'Org → HRM → Leave', icon: CalendarIcon, desc: 'Employees request leave, managers approve. Balances update automatically. No more tracking in shared Google Sheets.' },
        { title: 'Dept & Team Management', path: 'Org → HRM → Departments', icon: BuildingOfficeIcon, desc: 'Create departments, assign heads, and set budgets. Your org chart stays organized as you scale.' },
        { title: 'Role-Based Access', path: 'Org → HRM → Access Control', icon: LockClosedIcon, desc: 'Enforce security. HR handles attendance, while Payroll sees salary data. Access matches responsibility at the API level.' },
        { title: 'Onboarding & Offboarding', path: 'Org → HRM → Onboarding', icon: UserPlusIcon, desc: 'Profile creation to access revocation. Checklist-based flows for smooth employee lifecycles.' }
    ];

    const builtFeatures = [
        "Employee profiles — full personal, professional, and compensation data",
        "Payroll — pay frequencies, tax settings, deductions, salary slip generation",
        "Payroll connected to Finance module (no double entry)",
        "Attendance — multiple modes, overtime tracking, remote work policies",
        "Leave management — requests, approvals, balance tracking",
        "Department management — hierarchy, heads, budgets",
        "Team management — team leads, members, assignments",
        "HR sub-roles — Manager, Executive, Payroll Officer with enforced separation",
        "Offboarding checklist — task reassignment, access revocation, data retention",
        "Emergency offboarding — immediate access revoke with full audit trail"
    ];

    return (
        <MotionConfig reducedMotion="user">
        <div className={`sh-hrm-page sh-dot-grid min-h-screen${!isDarkMode ? ' day-mode' : ''}`}>
            <div className="sh-noise-overlay" />
            <motion.div style={prefersReducedMotion ? undefined : { y: y1 }} className="sh-glow-orb sh-glow-1" />
            <motion.div style={prefersReducedMotion ? undefined : { y: y2 }} className="sh-glow-orb sh-glow-2" />
            <SoftwareHouseNavbar isDarkMode={isDarkMode} />

            <main className="relative z-10">
                {/* Hero Section */}
                <section className="sh-hrm-hero px-6 flex flex-col items-center justify-center min-h-[90vh]">
                    <div className="container mx-auto max-w-6xl text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <span className="sh-hrm-tag">
                                TWS HR MANAGEMENT
                            </span>
                            <h1 className="sh-hrm-title">
                                Your entire HR operation. <br />
                                <span className="italic underline decoration-purple-500/30">One place. No spreadsheets.</span>
                            </h1>
                            <p className="max-w-3xl mx-auto text-xl text-[#8B8BA8] mb-12 font-dm-sans leading-relaxed">
                                Hiring someone? It's in here. Processing payroll? In here. Tracking attendance? Approving leave? Stop running HR from WhatsApp, Excel, and a folder of scanned documents.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                                <Link to="/software-house-signup" className="sh-hrm-button">
                                    Get Started Free <ArrowRightIcon className="h-4 w-4" />
                                </Link>
                                <button className="text-xs font-black uppercase tracking-[0.3em] text-white hover:text-purple-500 transition-colors">
                                    See How It Works
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-32 px-6 scroll-mt-24">
                    <div className="container mx-auto max-w-7xl">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-12">
                            <div className="max-w-2xl text-left">
                                <h2 className="font-sora text-5xl md:text-6xl font-black mb-6 tracking-tighter text-white">What the HR system includes</h2>
                                <p className="text-[#8B8BA8] text-lg font-dm-sans">Focused features built for the specific needs of software engineering teams.</p>
                            </div>
                        </div>

                        <div className="sh-talent-grid">
                            {hrmModules.map((m, i) => (
                                <motion.div
                                    key={m.title}
                                    className="sh-talent-card"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.6, delay: i * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <span className="sh-talent-path">{m.path}</span>
                                    <div className="w-14 h-14 bg-white/5 flex items-center justify-center mb-8">
                                        <m.icon className="h-7 w-7 text-white" />
                                    </div>
                                    <h3 className="font-sora text-xl font-bold mb-4 text-white text-left">{m.title}</h3>
                                    <p className="text-sm text-[#8B8BA8] font-dm-sans leading-relaxed text-left opacity-80">{m.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* HR Role Matrix */}
                <section className="py-32 px-6 bg-white/[0.01]">
                    <div className="container mx-auto max-w-6xl">
                        <div className="flex flex-col lg:flex-row items-center gap-20">
                            <div className="flex-1 text-left">
                                <h2 className="font-sora text-5xl font-black text-white mb-8 tracking-tighter">How HR roles work in TWS</h2>
                                <p className="text-lg text-[#8B8BA8] font-dm-sans leading-relaxed">Access matches responsibility. No overlap. No accidental salary leaks. Every action is enforced at the system core.</p>
                            </div>
                            <div className="flex-[1.5] w-full">
                                <motion.div
                                    className="sh-matrix-view shadow-2xl shadow-purple-900/10"
                                    initial={{ opacity: 0, x: 50 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.8 }}
                                    viewport={{ once: true }}
                                >
                                    <div className="sh-matrix-header flex items-center gap-4">
                                        <div className="flex gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/40" />
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#52526A]">RBAC_MODULE_v3.1</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="sh-hrm-table">
                                            <thead>
                                                <tr>
                                                    <th>Role</th>
                                                    <th>What they can do</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[
                                                    { role: 'HR Manager', desc: 'Full HR access — employees, payroll, attendance, leave, departments' },
                                                    { role: 'HR Executive', desc: 'Attendance, leave, onboarding — no salary data' },
                                                    { role: 'Payroll Officer', desc: 'Payroll only — no other HR data' },
                                                    { role: 'Dept Head', desc: 'Their department only — team management, attendance' },
                                                    { role: 'Employee', desc: 'Own profile, own leave requests, own attendance' }
                                                ].map((row, i) => (
                                                    <tr key={i}>
                                                        <td className="sh-role-badge">{row.role}</td>
                                                        <td className="text-xs text-[#8B8BA8]">{row.desc}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Built & Working Checklist */}
                <section className="py-32 px-6">
                    <div className="container mx-auto max-w-6xl">
                        <div className="grid lg:grid-cols-3 gap-16">
                            <div className="text-left">
                                <h2 className="font-sora text-4xl md:text-5xl font-black text-white mb-6 leading-[1.1] tracking-tighter">What's built and working today</h2>
                                <p className="text-[#8B8BA8] text-lg">Our core HR engine is live. No pretend features. Every item below is ready for production work.</p>
                            </div>
                            <div className="lg:col-span-2">
                                <div className="sh-built-checklist">
                                    {builtFeatures.map((feat, i) => (
                                        <motion.div
                                            key={i}
                                            className="sh-checklist-item"
                                            initial={{ opacity: 0, x: -20 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            viewport={{ once: true }}
                                        >
                                            <CheckCircleIcon className="h-5 w-5 text-purple-500 shrink-0" />
                                            <span className="text-sm font-medium text-[#F0F0F8]">{feat}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pakistani Compliance Segment */}
                <section className="py-32 px-6">
                    <div className="container mx-auto max-w-6xl">
                        <motion.div
                            className="sh-compliance-box relative overflow-hidden"
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <BuildingOfficeIcon className="w-64 h-64 text-purple-500" />
                            </div>
                            <div className="relative z-10">
                                <h2 className="font-sora text-5xl font-black text-white mb-8 tracking-tighter leading-tight">Built for Pakistani <br />software houses</h2>
                                <p className="text-lg text-[#8B8BA8] font-dm-sans mb-16 max-w-2xl leading-relaxed">
                                    Running payroll in Pakistan means managing regional tax slabs and compliance. TWS is configured for local rules—not generic Western systems where you spend weeks setting up basic deductions.
                                </p>
                                <div className="sh-compliance-grid">
                                    <div className="sh-compliance-card">
                                        <div className="text-purple-500 font-black text-xl mb-4 italic">01</div>
                                        <h4 className="font-black text-white mb-4 uppercase text-xs tracking-widest">Taxes & Slabs</h4>
                                        <p className="text-sm text-[#8B8BA8] leading-relaxed">Automatic calculation of Pakistani individual income tax slabs updated for the latest finance ordinance.</p>
                                    </div>
                                    <div className="sh-compliance-card">
                                        <div className="text-purple-500 font-black text-xl mb-4 italic">02</div>
                                        <h4 className="font-black text-white mb-4 uppercase text-xs tracking-widest">Local Statutory</h4>
                                        <p className="text-sm text-[#8B8BA8] leading-relaxed">Managing EOBI, PESSI/SESSI, and provident fund deductions directly from the payroll engine.</p>
                                    </div>
                                    <div className="sh-compliance-card">
                                        <div className="text-purple-500 font-black text-xl mb-4 italic">03</div>
                                        <h4 className="font-black text-white mb-4 uppercase text-xs tracking-widest">Local Salary Slips</h4>
                                        <p className="text-sm text-[#8B8BA8] leading-relaxed">Finance-compliant salary slips formatted specifically for Pakistani banking and tax requirements.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Roadmap Placeholder */}
                <section className="py-32 px-6 text-center border-t border-white/5 relative bg-white/[0.01]">
                    <div className="container mx-auto max-w-4xl">
                        <span className="inline-block text-[10px] font-black uppercase tracking-[0.4em] text-purple-500 mb-8 border-b border-purple-500/30 pb-2">Future_States</span>
                        <h2 className="font-sora text-4xl font-black text-white mb-12 tracking-tighter">What's coming next</h2>
                        <div className="flex flex-wrap justify-center gap-6">
                            {["Performance reviews", "Recruitment pipeline", "Training tracking", "Benefits management"].map(item => (
                                <span key={item} className="sh-pill-upcoming shadow-lg shadow-black/20">{item}</span>
                            ))}
                        </div>
                        <p className="text-xs text-[#52526A] mt-12 font-dm-sans italic max-w-md mx-auto">These are on the roadmap. They aren't available yet—and we won't pretend they are.</p>
                    </div>
                </section>

                {/* How to Access */}
                <section className="py-40 px-6 text-center">
                    <div className="container mx-auto max-w-4xl">
                        <h2 className="font-sora text-5xl font-black text-white mb-10 tracking-tighter">How to access</h2>
                        <p className="text-xl text-[#8B8BA8] font-dm-sans mb-16 leading-relaxed max-w-2xl mx-auto">
                            Sign up for TWS. Open your tenant. Go to <span className="text-white font-mono bg-white/5 px-2 py-1">Org → HRM</span> in the sidebar.
                            Your dashboard loads with team overview, attendance, and leave management ready to go.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
                            <Link to="/software-house-signup" className="sh-hrm-button">
                                Start Free Trial
                            </Link>
                            <button className="text-xs font-black uppercase tracking-[0.4em] text-white hover:text-purple-500 transition-all">
                                Book a Demo
                            </button>
                        </div>
                        <div className="mt-24">
                            <Link to="/software-house" className="text-purple-500 font-bold hover:underline font-sora text-sm uppercase tracking-widest">
                                ← Back to Software House
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="py-16 px-6 border-t border-white/5 relative z-10 bg-black/50">
                <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-12">
                    <div className="flex items-center gap-4">
                        <span className="font-sora font-black text-2xl text-white tracking-tighter">TWS HRM</span>
                        <span className="text-[10px] text-[#52526A] font-bold uppercase tracking-widest border-l border-white/10 pl-4 py-1">© 2025 The Wolf Stack</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-12">
                        <Link to="/software-house" className="text-[10px] font-bold uppercase tracking-widest text-[#52526A] hover:text-white transition-colors">Platform</Link>
                        <Link to="/software-house/finance" className="text-[10px] font-bold uppercase tracking-widest text-[#52526A] hover:text-white transition-colors">Finance</Link>
                        <Link to="/software-house/projects" className="text-[10px] font-bold uppercase tracking-widest text-[#52526A] hover:text-white transition-colors">Projects</Link>
                        <Link to="/software-house-signup" className="text-[10px] font-bold uppercase tracking-widest text-purple-500 hover:text-white transition-colors">Join Elite</Link>
                    </div>
                </div>
            </footer>
        </div>
        </MotionConfig>
    );
};

export default HRMSystemPage;
