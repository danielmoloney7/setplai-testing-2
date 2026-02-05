import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Program, ProgramStatus } from '../../types';
import { Button } from '../../components/Button';
import { Plus } from 'lucide-react';
import { DonutChart } from '../common/DonutChart';

const CoachAllProgramsView: React.FC<{ user: User; programs: Program[]; users: User[] }> = ({ user, programs, users }) => {
    const navigate = useNavigate();
    const myPrograms = programs.filter(p => p.assignedBy === user.id);

    const templates = myPrograms.filter(p => p.isTemplate);
    const assigned = myPrograms.filter(p => !p.isTemplate);
    
    const pending = assigned.filter(p => p.status === ProgramStatus.PENDING);
    const active = assigned.filter(p => p.status === ProgramStatus.ACCEPTED && !p.completed);
    const completed = assigned.filter(p => p.completed);

    const AssignedProgramCard: React.FC<{ program: Program }> = ({ program }) => {
        const player = users.find(u => u.id === program.assignedTo);
        const completedSessions = program.sessions.filter(s => s.completed).length;
        const totalSessions = program.sessions.length;
        const progress = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

        return (
            <div onClick={() => navigate(`/program/${program.id}`)} className="bg-brand-surface p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-brand-primary/50 relative overflow-hidden shadow-sm">
                <div className="flex items-start gap-3">
                    <DonutChart progress={progress} />
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{program.title}</h3>
                                {player && (
                                    <div className="flex items-center gap-2">
                                        <img src={player.avatar} className="w-5 h-5 rounded-full" alt={player.name} />
                                        <span className="text-xs text-slate-500 font-medium">{player.name}</span>
                                    </div>
                                )}
                            </div>
                            {program.status === ProgramStatus.PENDING && (
                                <span className="text-xs font-bold bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full border border-yellow-200 flex-shrink-0">PENDING</span>
                            )}
                        </div>
                         <p className="text-sm text-slate-500 mt-2">{completedSessions} / {totalSessions} Sessions Completed</p>
                    </div>
                </div>
                 <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                     <div className="bg-brand-primary h-full" style={{width: `${progress}%`}}></div>
                 </div>
            </div>
        );
    };

    return (
        <div className="p-6 pb-24 min-h-screen bg-brand-dark">
            <header className="flex justify-between items-center mb-6">
                 <h1 className="text-2xl font-bold text-white">Programs</h1>
                 <Button size="sm" onClick={() => navigate('/create-program')}><Plus size={16} /> New Program</Button>
            </header>

             <section className="mb-8">
                <h2 className="font-bold text-slate-400 text-sm uppercase mb-4">My Templates</h2>
                {templates.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-slate-700 rounded-xl text-slate-500">
                        <p className="mb-4">No templates yet. Create a program without assigning it.</p>
                        <Button onClick={() => navigate('/create-program')}>Create Template</Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {templates.map(p => (
                            <div key={p.id} className="bg-brand-surface p-5 rounded-xl border border-slate-700">
                                <h3 className="font-bold text-white text-lg mb-1">{p.title}</h3>
                                <p className="text-sm text-slate-400 mb-4">{p.sessions.length} sessions</p>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/program/${p.id}`)}>View/Edit</Button>
                                    <Button size="sm" className="flex-1" onClick={() => navigate('/create-program')}>Assign</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
            
            <h2 className="font-bold text-white text-xl mb-4 pt-4 border-t border-slate-700">Assigned Programs</h2>

            {assigned.length === 0 ? (
                 <div className="text-center py-10 border border-dashed border-slate-700 rounded-xl text-slate-500">
                    <p>No programs assigned yet.</p>
                 </div>
            ) : (
                <>
                    {pending.length > 0 && (
                        <section className="mb-8">
                            <h2 className="font-bold text-slate-400 text-sm uppercase mb-4">Pending</h2>
                            <div className="space-y-4">
                                {pending.map(p => <AssignedProgramCard key={p.id} program={p} />)}
                            </div>
                        </section>
                    )}
                    
                    {active.length > 0 && (
                        <section className="mb-8">
                            <h2 className="font-bold text-slate-400 text-sm uppercase mb-4">Active</h2>
                            <div className="space-y-4">
                                {active.map(p => <AssignedProgramCard key={p.id} program={p} />)}
                            </div>
                        </section>
                    )}


                     {completed.length > 0 && (
                        <section>
                            <h2 className="font-bold text-slate-400 text-sm uppercase mb-4">Completed</h2>
                            <div className="space-y-4 opacity-70">
                                {completed.map(p => <AssignedProgramCard key={p.id} program={p} />)}
                            </div>
                        </section>
                     )}
                </>
            )}
        </div>
    );
};

export default CoachAllProgramsView;