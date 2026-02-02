
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Program, Squad, SessionLog } from '../../types';
import { Button } from '../../components/Button';
import { Plus, Users, ChevronRight } from 'lucide-react';
import { FeedCard } from '../common/FeedCard';

const CoachDashboard: React.FC<{ 
    user: User; 
    users: User[]; 
    programs: Program[]; 
    squads: Squad[]; 
    sessions: SessionLog[]; 
    setSQUADS: React.Dispatch<React.SetStateAction<Squad[]>>; 
}> = ({ user, users, programs, squads, sessions }) => {
    const navigate = useNavigate();
    
    const mySquads = squads.filter(s => s.coachId === user.id);
    const recentActivity = sessions
        .filter(s => user.linkedPlayerIds?.includes(s.playerId))
        .sort((a, b) => new Date(b.dateCompleted).getTime() - new Date(a.dateCompleted).getTime())
        .slice(0, 5);

    return (
        <div className="p-6 pb-24 space-y-6">
            <header className="flex justify-between items-center mb-6">
                 <div>
                    <h1 className="text-2xl font-bold">Coach Dashboard</h1>
                    <p className="text-slate-400">Welcome back, {user.name}</p>
                 </div>
                 <div onClick={() => navigate('/profile')} className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center text-white font-bold cursor-pointer">
                    {user.name[0]}
                 </div>
            </header>

            <div className="grid grid-cols-2 gap-4">
                 <div onClick={() => navigate('/coach/create')} className="bg-brand-primary p-4 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer shadow-lg shadow-green-900/20">
                     <Plus size={32} />
                     <span className="font-bold">Create</span>
                 </div>
                 <div onClick={() => navigate('/athletes')} className="bg-brand-surface border border-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer">
                     <Users size={32} className="text-brand-secondary"/>
                     <span className="font-bold">Athletes</span>
                 </div>
            </div>

            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-lg">My Squads</h2>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/athletes')}>View All</Button>
                </div>
                <div className="space-y-3">
                    {mySquads.map(s => (
                        <div key={s.id} onClick={() => navigate(`/squad/${s.id}`)} className="bg-brand-surface p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                            <div>
                                <div className="font-bold">{s.name}</div>
                                <div className="text-xs text-slate-400">{s.level || 'Intermediate'}</div>
                            </div>
                            <ChevronRight className="text-slate-500" size={16} />
                        </div>
                    ))}
                </div>
            </section>
            
            <section>
                <h2 className="font-bold text-lg mb-4">Recent Activity</h2>
                <div className="space-y-4">
                    {recentActivity.length > 0 ? (
                        recentActivity.map(s => {
                            const player = users.find(u => u.id === s.playerId);
                            const program = programs.find(p => p.id === s.programId);
                            return (
                                <div key={s.id} onClick={() => navigate(`/session-log/${s.id}`)} className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]">
                                    <FeedCard session={s} user={player} programName={program?.title} />
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-10 border border-dashed border-slate-700 rounded-xl text-slate-500">
                            <p>No recent activity from your athletes.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default CoachDashboard;
