import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Program, SessionLog, ProgramStatus } from '../../types';
import { Button } from '../../components/Button';
import { DonutChart } from '../common/DonutChart';
import { CheckCircle, Star, Flame } from 'lucide-react';

const PlayerProgramsView: React.FC<{ user: User; programs: Program[], sessions: SessionLog[] }> = ({ user, programs, sessions }) => {
    const navigate = useNavigate();
    const myPrograms = programs.filter(p => p.assignedTo === user.id);
    const active = myPrograms.filter(p => !p.completed && p.status !== ProgramStatus.ARCHIVED);
    const completed = myPrograms.filter(p => p.completed);

    return (
        <div className="p-6 pb-24 min-h-screen bg-brand-dark">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">My Plans</h1>
            
            <section className="mb-8">
                <h2 className="font-bold text-slate-400 text-sm uppercase mb-4">Active</h2>
                <div className="space-y-4">
                    {active.map(p => {
                        const completedSessions = p.sessions.filter(s => s.completed).length;
                        const totalSessions = p.sessions.length;
                        const progress = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

                        const programSessionLogs = sessions.filter(s => s.programId === p.id);
                        const avgRpe = programSessionLogs.length > 0
                            ? (programSessionLogs.reduce((acc, s) => acc + s.rpe, 0) / programSessionLogs.length).toFixed(1)
                            : 'N/A';
                        const totalCalories = programSessionLogs.reduce((acc, s) => acc + (s.caloriesBurned || 0), 0);
                        
                        return (
                            <div key={p.id} onClick={() => navigate(`/program/${p.id}`)} className="bg-brand-surface p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-brand-primary/50 relative overflow-hidden shadow-sm">
                                {p.status === ProgramStatus.PENDING && <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-600 text-xs font-bold px-2 py-1 rounded-full border border-yellow-200">PENDING</div>}
                                <div className="flex items-start gap-3 mb-3">
                                    <DonutChart progress={progress} />
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-900 text-lg leading-tight">{p.title}</h3>
                                        <p className="text-sm text-slate-500">{completedSessions} / {totalSessions} Sessions Completed</p>
                                    </div>
                                </div>
                                
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                                    <div className="bg-brand-primary h-full" style={{width: `${progress}%`}}></div>
                                </div>

                                <div className="flex items-center justify-between text-sm text-slate-600 font-medium border-t border-slate-200 pt-3">
                                    <span className="flex items-center gap-1.5">
                                        <Star size={16} className="text-yellow-400" fill="currentColor"/> 
                                        {avgRpe} Avg Rating
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Flame size={16} className="text-orange-500"/>
                                        {totalCalories} cal
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {active.length === 0 && (
                        <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-500">
                            <p className="mb-4">No active plans. Ready to start a new one?</p>
                            <Button onClick={() => navigate('/create-program/self')}>Create a Plan</Button>
                        </div>
                    )}
                </div>
            </section>

             <section>
                <h2 className="font-bold text-slate-400 text-sm uppercase mb-4">Completed</h2>
                <div className="space-y-4 opacity-70">
                    {completed.map(p => (
                         <div key={p.id} onClick={() => navigate(`/program/${p.id}`)} className="bg-brand-surface p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                             <span className="font-bold">{p.title}</span>
                             <CheckCircle className="text-brand-primary" size={20} />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default PlayerProgramsView;