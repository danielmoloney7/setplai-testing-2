
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Program, SessionLog } from '../../../types';
import { ChevronLeft } from 'lucide-react';
import { FeedCard } from '../common/FeedCard';

const PlayerDetailView: React.FC<{ currentUser: User; users: User[]; programs: Program[]; sessions: SessionLog[] }> = ({ currentUser, users, programs, sessions }) => {
    const navigate = useNavigate();
    const { playerId } = useParams<{playerId: string}>();
    
    const player = users.find(u => u.id === playerId);
    if (!player) return <div>Player not found</div>;

    const playerPrograms = programs.filter(p => p.assignedTo === playerId && p.assignedBy === currentUser.id);
    const completedPrograms = playerPrograms.filter(p => p.completed).length;
    const totalPrograms = playerPrograms.length;
    const completionRate = totalPrograms > 0 ? Math.round((completedPrograms / totalPrograms) * 100) : 0;
    
    const recentActivity = sessions
        .filter(s => s.playerId === playerId)
        .sort((a,b) => new Date(b.dateCompleted).getTime() - new Date(a.dateCompleted).getTime());

    return (
        <div className="min-h-screen bg-brand-dark text-white pb-24">
            <header className="bg-brand-surface p-6 border-b border-slate-700 flex items-center gap-4">
                 <button onClick={() => navigate(-1)}><ChevronLeft/></button>
                 <h1 className="text-xl font-bold">Athlete Profile</h1>
            </header>
            <main className="p-6 space-y-6">
                <div className="flex items-center gap-4 mb-4">
                    <img src={player.avatar} className="w-20 h-20 rounded-full border-2 border-brand-primary" alt="" />
                    <div>
                        <h2 className="text-2xl font-bold text-white">{player.name}</h2>
                        <span className="text-sm text-slate-400">{player.level} • {player.yearsPlayed} yrs exp</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div className="bg-brand-surface p-4 rounded-xl border border-slate-700 text-center">
                         <div className="text-3xl font-bold text-brand-primary">{completionRate}%</div>
                         <div className="text-xs text-slate-400 uppercase">Program Completion</div>
                     </div>
                     <div className="bg-brand-surface p-4 rounded-xl border border-slate-700 text-center">
                         <div className="text-3xl font-bold text-white">{recentActivity.length}</div>
                         <div className="text-xs text-slate-400 uppercase">Total Sessions</div>
                     </div>
                </div>

                <section>
                    <h3 className="font-bold text-white mb-3">Recent Activity</h3>
                    {recentActivity.length === 0 ? <p className="text-slate-500 italic">No activity yet.</p> : (
                        <div className="space-y-4">
                            {recentActivity.map(s => (
                                <div key={s.id} onClick={() => navigate(`/session-log/${s.id}`)} className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]">
                                    <FeedCard session={s} user={player} programName={programs.find(p => p.id === s.programId)?.title} />
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default PlayerDetailView;
