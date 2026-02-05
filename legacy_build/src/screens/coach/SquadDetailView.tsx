
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Squad, Program, SessionLog, ProgramSession } from '../../types';
import { ChevronLeft, Edit2, Trash2, Plus, PlayCircle, Wand2 } from 'lucide-react';
import { SquadModal } from './components/SquadModal';
import { EditSessionModal } from './components/EditSessionModal';
import { FeedCard } from '../common/FeedCard';
import { Button } from '../../components/Button';

const SquadDetailView: React.FC<{ 
    currentUser: User;
    squads: Squad[]; 
    users: User[]; 
    programs: Program[]; 
    sessions: SessionLog[]; 
    onUpdateSquad: (id: string, name: string, members: string[], level: string) => void;
    onDeleteSquad: (id: string) => void;
    onUpdateSquadSession: (programId: string, oldSessionId: string, newSession: ProgramSession) => void;
}> = ({ currentUser, squads, users, programs, sessions, onUpdateSquad, onDeleteSquad, onUpdateSquadSession }) => {
    const navigate = useNavigate();
    const { squadId } = useParams<{squadId: string}>();
    const [showEdit, setShowEdit] = useState(false);
    const [editingSession, setEditingSession] = useState<{program: Program, session: ProgramSession} | null>(null);
    
    const squad = squads.find(s => s.id === squadId);
    if (!squad) return <div className="p-6 text-white">Squad not found</div>;

    const members = users.filter(u => squad.memberIds.includes(u.id));
    const availablePlayers = users.filter(u => u.coachId === squad.coachId || squad.memberIds.includes(u.id));

    const squadProgram = programs.find(p => p.assignedTo === squadId && !p.completed);
    const nextSessionInfo = squadProgram 
        ? { program: squadProgram, session: squadProgram.sessions.find(s => !s.completed) } 
        : null;

    let squadProgramCompletion = 0;
    if (squadProgram) {
        const completedSessions = squadProgram.sessions.filter(s => s.completed).length;
        const totalSessions = squadProgram.sessions.length;
        if (totalSessions > 0) {
            squadProgramCompletion = Math.round((completedSessions / totalSessions) * 100);
        }
    }

    const memberStats = members.map(m => {
        const assignedPrograms = programs.filter(p => p.assignedTo === m.id && p.assignedBy === squad.coachId);
        const completedCount = assignedPrograms.filter(p => p.completed).length;
        const total = assignedPrograms.length;
        const rate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
        return { user: m, rate, total, completedCount };
    });
    const totalRates = memberStats.reduce((acc, curr) => acc + curr.rate, 0);
    const overallPlayerRate = members.length > 0 ? Math.round(totalRates / members.length) : 0;

    const recentActivity = sessions
        .filter(s => squad.memberIds.includes(s.playerId))
        .sort((a,b) => new Date(b.dateCompleted).getTime() - new Date(a.dateCompleted).getTime())
        .slice(0, 10);

    const handleDelete = () => {
        if(window.confirm(`Delete squad "${squad.name}"?`)) {
            onDeleteSquad(squad.id);
            navigate('/athletes');
        }
    }

    return (
        <div className="min-h-screen bg-brand-dark text-white pb-24">
            <header className="bg-brand-surface p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 z-20">
                 <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)}><ChevronLeft/></button>
                    <div>
                        <h1 className="text-xl font-bold">Squad Profile</h1>
                    </div>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={() => setShowEdit(true)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><Edit2 size={18}/></button>
                     <button onClick={handleDelete} className="p-2 bg-slate-800 rounded-full text-brand-error hover:bg-brand-error hover:text-white"><Trash2 size={18}/></button>
                 </div>
            </header>
            
            <main className="p-6 space-y-6">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-1">{squad.name}</h2>
                    <p className="text-slate-400 text-sm">{squad.level} • {members.length} Members</p>
                </div>
                
                {nextSessionInfo && nextSessionInfo.session ? (
                    <div className="bg-brand-primary/10 border-2 border-dashed border-brand-primary p-6 rounded-3xl shadow-sm relative overflow-hidden">
                        <div className="relative z-10">
                            <span className="text-xs font-bold bg-brand-primary text-white px-2 py-1 rounded mb-2 inline-block">UP NEXT: SQUAD SESSION</span>
                            <h3 className="text-2xl font-bold mb-1 text-white">{nextSessionInfo.session.title}</h3>
                            <p className="text-green-200/70 mb-6 text-sm line-clamp-1">{nextSessionInfo.program.title}</p>
                            <div className="flex items-center justify-between">
                                <button onClick={() => navigate(`/session/${nextSessionInfo.program.id}/${nextSessionInfo.session!.id}?squadId=${squadId}`)} className="flex items-center gap-2 text-white font-bold bg-brand-primary px-4 py-2 rounded-lg">
                                    <PlayCircle size={20}/> Start
                                </button>
                                <button onClick={() => setEditingSession(nextSessionInfo as {program: Program, session: ProgramSession})} className="flex items-center gap-2 text-slate-300 font-bold border border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-700">
                                    <Wand2 size={20}/> Adapt
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-2">
                        <Button fullWidth size="lg" onClick={() => navigate('/create-program', { state: { targetIds: [squad.id], squad: true } })} className="flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/20 bg-brand-primary hover:bg-green-700 text-white border-none ring-0">
                            <Plus size={24} />
                            <span>Assign New Squad Program</span>
                        </Button>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-brand-surface p-4 rounded-xl border border-slate-700 text-center">
                        <div className="text-3xl font-bold text-brand-primary">{squadProgramCompletion}%</div>
                        <div className="text-xs text-slate-400 uppercase">Coach Plan</div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                           <div className="bg-brand-primary h-full transition-all duration-500" style={{width: `${squadProgramCompletion}%`}}></div>
                        </div>
                    </div>
                    <div className="bg-brand-surface p-4 rounded-xl border border-slate-700 text-center">
                        <div className="text-3xl font-bold">{overallPlayerRate}%</div>
                        <div className="text-xs text-slate-400 uppercase">Player Progress</div>
                         <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                           <div className="bg-brand-primary h-full transition-all duration-500" style={{width: `${overallPlayerRate}%`}}></div>
                        </div>
                    </div>
                </div>

                <section>
                    <h3 className="font-bold text-white mb-3">Player Progress</h3>
                    <div className="space-y-3">
                        {memberStats.map(({user, rate, total, completedCount}) => (
                            <div key={user.id} className="p-4 bg-brand-surface rounded-xl border border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img src={user.avatar} className="w-10 h-10 rounded-full" alt=""/>
                                    <div>
                                        <span className="text-sm font-bold text-white block">{user.name}</span>
                                        <span className="text-xs text-slate-400">{completedCount}/{total} Programs</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-brand-primary">{rate}%</div>
                                    <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden ml-auto">
                                        <div className="bg-brand-primary h-full" style={{width: `${rate}%`}}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {memberStats.length === 0 && <p className="text-slate-500 italic">No players in squad.</p>}
                    </div>
                </section>

                <section>
                    <h3 className="font-bold text-white mb-3">Recent Activity</h3>
                    {recentActivity.length === 0 ? <p className="text-slate-500 italic">No activity yet.</p> : (
                        <div className="space-y-4">
                            {recentActivity.map(s => {
                                const u = users.find(usr => usr.id === s.playerId);
                                return (
                                    <div key={s.id} onClick={() => navigate(`/session-log/${s.id}`)} className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]">
                                        <FeedCard session={s} user={u} programName={programs.find(p => p.id === s.programId)?.title} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            <SquadModal 
                isOpen={showEdit} 
                onClose={() => setShowEdit(false)} 
                onSave={(n, m, l) => { onUpdateSquad(squad.id, n, m, l); setShowEdit(false); }} 
                users={availablePlayers}
                initialName={squad.name}
                initialMembers={squad.memberIds}
                initialLevel={squad.level}
                title="Edit Squad"
            />
            
            {editingSession && <EditSessionModal 
              isOpen={true} 
              onClose={() => setEditingSession(null)}
              session={editingSession.session}
              squad={squad}
              onSave={(newSession) => {
                  onUpdateSquadSession(editingSession.program.id, editingSession.session.id, newSession);
                  setEditingSession(null);
              }}
            />}
        </div>
    );
};

export default SquadDetailView;
