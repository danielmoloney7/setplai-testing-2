import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Squad } from '../../types';
import { Button } from '../../components/Button';
import { Plus, UserPlus, ChevronRight, QrCode } from 'lucide-react';
import { SquadModal } from './components/SquadModal';

const CoachAthletesView: React.FC<{ 
    user: User; 
    users: User[]; 
    squads: Squad[]; 
    onCreateSquad: (name: string, members: string[], level: string) => void; 
}> = ({ user, users, squads, onCreateSquad }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateSquad, setShowCreateSquad] = useState(false);
  
  useEffect(() => {
    if (location.state?.openCreateModal) {
      setShowCreateSquad(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const myPlayers = users.filter(u => user.linkedPlayerIds?.includes(u.id));
  const mySquads = squads.filter(s => s.coachId === user.id);

  return (
    <div className="pb-24 min-h-screen bg-brand-dark text-white">
      <header className="bg-brand-surface px-6 py-4 border-b border-slate-700 sticky top-0 z-20 flex justify-between items-center">
         <h1 className="text-xl font-bold">My Athletes</h1>
         <div className="flex gap-2">
             <Button size="sm" variant="secondary" onClick={() => setShowCreateSquad(true)}><Plus size={16} className="mr-1"/> Squad</Button>
             <Button size="sm" onClick={() => setShowInvite(true)}><UserPlus size={16} className="mr-1"/> Invite</Button>
         </div>
      </header>

      <main className="p-6 space-y-8">
         <div className="grid grid-cols-2 gap-4">
            <div className="bg-brand-surface p-4 rounded-xl border border-slate-700 text-center">
                 <div className="text-3xl font-bold text-white">{myPlayers.length}</div>
                 <div className="text-xs text-slate-400 uppercase">Total Athletes</div>
            </div>
            <div className="bg-brand-surface p-4 rounded-xl border border-slate-700 text-center">
                 <div className="text-3xl font-bold text-white">{mySquads.length}</div>
                 <div className="text-xs text-slate-400 uppercase">Total Squads</div>
            </div>
         </div>
         <section>
            <h2 className="font-bold text-lg mb-4 text-white">Squads</h2>
            <div className="grid grid-cols-1 gap-3">
               {mySquads.map(s => (
                  <div key={s.id} onClick={() => navigate(`/squad/${s.id}`)} className="bg-brand-surface p-4 rounded-xl border border-slate-700 flex items-center justify-between cursor-pointer hover:border-brand-primary">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-400">{s.name[0]}</div>
                        <div>
                           <h3 className="font-bold text-white">{s.name}</h3>
                           <p className="text-xs text-slate-400">{s.level} • {s.memberIds.length} Members</p>
                        </div>
                     </div>
                     <ChevronRight size={16} className="text-slate-500" />
                  </div>
               ))}
               {mySquads.length === 0 && <p className="text-slate-500 italic text-sm">No squads yet. Create one!</p>}
            </div>
         </section>

         <section>
            <h2 className="font-bold text-lg mb-4 text-white">All Players</h2>
            <div className="bg-brand-surface rounded-xl border border-slate-700 divide-y divide-slate-700">
               {myPlayers.map(p => (
                  <div key={p.id} onClick={() => navigate(`/player/${p.id}`)} className="p-4 flex items-center justify-between hover:bg-slate-700/50 cursor-pointer">
                     <div className="flex items-center gap-3">
                        <img src={p.avatar} className="w-10 h-10 rounded-full" alt="" />
                        <div>
                           <h3 className="font-bold text-sm text-white">{p.name}</h3>
                           <p className="text-xs text-slate-400">{p.level}</p>
                        </div>
                     </div>
                     <div className="text-xs text-slate-500">{p.xp} XP</div>
                  </div>
               ))}
            </div>
         </section>
      </main>

      {showInvite && (
         <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setShowInvite(false)}>
            <div className="bg-brand-surface w-full max-w-sm rounded-2xl p-6 border border-slate-700 text-center" onClick={e => e.stopPropagation()}>
               <div className="w-16 h-16 bg-white rounded-xl mx-auto mb-4 flex items-center justify-center text-brand-dark"><QrCode size={32}/></div>
               <h3 className="text-xl font-bold mb-2">Connect Player</h3>
               <p className="text-slate-400 text-sm mb-6">Share this code with your player to link accounts.</p>
               <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-6 font-mono text-2xl tracking-widest text-brand-primary font-bold">
                  TENNIS-{Math.floor(Math.random()*1000)}
               </div>
               <Button fullWidth onClick={() => setShowInvite(false)}>Done</Button>
            </div>
         </div>
      )}

      <SquadModal 
        isOpen={showCreateSquad} 
        onClose={() => setShowCreateSquad(false)} 
        onSave={onCreateSquad} 
        users={myPlayers} 
        title="Create New Squad"
      />
    </div>
  );
};

export default CoachAthletesView;