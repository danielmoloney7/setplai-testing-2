
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole } from '../../types';
import {
  Layout,
  CalendarDays,
  Users,
  Plus,
  TrendingUp,
  Dumbbell,
  ClipboardList,
  User as UserIcon,
} from 'lucide-react';

interface BottomNavProps {
  user: User;
}

const BottomNav: React.FC<BottomNavProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-brand-surface border-t border-slate-200 p-2 flex justify-around items-end z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <button onClick={() => navigate('/')} className={`p-2 flex flex-col items-center gap-1 w-16 ${location.pathname === '/' ? 'text-brand-primary' : 'text-slate-400 hover:text-slate-900'}`}>
        <Layout size={24} />
        <span className="text-[10px] font-medium">Home</span>
      </button>

      {user.role === UserRole.PLAYER ? (
        <button onClick={() => navigate('/plans')} className={`p-2 flex flex-col items-center gap-1 w-16 ${location.pathname === '/plans' ? 'text-brand-primary' : 'text-slate-400 hover:text-slate-900'}`}>
          <CalendarDays size={24} />
          <span className="text-[10px] font-medium">Plans</span>
        </button>
      ) : (
        <button onClick={() => navigate('/athletes')} className={`p-2 flex flex-col items-center gap-1 w-16 ${location.pathname === '/athletes' ? 'text-brand-primary' : 'text-slate-400 hover:text-slate-900'}`}>
          <Users size={24} />
          <span className="text-[10px] font-medium">Team</span>
        </button>
      )}

      <div className="relative -top-6">
        <button
          onClick={() => navigate(user.role === UserRole.PLAYER ? '/create-program' : '/coach/create')}
          className="w-14 h-14 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-xl hover:bg-green-700 transition-transform active:scale-95 ring-4 ring-brand-surface"
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      </div>

      {user.role === UserRole.PLAYER ? (
        <button onClick={() => navigate('/progress')} className={`p-2 flex flex-col items-center gap-1 w-16 ${location.pathname === '/progress' ? 'text-brand-primary' : 'text-slate-400 hover:text-slate-900'}`}>
          <TrendingUp size={24} />
          <span className="text-[10px] font-medium">Progress</span>
        </button>
      ) : (
        <button onClick={() => navigate('/drills')} className={`p-2 flex flex-col items-center gap-1 w-16 ${location.pathname === '/drills' ? 'text-brand-primary' : 'text-slate-400 hover:text-slate-900'}`}>
          <Dumbbell size={24} />
          <span className="text-[10px] font-medium">Drills</span>
        </button>
      )}

      {user.role === UserRole.COACH ? (
        <button onClick={() => navigate('/programs')} className={`p-2 flex flex-col items-center gap-1 w-16 ${location.pathname === '/programs' ? 'text-brand-primary' : 'text-slate-400 hover:text-slate-900'}`}>
          <ClipboardList size={24} />
          <span className="text-[10px] font-medium">Programs</span>
        </button>
      ) : (
        <button onClick={() => navigate('/profile')} className={`p-2 flex flex-col items-center gap-1 w-16 ${location.pathname === '/profile' ? 'text-brand-primary' : 'text-slate-400 hover:text-slate-900'}`}>
          <UserIcon size={24} />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      )}
    </div>
  );
};

export default BottomNav;
