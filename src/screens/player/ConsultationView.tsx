import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConsultationResult } from '../../types';
import { CONSULTATION_DRILLS } from '../../constants';
import { Button } from '../../components/Button';
import { ChevronLeft, Target, Trophy, BrainCircuit, Plus, Minus } from 'lucide-react';

const ConsultationView: React.FC<{ onComplete: (results: ConsultationResult[]) => void }> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(-1);
  const [scores, setScores] = useState<{[key: string]: number}>({});

  const currentDrill = CONSULTATION_DRILLS[step];
  const totalSteps = CONSULTATION_DRILLS.length;

  const handleScoreChange = (drillId: string, score: number) => {
    const target = CONSULTATION_DRILLS.find(d => d.id === drillId)?.scoring.target || 0;
    const clampedScore = Math.max(0, Math.min(score, target));
    setScores(prev => ({ ...prev, [drillId]: clampedScore }));
  };

  const handleNext = () => {
    setStep(prev => prev + 1);
  };
  
  const handleFinish = () => {
    const results: ConsultationResult[] = CONSULTATION_DRILLS.map(d => ({
      drillId: d.id,
      score: scores[d.id] || 0,
      target: d.scoring.target
    }));
    onComplete(results);
    setStep(prev => prev + 1); 
  };

  if (step === -1) {
    return (
      <div className="min-h-screen bg-brand-dark p-6 flex flex-col justify-center text-center">
        <div className="w-24 h-24 bg-brand-primary/20 text-brand-primary rounded-full flex items-center justify-center mb-6 mx-auto">
          <Target size={48} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Skill Assessment</h1>
        <p className="text-slate-400 mb-12 max-w-xs mx-auto">
          Let's find your baseline. Complete {totalSteps} short drills to calculate your skill level and personalize your experience.
        </p>
        <Button size="lg" onClick={handleNext}>Let's Start</Button>
        <button onClick={() => navigate(-1)} className="text-slate-500 mt-4 text-sm">Not now</button>
      </div>
    );
  }

  if (step === totalSteps + 1) {
    const results = CONSULTATION_DRILLS.map(d => ({
      drillId: d.id,
      score: scores[d.id] || 0,
      target: d.scoring.target,
      category: d.category
    }));
    
    const performanceByCategory = results.reduce((acc, result) => {
        if (!acc[result.category]) {
            acc[result.category] = { score: 0, target: 0 };
        }
        acc[result.category].score += result.score;
        acc[result.category].target += result.target;
        return acc;
    }, {} as Record<string, {score: number, target: number}>);
    
    let weakestCategory = '';
    let minPercentage = 101;

    for (const category in performanceByCategory) {
        const { score, target } = performanceByCategory[category];
        const percentage = target > 0 ? (score / target) * 100 : 100;
        if (percentage < minPercentage) {
            minPercentage = percentage;
            weakestCategory = category;
        }
    }

    return (
      <div className="min-h-screen bg-brand-dark p-6 flex flex-col justify-center text-center">
        <div className="w-24 h-24 bg-brand-primary/20 text-brand-primary rounded-full flex items-center justify-center mb-6 mx-auto">
          <BrainCircuit size={48} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Assessment Analyzed</h1>
        <p className="text-slate-400 mb-8 max-w-xs mx-auto">
          Based on your results, your biggest area for improvement is your <strong>{weakestCategory}</strong>. Let's build a plan to work on it.
        </p>
        <div className="w-full max-w-sm mx-auto space-y-3">
          <Button 
            size="lg" 
            fullWidth
            onClick={() => navigate('/create-program', { state: { prompt: `Create a program focused on improving my ${weakestCategory}.` } })}
          >
            Create AI Program
          </Button>
          <Button 
            size="lg" 
            fullWidth
            variant="secondary"
            onClick={() => navigate('/')}
          >
            Maybe Later
          </Button>
        </div>
      </div>
    );
  }
  
  if (step === totalSteps) {
     const totalScore = Object.values(scores).reduce((sum: number, score: number) => sum + score, 0);
     const totalTarget = CONSULTATION_DRILLS.reduce((sum: number, drill) => sum + drill.scoring.target, 0);
     const percentage = totalTarget > 0 ? Math.round((totalScore / totalTarget) * 100) : 0;
     
     let level: 'Beginner' | 'Intermediate' | 'Advanced' = 'Beginner';
     let levelColor = 'text-green-500';
     if (percentage > 75) {
        level = 'Advanced';
        levelColor = 'text-red-500';
     } else if (percentage > 40) {
        level = 'Intermediate';
        levelColor = 'text-yellow-500';
     }

    return (
       <div className="min-h-screen bg-brand-dark p-6 flex flex-col justify-center text-center">
         <div className="w-24 h-24 bg-brand-surface rounded-full flex items-center justify-center mb-6 mx-auto border-4 border-brand-primary">
            <Trophy size={48} className="text-brand-primary" />
         </div>
         <h1 className="text-3xl font-bold text-white mb-2">Assessment Complete!</h1>
         <p className="text-slate-400 mb-8">Your new baseline has been set.</p>
         
         <div className="bg-brand-surface p-6 rounded-2xl w-full max-w-sm mx-auto mb-8 border border-slate-200">
            <p className="text-sm font-bold text-slate-400 uppercase">Your Calculated Level</p>
            <p className={`text-4xl font-bold my-2 ${levelColor}`}>{level}</p>
            <div className="w-full bg-slate-100 rounded-full h-4 border border-slate-200 overflow-hidden">
                <div className="bg-brand-primary h-full" style={{width: `${percentage}%`}}></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">{totalScore} / {totalTarget} Points</p>
         </div>
         
         <Button size="lg" onClick={handleFinish}>Analyze & Get Plan</Button>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark p-6 flex flex-col">
      <header className="flex items-center gap-4 mb-4">
        <button onClick={() => setStep(s => s - 1)}><ChevronLeft className="text-slate-400" /></button>
        <div className="flex-1 bg-slate-200 h-2 rounded-full">
            <div className="bg-brand-primary h-2 rounded-full transition-all duration-300" style={{width: `${((step + 1) / totalSteps) * 100}%`}}></div>
        </div>
      </header>
      <div className="flex-1 flex flex-col justify-center text-center">
        <h2 className="text-2xl font-bold text-white mb-2">{currentDrill.name}</h2>
        <p className="text-slate-400 text-sm mb-8">{currentDrill.scoring.prompt}</p>

        <div className="flex items-center justify-center gap-4 my-8">
            <button 
                onClick={() => handleScoreChange(currentDrill.id, (scores[currentDrill.id] || 0) - 1)}
                className="w-16 h-16 bg-brand-surface rounded-full flex items-center justify-center text-slate-600 border border-slate-200 active:bg-slate-100"
            >
                <Minus size={32} />
            </button>
            <input 
                type="number"
                value={scores[currentDrill.id] || 0}
                onChange={e => handleScoreChange(currentDrill.id, parseInt(e.target.value) || 0)}
                className="w-32 h-32 bg-brand-surface rounded-2xl text-6xl font-bold text-center text-slate-900 border-2 border-slate-200 focus:border-brand-primary focus:ring-brand-primary"
            />
            <button 
                onClick={() => handleScoreChange(currentDrill.id, (scores[currentDrill.id] || 0) + 1)}
                className="w-16 h-16 bg-brand-surface rounded-full flex items-center justify-center text-slate-600 border border-slate-200 active:bg-slate-100"
            >
                <Plus size={32} />
            </button>
        </div>
        <p className="text-slate-500">Target: {currentDrill.scoring.target}</p>
      </div>

      <div className="mt-auto">
        <Button fullWidth size="lg" onClick={handleNext}>
            {step === totalSteps - 1 ? 'Finish Assessment' : 'Next Drill'}
        </Button>
      </div>
    </div>
  );
};

export default ConsultationView;