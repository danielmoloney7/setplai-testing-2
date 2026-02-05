import React, { useState } from 'react';
import { User, UserRole, Program } from '../../types';
import { COMMON_GOALS, MOCK_DRILLS } from '../../constants';
import { generateOnboardingPlans } from '../../services/geminiService';
import { Button } from '../../components/Button';

const OnboardingFlow: React.FC<{ onComplete: (user: User) => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({ role: UserRole.PLAYER, goals: [] });
  const [aiPlans, setAiPlans] = useState<Partial<Program>[]>([]);
  const [generatedUser, setGeneratedUser] = useState<User | null>(null);

  const handleCreateAccount = () => {
    const newUser: User = {
      id: `user_${Math.random().toString(36).substr(2, 9)}`,
      name: "New Player",
      avatar: 'https://picsum.photos/200/200?random=99',
      role: UserRole.PLAYER,
      xp: 0,
      ...formData
    } as User;
    setGeneratedUser(newUser);
    setStep(3);
    generatePlans(newUser);
  };

  const generatePlans = async (user: User) => {
    setLoading(true);
    const plans = await generateOnboardingPlans(user, MOCK_DRILLS);
    if (plans) setAiPlans(plans);
    setLoading(false);
  };

  const handleFinish = (selectedPlan?: Partial<Program>) => {
    if (generatedUser) onComplete(generatedUser);
  };

  return (
    <div className="min-h-screen bg-brand-dark text-white flex flex-col p-6">
      {step === 1 && (
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full animate-in fade-in">
          <h1 className="text-3xl font-bold mb-2 text-brand-primary">Welcome to setplai</h1>
          <p className="text-slate-400 mb-8">Let's build your athletic profile.</p>
          <div className="space-y-4">
             <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Sex</label>
              <div className="flex gap-2">
                {(['Male', 'Female', 'Other'] as string[]).map((opt) => (
                  <button key={opt} onClick={() => setFormData({...formData, sex: opt as any})} className={`flex-1 py-2 rounded-xl border transition-colors ${formData.sex === opt ? 'bg-brand-primary border-brand-primary text-white' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>{opt}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Experience (Years)</label>
              <input type="number" className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-white" onChange={(e) => setFormData({...formData, yearsPlayed: parseInt(e.target.value)})} />
            </div>
             <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Current Level</label>
              <select className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-white" onChange={(e) => setFormData({...formData, level: e.target.value as any})} defaultValue="">
                <option value="" disabled>Select Level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <Button fullWidth onClick={() => setStep(2)} disabled={!formData.sex || !formData.level}>Next</Button>
          </div>
        </div>
      )}
      {step === 2 && (
         <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full animate-in slide-in-from-right-8">
            <h2 className="text-2xl font-bold mb-2">Your Goals</h2>
            <div className="space-y-2 mb-8">
             {COMMON_GOALS.map((goal) => (
               <button key={goal} onClick={() => {
                   const goals = formData.goals?.includes(goal) ? formData.goals.filter(g => g !== goal) : [...(formData.goals || []), goal];
                   setFormData({...formData, goals});
                 }} className={`w-full p-4 text-left rounded-xl border transition-all ${formData.goals?.includes(goal) ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-bold' : 'border-slate-700 bg-slate-800 text-slate-300'}`}>{goal}</button>
             ))}
           </div>
           <Button fullWidth onClick={handleCreateAccount} disabled={!formData.goals?.length}>Generate Profile</Button>
         </div>
      )}
      {step === 3 && (
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
           <h2 className="text-2xl font-bold mb-4 text-center">AI Recommended Plans</h2>
           {loading ? <div className="text-center py-20 text-slate-400">Analyzing...</div> : (
             <div className="space-y-4">
               {aiPlans.map((plan, i) => (
                 <div key={i} className="bg-brand-surface p-5 rounded-2xl border border-slate-700 shadow-sm">
                    <h3 className="font-bold text-lg text-white">{plan.title}</h3>
                    <p className="text-sm text-slate-400 mb-4">{plan.description}</p>
                    <Button fullWidth variant="secondary" onClick={() => handleFinish(plan)}>Select Plan</Button>
                 </div>
               ))}
               <button onClick={() => handleFinish()} className="w-full py-4 text-slate-500 text-sm hover:text-white">Skip for now</button>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default OnboardingFlow;