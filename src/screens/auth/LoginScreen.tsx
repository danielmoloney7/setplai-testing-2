import React from 'react';
import { User } from '../../types';
import { Button } from '../../components/Button';

interface LoginScreenProps {
  users: User[];
  onLogin: (user: User) => void;
  onStartOnboarding: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin, onStartOnboarding }) => {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 text-white">
      <h1 className="text-4xl font-bold mb-8 text-brand-primary tracking-tighter">setplai</h1>
      <div className="w-full max-w-sm space-y-4">
        <p className="text-slate-400 text-center mb-4">Select a persona to demo:</p>
        {users.map(u => (
          <button key={u.id} onClick={() => onLogin(u)} className="w-full p-4 bg-brand-surface rounded-xl border border-slate-700 flex items-center gap-4 hover:border-brand-primary transition-all text-left">
            <img src={u.avatar} className="w-12 h-12 rounded-full border border-slate-600" alt={u.name} />
            <div>
              <div className="font-bold text-lg">{u.name}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">{u.role}</div>
            </div>
          </button>
        ))}
        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-slate-700"></div>
          <span className="flex-shrink mx-4 text-slate-500 text-xs">OR</span>
          <div className="flex-grow border-t border-slate-700"></div>
        </div>
        <Button fullWidth variant="outline" onClick={onStartOnboarding}>Create New Account</Button>
      </div>
    </div>
  );
};

export default LoginScreen;