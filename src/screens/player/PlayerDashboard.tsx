import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Program, SessionLog, Drill, Notification, ProgramStatus, ProgramSession, ConsultationLog } from '../../types';
import { Button } from '../../components/Button';
import { NotificationBadge } from '../common/NotificationBadge';
import { MOCK_DRILLS, QUICK_START_TEMPLATES } from '../../constants';
import { generateAIProgram } from '../../services/geminiService';
import { Bell, Zap, Target, Clock, Dumbbell, RefreshCw, Play } from 'lucide-react';

const PlayerDashboard: React.FC<{ 
    user: User; 
    programs: Program[]; 
    sessions: SessionLog[];
    drills: Drill[];
    notifications: Notification[]; 
    consultationLogs: ConsultationLog[];
    onRespondProgram: (id: string, accept: boolean) => void; 
    onStartQuickPlan: (template: Partial<Program>) => Program;
    suggestedProgram: Partial<Program> | null;
    setSuggestedProgram: React.Dispatch<React.SetStateAction<Partial<Program> | null>>;
}> = ({ user, programs, sessions, drills, notifications, consultationLogs, onRespondProgram, onStartQuickPlan, suggestedProgram, setSuggestedProgram }) => {
    const navigate = useNavigate();
    const [previewTemplate, setPreviewTemplate] = useState<Partial<Program> | null>(null);
    const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);

    const activePrograms = programs.filter(p => p.assignedTo === user.id && !p.completed && p.status === ProgramStatus.ACCEPTED);
    const pendingPrograms = programs.filter(p => p.assignedTo === user.id && p.status === ProgramStatus.PENDING);
    
    const nextSessions = activePrograms.map(p => {
        const session = p.sessions.find(ses => !ses.completed);
        return session ? { program: p, session: session } : null;
    }).filter(Boolean) as { program: Program; session: ProgramSession }[];

    nextSessions.sort((a, b) => {
        const aIsCoach = a.program.assignedBy !== 'SELF' && a.program.assignedBy !== 'AI_ASSISTANT';
        const bIsCoach = b.program.assignedBy !== 'SELF' && b.program.assignedBy !== 'AI_ASSISTANT';
        if (aIsCoach && !bIsCoach) return -1;
        if (!aIsCoach && bIsCoach) return 1;
        return 0;
    });

    const hasTakenAssessment = consultationLogs.some(log => log.playerId === user.id);

    const fetchSuggestedProgram = async () => {
        if (!user.goals || user.goals.length === 0) return;
        setIsGeneratingSuggestion(true);
        setSuggestedProgram(null);
        const prompt = `Create a new program for me focused on these goals: ${user.goals.join(', ')}.`;
        const userDetailsForAI = { id: user.id, name: user.name, level: user.level, goals: user.goals };
        const program = await generateAIProgram(prompt, drills, userDetailsForAI, sessions, { weeks: 4, frequencyPerWeek: 1 });
        if (program) {
            setSuggestedProgram(program);
        }
        setIsGeneratingSuggestion(false);
    };
    
    useEffect(() => {
        const hasActiveSessions = nextSessions.length > 0;
        if (!hasActiveSessions && !suggestedProgram && !isGeneratingSuggestion) {
            fetchSuggestedProgram();
        }
    }, [nextSessions.length, user.goals, suggestedProgram]);

    const handleConfirmQuickStart = () => {
        if(previewTemplate) {
            const newProgram = onStartQuickPlan(previewTemplate);
            setPreviewTemplate(null);
            if (newProgram && newProgram.sessions?.length > 0) {
                navigate(`/session/${newProgram.id}/${newProgram.sessions[0].id}`);
            }
        }
    };
    
    const handleAcceptSuggestion = () => {
        if (suggestedProgram) {
            onStartQuickPlan(suggestedProgram);
            setSuggestedProgram(null); 
        }
    };

    return (
        <div className="pb-24 bg-brand-dark min-h-screen relative">
             <header className="bg-brand-primary pt-12 pb-8 px-6 rounded-b-[2.5rem] shadow-xl mb-8">
                 <div className="flex justify-between items-center">
                     <div>
                        <h1 className="text-3xl font-bold text-white">Hello, {user.name.split(' ')[0]}</h1>
                        <p className="text-green-100 text-sm font-medium">Let's get better today.</p>
                     </div>
                     <div className="relative" onClick={() => navigate('/notifications')}>
                        <Bell size={24} className="text-white" />
                        <NotificationBadge count={notifications.filter(n => !n.read).length + pendingPrograms.length} />
                     </div>
                </div>
            </header>

            <div className="px-6 space-y-8">
                {pendingPrograms.length > 0 && (
                    <section className="space-y-3">
                        {pendingPrograms.map(p => (
                            <div key={p.id} className="bg-brand-surface border border-brand-primary/50 p-4 rounded-xl">
                                <h3 className="font-bold mb-1">New Program Assigned</h3>
                                <p className="text-sm text-slate-400 mb-3">{p.title}</p>
                                <div className="flex gap-2">
                                    <Button size="sm" fullWidth onClick={() => onRespondProgram(p.id, true)}>Accept</Button>
                                    <Button size="sm" variant="outline" fullWidth onClick={() => onRespondProgram(p.id, false)}>Decline</Button>
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                <section>
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Start</h2>
                    <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2 -mx-6 px-6 sm:grid sm:grid-cols-3 sm:overflow-visible sm:mx-0 sm:px-0 lg:grid-cols-4">
                        {QUICK_START_TEMPLATES.map((t, i) => (
                             <div key={i} onClick={() => setPreviewTemplate(t)} className="flex-shrink-0 w-40 sm:w-auto bg-brand-surface p-4 rounded-xl border border-slate-200 hover:border-brand-primary cursor-pointer transition-all flex flex-col shadow-sm">
                                 <div className="w-8 h-8 rounded-lg bg-brand-primary/20 text-brand-primary flex items-center justify-center mb-3">
                                     <Zap size={18} />
                                 </div>
                                 <h3 className="font-bold text-sm mb-1 text-brand-primary">{t.title}</h3>
                                 <p className="text-[10px] text-slate-400 line-clamp-2">{t.description}</p>
                             </div>
                        ))}
                    </div>
                </section>

                {!hasTakenAssessment && (
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Target className="text-brand-primary" size={24}/> Level Assessment
                        </h2>
                        <div onClick={() => navigate('/consultation')} className="bg-brand-surface border border-slate-200 p-6 rounded-3xl shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                            <h3 className="text-xl font-bold mb-1 text-slate-900">Find Your Baseline</h3>
                            <p className="text-slate-500 mb-6 text-sm">Take a short skills test to personalize your training plans and track your progress.</p>
                            <Button>Start Assessment</Button>
                        </div>
                    </section>
                )}

                <section>
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Zap className="text-brand-primary" size={24} fill="currentColor"/> Up Next
                    </h2>
                    {nextSessions.length > 0 ? (
                        <div className="space-y-4">
                            {nextSessions.map((next, index) => (
                                <div key={index} className="bg-brand-surface border border-slate-200 p-6 rounded-3xl shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => navigate(`/session/${next.program.id}/${next.session.id}`)}>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded inline-block">SESSION {next.program.sessions.indexOf(next.session) + 1}</span>
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${next.program.assignedBy === 'SELF' || next.program.assignedBy === 'AI_ASSISTANT' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                                {next.program.assignedBy === 'SELF' || next.program.assignedBy === 'AI_ASSISTANT' ? 'My Plan' : 'Coach Assigned'}
                                            </span>
                                        </div>
                                        <h3 className="text-2xl font-bold mb-1 text-slate-900">{next.session.title}</h3>
                                        <p className="text-slate-500 mb-6 text-sm line-clamp-1">{next.program.title}</p>
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1 text-sm font-bold text-slate-600"><Clock size={16}/> {next.session.items.reduce((acc, i) => acc + i.targetDurationMin, 0)} min</span>
                                            <span className="flex items-center gap-1 text-sm font-bold text-slate-600"><Dumbbell size={16}/> {next.session.items.length} Drills</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {(!user.goals || user.goals.length === 0) && (
                                <div className="bg-brand-surface p-8 rounded-3xl border border-slate-200 text-center">
                                    <p className="text-slate-500 mb-4">Set your goals to get a personalized AI training plan.</p>
                                    <Button onClick={() => navigate('/profile')}>Set My Goals</Button>
                                </div>
                            )}
                            {user.goals && user.goals.length > 0 && isGeneratingSuggestion && (
                                <div className="bg-brand-surface p-8 rounded-3xl border border-slate-200 text-center animate-pulse">
                                    <p className="text-slate-500 font-medium">Generating a new plan based on your goals...</p>
                                </div>
                            )}
                            {user.goals && user.goals.length > 0 && suggestedProgram && !isGeneratingSuggestion && (
                                <div className="bg-brand-surface border-2 border-dashed border-brand-primary p-6 rounded-3xl shadow-sm relative overflow-hidden">
                                    <span className="text-xs font-bold bg-brand-primary text-white px-2 py-1 rounded mb-3 inline-block">SUGGESTED FOR YOU</span>
                                    <h3 className="text-2xl font-bold mb-1 text-slate-900">{suggestedProgram.title}</h3>
                                    <p className="text-slate-500 mb-6 text-sm">{suggestedProgram.description}</p>
                                    <div className="flex items-center gap-3">
                                        <Button onClick={handleAcceptSuggestion} className="flex-1">Accept Plan</Button>
                                        <Button onClick={fetchSuggestedProgram} variant="outline" className="flex-1">
                                            <RefreshCw size={16} className="mr-2" /> Regenerate
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>

            {previewTemplate && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setPreviewTemplate(null)}>
                    <div className="bg-brand-surface w-full max-w-sm rounded-2xl p-6 border border-slate-700 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-brand-dark mb-1">{previewTemplate.title}</h3>
                        <p className="text-sm text-slate-500 mb-4">{previewTemplate.description}</p>
                        
                        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
                             <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">Session Breakdown</h4>
                             <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                                 {previewTemplate.sessions?.[0].items.map((item, idx) => {
                                     const drillName = MOCK_DRILLS.find(d => d.id === item.drillId)?.name || "Unknown Drill";
                                     return (
                                         <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-200 last:border-0 pb-2 last:pb-0">
                                             <span className="font-medium text-slate-700">{drillName}</span>
                                             <span className="text-slate-400 text-xs">{item.targetDurationMin}m</span>
                                         </div>
                                     )
                                 })}
                             </div>
                             <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center font-bold text-slate-700">
                                 <span>Total Duration</span>
                                 <span>{previewTemplate.sessions?.[0].items.reduce((acc, i) => acc + i.targetDurationMin, 0)} min</span>
                             </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setPreviewTemplate(null)}>Cancel</Button>
                            <Button className="flex-1" onClick={handleConfirmQuickStart}>Begin Session</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayerDashboard;