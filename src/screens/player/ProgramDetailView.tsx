import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Program, SessionLog, ProgramSession } from '../../types';
import { MOCK_DRILLS } from '../../constants';
import { ChevronLeft, Trash2, CheckCircle, Play, ThumbsUp, X } from 'lucide-react';

const ProgramDetailView: React.FC<{ programs: Program[]; sessions: SessionLog[]; onLeaveProgram: (p: Program) => void }> = ({ programs, sessions, onLeaveProgram }) => {
    const navigate = useNavigate();
    const { programId } = useParams<{programId: string}>();
    const program = programs.find(p => p.id === programId);
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

    if (!program) return <div className="p-6 text-white">Program not found</div>;

    const completedSessionsCount = program.sessions.filter(s => s.completed).length;
    const totalSessions = program.sessions.length;
    const progress = totalSessions > 0 ? Math.round((completedSessionsCount / totalSessions) * 100) : 0;

    const handleLeave = () => {
        if (window.confirm("Are you sure you want to remove this program?")) {
            onLeaveProgram(program);
            navigate(-1);
        }
    };

    const handleSessionClick = (session: ProgramSession) => {
        if (session.completed) {
            setExpandedSessionId(prevId => (prevId === session.id ? null : session.id));
        } else {
            navigate(`/session/${program.id}/${session.id}`);
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark p-6 pb-24">
            <header className="flex items-center justify-between mb-6">
                 <button onClick={() => navigate(-1)}><ChevronLeft className="text-slate-400" /></button>
                 <div className="flex gap-2">
                     <button onClick={handleLeave} className="p-2 rounded-full bg-slate-100 text-red-600 hover:bg-red-100"><Trash2 size={18}/></button>
                 </div>
            </header>

            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-slate-900">{program.title}</h1>
                <p className="text-slate-500 mb-6">{program.description}</p>
                
                <div className="bg-brand-surface p-4 rounded-xl border border-slate-200 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase text-slate-400">Progress</span>
                        <span className="text-brand-primary font-bold">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-brand-primary h-full transition-all duration-500" style={{width: `${progress}%`}}></div>
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="font-bold text-lg mb-2 text-slate-900">Sessions</h3>
                    {program.sessions.map((session) => {
                        const sessionLog = sessions.find(s => s.sessionId === session.id);
                        const isExpanded = expandedSessionId === session.id;

                        return (
                            <div key={session.id}>
                                <div 
                                    onClick={() => handleSessionClick(session)}
                                    className={`p-4 border flex justify-between items-center transition-all 
                                        ${session.completed 
                                            ? 'bg-slate-50 border-slate-200 hover:border-brand-primary cursor-pointer' 
                                            : 'bg-brand-surface border-slate-200'
                                        }
                                        ${isExpanded ? 'rounded-t-xl border-b-transparent' : 'rounded-xl'}
                                    `}
                                >
                                    <div>
                                        <h4 className={`font-bold ${session.completed ? 'text-slate-600' : 'text-slate-900'}`}>
                                            {session.title}
                                        </h4>
                                        <p className="text-xs text-slate-400">
                                            {session.items.length} Drills • {session.items.reduce((acc, i) => acc + i.targetDurationMin, 0)} min
                                        </p>
                                    </div>
                                    {session.completed ? (
                                        <CheckCircle className="text-brand-primary flex-shrink-0" size={20}/>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary flex-shrink-0">
                                            <Play size={14} fill="currentColor"/>
                                        </div>
                                    )}
                                </div>
                                {isExpanded && sessionLog && (
                                    <div className="p-4 bg-brand-surface border-x border-b border-slate-200 rounded-b-xl animate-in fade-in">
                                        <h5 className="text-xs font-bold text-slate-400 uppercase mb-3">Drill Results</h5>
                                        <div className="space-y-3">
                                            {session.items.map((item, itemIdx) => {
                                                const drill = MOCK_DRILLS.find(d => d.id === item.drillId);
                                                const performance = sessionLog.drillPerformance.find(p => p.drillId === item.drillId);

                                                return (
                                                    <div key={itemIdx} className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-700">{drill?.name || 'Unknown Drill'}</span>
                                                        {performance ? (
                                                            performance.outcome === 'success' ? (
                                                                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-success">
                                                                    <ThumbsUp size={14} /> Nailed It
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-error">
                                                                    <X size={14} /> Needs Work
                                                                </div>
                                                            )
                                                        ) : (
                                                            <span className="text-xs text-slate-400">Not tracked</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default ProgramDetailView;