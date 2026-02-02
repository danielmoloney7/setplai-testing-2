import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { Button } from '../../components/Button';
import { COMMON_GOALS } from '../../constants';
import { Edit2, Link as LinkIcon, Heart, AlertCircle } from 'lucide-react';

const AccountView: React.FC<{ user: User; onLogout: () => void; onUpdateUser: (u: User) => void }> = ({ user, onLogout, onUpdateUser }) => {
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [tempGoals, setTempGoals] = useState(user.goals || []);
  const isDeviceConnected = user.connectedDevices && user.connectedDevices.length > 0;

  const handleConnect = () => {
    onUpdateUser({ ...user, connectedDevices: ['Simulated Smartwatch'] });
    setShowDeviceModal(false);
  };

  const handleDisconnect = () => {
    onUpdateUser({ ...user, connectedDevices: [] });
  };
  
  const handleSaveGoals = () => {
    onUpdateUser({ ...user, goals: tempGoals });
    setShowGoalsModal(false);
  };

  const toggleGoal = (goal: string) => {
    setTempGoals(prev => prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]);
  };
  
  return (
    <div className="min-h-screen bg-brand-dark p-6 pb-24">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Profile</h1>
      
      <div className="bg-brand-surface p-6 rounded-2xl border border-slate-200 text-center mb-6">
        <div className="flex flex-col items-center">
          <img src={user.avatar} className="w-24 h-24 rounded-full border-4 border-slate-100 mb-4" alt={user.name}/>
          <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
          <p className="text-slate-500 uppercase text-xs tracking-wider font-bold mb-6">{user.role}</p>
        </div>

        {user.role === UserRole.PLAYER && (
          <div className="w-full mb-2">
            <label className="block text-left text-xs font-bold text-slate-400 uppercase mb-2">Skill Level</label>
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => onUpdateUser({ ...user, level: lvl })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    user.level === lvl 
                      ? 'bg-white text-brand-primary shadow-sm border border-slate-200' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {user.role === UserRole.PLAYER && (
        <>
          <div className="bg-brand-surface p-6 rounded-2xl border border-slate-200 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-900">My Goals</h3>
              <Button size="sm" variant="outline" onClick={() => setShowGoalsModal(true)}>
                <Edit2 size={14} className="mr-2" /> Edit
              </Button>
            </div>
            {(!user.goals || user.goals.length === 0) ? (
              <p className="text-sm text-slate-500">Set your goals to get personalized AI program suggestions.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user.goals.map(goal => (
                  <span key={goal} className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-sm font-medium rounded-full border border-brand-primary/20">
                    {goal}
                  </span>
                ))}
              </div>
            )}
          </div>
        
          <div className="bg-brand-surface p-6 rounded-2xl border border-slate-200 mb-6">
            <h3 className="font-bold text-lg text-slate-900 mb-4">Connected Devices</h3>
            {isDeviceConnected ? (
              <div className="flex items-center justify-between bg-green-50 p-4 rounded-xl border border-green-200">
                <div>
                  <p className="font-bold text-green-700">Smartwatch Connected</p>
                  <p className="text-xs text-green-600">Simulating heart rate & calorie data</p>
                </div>
                <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-600" onClick={handleDisconnect}>Disconnect</Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-500 mb-4">Connect your wearable to track heart rate and calories during sessions.</p>
                <Button fullWidth variant="outline" onClick={() => setShowDeviceModal(true)}>
                  <LinkIcon size={16} className="mr-2" /> Connect Smartwatch
                </Button>
              </div>
            )}
          </div>
        </>
      )}
      
      <div className="bg-brand-surface p-6 rounded-2xl border border-slate-200">
        <Button variant="danger" fullWidth onClick={onLogout}>Log Out</Button>
      </div>

      {showDeviceModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setShowDeviceModal(false)}>
          <div className="bg-brand-surface w-full max-w-sm rounded-2xl p-6 border border-slate-200 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-full mx-auto mb-4 flex items-center justify-center"><Heart size={32}/></div>
            <h3 className="text-xl font-bold mb-2 text-slate-900">Connect Your Wearable</h3>
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm mb-6 text-left space-y-2">
              <p className="font-bold flex items-center gap-2"><AlertCircle size={16}/> Important Note</p>
              <p>Directly connecting smartwatches to a web app is not possible due to browser security restrictions. A dedicated mobile app is usually required.</p>
              <p>For this demo, we will <strong className="font-bold">simulate</strong> heart rate and calorie data during your sessions.</p>
            </div>
            <Button fullWidth onClick={handleConnect}>I Understand & Connect</Button>
          </div>
        </div>
      )}
      
      {showGoalsModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setShowGoalsModal(false)}>
          <div className="bg-brand-surface w-full max-w-sm rounded-2xl p-6 border border-slate-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-slate-900">What are your goals?</h3>
            <div className="space-y-2 mb-6">
              {COMMON_GOALS.map(goal => (
                <button 
                  key={goal}
                  onClick={() => toggleGoal(goal)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${tempGoals.includes(goal) ? 'bg-brand-primary/10 border-brand-primary text-brand-primary font-bold' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
                >
                  {goal}
                </button>
              ))}
            </div>
            <Button fullWidth onClick={handleSaveGoals}>Save Goals</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountView;