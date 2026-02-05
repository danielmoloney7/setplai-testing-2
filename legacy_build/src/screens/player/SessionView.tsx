import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { User, Program, SessionLog, DrillPerformance } from '../../types';
import { Button } from '../../components/Button';
import { MOCK_DRILLS } from '../../constants';
import { ChevronLeft, Clock, Dumbbell, Play, Check, Pause, CheckCircle, Trophy, ThumbsUp } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis } from 'recharts';

const SessionView: React.FC<{
    user: User;
    programs: Program[];
    sessions: SessionLog[];
    onComplete: (log: SessionLog, isProgression: boolean, isQuick: boolean) => boolean;
}> = ({ user, programs, sessions, onComplete }) => {
    const navigate = useNavigate();
    const { programId, sessionId } = useParams<{programId: string; sessionId: string}>();
    const [searchParams] = useSearchParams();
    const squadId = searchParams.get('squadId');

    const program = programs.find(p => p.id === programId);
    const session = program?.sessions.find(s => s.id === sessionId);
    
    const [viewState, setViewState] = useState<'OVERVIEW' | 'PREP' | 'COUNTDOWN' | 'ACTIVE' | 'FEEDBACK' | 'SUMMARY' | 'PROGRAM_COMPLETE'>('OVERVIEW');
    const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
    const [rpe, setRpe] = useState(5);
    const [notes, setNotes] = useState('');
    const [timeLeft, setTimeLeft] = useState(0); 
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const intervalIdRef = useRef<number | null>(null);
    const [countDownValue, setCountDownValue] = useState(3);
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
    const [drillPerformanceLog, setDrillPerformanceLog] = useState<DrillPerformance[]>([]);
    const [achievedValue, setAchievedValue] = useState<string>('');
    const [finalLog, setFinalLog] = useState<SessionLog | null>(null);

    const currentItem = session?.items[currentDrillIndex];
    const drill = currentItem ? MOCK_DRILLS.find(d => d.id === currentItem.drillId) : null;

    useEffect(() => {
        if(currentItem && viewState === 'PREP') {
            setTimeLeft(currentItem.targetDurationMin * 60);
            setIsTimerRunning(false);
            setCountDownValue(3);
        }
    }, [currentItem, viewState]);

    useEffect(() => {
        if (viewState === 'COUNTDOWN') {
            if (countDownValue > 0) {
                const timer = setTimeout(() => setCountDownValue(p => p - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                setViewState('ACTIVE');
                setIsTimerRunning(true);
            }
        }
    }, [viewState, countDownValue]);

    useEffect(() => {
        if (isTimerRunning && viewState === 'ACTIVE') {
            intervalIdRef.current = window.setInterval(() => {
                setTimeLeft(prevTime => {
                    if (prevTime <= 1) {
                        setIsTimerRunning(false); 
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        }
        
        return () => {
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
            }
        };
    }, [isTimerRunning, viewState]);

    if (!program || !session) return <div>Session not found</div>;

    const handleStartSession = () => {
        setSessionStartTime(Date.now());
        setViewState('PREP');
    };

    const handleStartDrill = () => {
        setViewState('COUNTDOWN');
    };

    const handleFinishDrill = () => {
        setIsTimerRunning(false);
        setAchievedValue('');
        setViewState('FEEDBACK');
    };
    
    const handleSubmitDrillFeedback = (outcome: 'success' | 'fail') => {
        if (!drill) return;
        
        const performance: DrillPerformance = {
            drillId: drill.id,
            outcome,
        };

        if (drill.successCriteria && (achievedValue !== '')) {
            performance.achieved = parseInt(achievedValue, 10);
        }
        
        setDrillPerformanceLog(prev => [...prev, performance]);

        if (currentDrillIndex < session.items.length - 1) {
            setCurrentDrillIndex(prev => prev + 1);
            setViewState('PREP');
        } else {
            setViewState('SUMMARY');
        }
    };

    const handleFinishSession = () => {
        const endTime = Date.now();
        const durationMs = endTime - (sessionStartTime || endTime);
        const actualDurationMin = Math.max(1, Math.ceil(durationMs / 60000));

        const log: SessionLog = {
            id: Math.random().toString(36).substr(2, 9),
            programId: program.id,
            sessionId: session.id,
            playerId: user.id,
            dateCompleted: new Date().toISOString(),
            durationMin: actualDurationMin,
            rpe,
            notes: squadId ? `[Squad Session] ${notes}` : notes,
            drillPerformance: drillPerformanceLog,
            squadSessionId: squadId ? `ad-hoc-${squadId}-${Date.now()}` : undefined
        };
        
        if (user.connectedDevices?.includes('Simulated Smartwatch')) {
            log.avgHeartRate = 130 + Math.floor(Math.random() * 20);
            log.maxHeartRate = log.avgHeartRate + 10 + Math.floor(Math.random() * 15);
            log.caloriesBurned = Math.round(log.durationMin * (9 + Math.random() * 4));
        }

        const isProgramFinished = onComplete(log, false, program.isQuickStart || false);

        if (isProgramFinished && !program.isQuickStart) {
            setFinalLog(log);
            setViewState('PROGRAM_COMPLETE');
        } else {
            navigate('/');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (viewState === 'PROGRAM_COMPLETE' && finalLog) {
        const programLogs = [...sessions.filter(s => s.programId === program.id), finalLog];
        // FIX: Explicitly type accumulator in reduce to prevent type inference issues.
        const totalTime = programLogs.reduce((acc: number, log) => acc + log.durationMin, 0);
        const allPerformances = programLogs.flatMap(log => log.drillPerformance);
        const successCount = allPerformances.filter(p => p.outcome === 'success').length;
        const failCount = allPerformances.length - successCount;

        const performanceData = [{ name: 'Performance', success: successCount, fail: failCount }];

        const drillCategories = program.sessions.flatMap(s => s.items).map(item => MOCK_DRILLS.find(d => d.id === item.drillId)?.category);
        const categoryCounts = drillCategories.reduce((acc, cat) => { if(cat) { acc[cat] = (acc[cat] || 0) + 1; } return acc; }, {} as Record<string, number>);
        const focusData = Object.entries(categoryCounts).map(([cat, count]) => ({
            subject: cat,
            A: count,
            fullMark: Math.max(...Object.values(categoryCounts)),
        }));

        return (
            <div className="min-h-screen bg-brand-dark p-6 flex flex-col justify-center text-center">
                <div className="w-24 h-24 bg-brand-primary rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg shadow-green-900/30">
                     <Trophy className="text-white w-12 h-12" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Program Complete!</h1>
                <p className="text-slate-400 mb-8 max-w-xs mx-auto">You've finished the "{program.title}" program. Amazing work!</p>
                
                <div className="w-full max-w-sm mx-auto space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div className="bg-brand-surface p-4 rounded-xl border border-slate-200">
                             <div className="text-3xl font-bold text-slate-900">{totalTime}</div>
                             <div className="text-xs text-slate-500 uppercase">Total Minutes</div>
                         </div>
                         <div className="bg-brand-surface p-4 rounded-xl border border-slate-200">
                             <div className="text-3xl font-bold text-slate-900">{allPerformances.length}</div>
                             <div className="text-xs text-slate-500 uppercase">Drills Completed</div>
                         </div>
                    </div>

                    <div className="bg-brand-surface p-4 rounded-xl border border-slate-200">
                         <h3 className="font-bold text-sm uppercase text-slate-400 mb-2 text-left">Drill Performance</h3>
                         <ResponsiveContainer width="100%" height={40}>
                             <BarChart layout="vertical" data={performanceData} stackOffset="expand">
                                 <XAxis type="number" hide />
                                 <YAxis type="category" dataKey="name" hide />
                                 <Tooltip />
                                 <Bar dataKey="success" fill="#16A34A" stackId="a" name="Nailed It" />
                                 <Bar dataKey="fail" fill="#DC2626" stackId="a" name="Needs Work" />
                             </BarChart>
                         </ResponsiveContainer>
                    </div>

                    <div className="bg-brand-surface p-4 rounded-xl border border-slate-200">
                         <h3 className="font-bold text-sm uppercase text-slate-400 mb-2 text-left">Areas of Focus</h3>
                         <ResponsiveContainer width="100%" height={200}>
                             <RadarChart cx="50%" cy="50%" outerRadius="80%" data={focusData}>
                                 <PolarGrid stroke="#e2e8f0" />
                                 <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                                 <Radar name="Drills" dataKey="A" stroke="#15803D" fill="#15803D" fillOpacity={0.6} />
                             </RadarChart>
                         </ResponsiveContainer>
                    </div>
                </div>

                <div className="mt-8 w-full max-w-sm mx-auto space-y-3">
                    <Button fullWidth size="md" onClick={() => navigate('/create-program/self')}>Start New Adaptive Program</Button>
                    <Button fullWidth size="md" variant="secondary" onClick={() => navigate('/')}>Back to Home</Button>
                </div>
            </div>
        )
    }

    if (viewState === 'OVERVIEW') {
        const totalTime = session.items.reduce((acc, i) => acc + i.targetDurationMin, 0);
        return (
            <div className="min-h-screen bg-brand-dark p-6 flex flex-col">
                <header className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)}><ChevronLeft className="text-slate-400" /></button>
                    <h1 className="text-xl font-bold text-white">
                        {squadId ? 'Start Squad Session' : 'Session Overview'}
                    </h1>
                </header>
                
                <div className="flex-1 space-y-6">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">{session.title}</h2>
                        {squadId && <div className="text-sm font-bold text-brand-primary uppercase mb-2">Live Coaching Mode</div>}
                        <div className="flex items-center gap-4 text-slate-400 text-sm">
                            <span className="flex items-center gap-1"><Clock size={16}/> {totalTime} min</span>
                            <span className="flex items-center gap-1"><Dumbbell size={16}/> {session.items.length} Drills</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {session.items.map((item, idx) => {
                            const d = MOCK_DRILLS.find(drill => drill.id === item.drillId);
                            return (
                                <div key={idx} className="bg-brand-surface p-4 rounded-xl border border-slate-700 flex justify-between items-start">
                                    <div className="pr-4">
                                        <span className="text-xs font-bold text-brand-primary block mb-1">DRILL {idx + 1}</span>
                                        <h4 className="font-bold text-white">{d?.name}</h4>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-sm font-bold text-slate-400 block mb-1.5">{item.targetDurationMin}m</span>
                                        {d && (
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border
                                            ${d.difficulty === 'Advanced' ? 'border-red-300 text-red-600 bg-red-100' : 
                                                d.difficulty === 'Intermediate' ? 'border-yellow-300 text-yellow-600 bg-yellow-100' : 
                                                'border-green-300 text-green-600 bg-green-100'}`}>
                                            {d.difficulty}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>Exit</Button>
                    <Button className="flex-[2]" onClick={handleStartSession}>Begin Session</Button>
                </div>
            </div>
        );
    }

    if (viewState === 'PREP' && drill && currentItem) {
        return (
            <div className="h-[100dvh] bg-brand-dark flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 pb-32">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-sm font-bold text-slate-500">Drill {currentDrillIndex + 1} of {session.items.length}</span>
                        <div className="text-xs font-bold bg-slate-800 px-2 py-1 rounded text-slate-400">PREP</div>
                    </div>

                    <div className="aspect-video bg-slate-800 rounded-2xl mb-6 overflow-hidden relative shadow-lg">
                        {drill.visualUrl ? <img src={drill.visualUrl} className="w-full h-full object-cover opacity-90" alt="" /> : <div className="flex items-center justify-center h-full text-slate-600"><Play size={48}/></div>}
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2 leading-tight">{drill.name}</h2>
                    <div className="flex flex-wrap gap-3 mb-6">
                        <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm font-bold flex items-center gap-1"><Clock size={14}/> {currentItem.targetDurationMin} min</span>
                        {currentItem.sets && <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-sm flex items-center gap-1"><Dumbbell size={14}/> {currentItem.sets} Sets</span>}
                    </div>
                    
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-6">
                        <h3 className="text-sm font-bold text-white uppercase mb-2">Instructions</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">{drill.description}</p>
                    </div>

                    {currentItem.notes && (
                        <div className="bg-blue-900/10 border border-blue-800/30 p-4 rounded-xl">
                            <p className="text-blue-300 text-sm leading-relaxed">💡 <span className="font-bold text-blue-200">Coach Note:</span> {currentItem.notes}</p>
                        </div>
                    )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 bg-brand-surface border-t border-slate-800 z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <Button fullWidth size="lg" onClick={handleStartDrill} className="shadow-xl">
                        Start Drill <Play className="ml-2" size={20} fill="currentColor"/>
                    </Button>
                </div>
            </div>
        );
    }

    if (viewState === 'COUNTDOWN') {
        return (
            <div className="fixed inset-0 bg-brand-primary z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="text-[12rem] font-black text-white animate-bounce leading-none">
                    {countDownValue}
                </div>
                <div className="text-brand-secondary/50 font-bold text-2xl mt-8 uppercase tracking-widest animate-pulse">
                   Get Ready
                </div>
            </div>
        );
    }

    if (viewState === 'ACTIVE' && drill) {
        return (
            <div className="h-[100dvh] bg-brand-dark flex flex-col items-center justify-center relative">
                <div className="absolute inset-0 z-0 opacity-20">
                     {drill.visualUrl && <img src={drill.visualUrl} className="w-full h-full object-cover" alt="" />}
                </div>
                
                <div className="z-10 flex flex-col items-center w-full max-w-md p-6">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">{drill.name}</h2>
                    
                    <div className="w-64 h-64 rounded-full border-8 border-brand-primary flex items-center justify-center bg-brand-surface shadow-2xl mb-12 relative">
                        <div className="text-6xl font-mono font-bold text-slate-900 tabular-nums tracking-tighter">
                            {formatTime(timeLeft)}
                        </div>
                        {isTimerRunning && <div className="absolute inset-0 rounded-full border-4 border-brand-primary animate-ping opacity-20"></div>}
                    </div>

                    <div className="flex gap-6 mb-8">
                         <button onClick={() => setIsTimerRunning(prev => !prev)} className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white hover:bg-slate-700 transition-colors">
                             {isTimerRunning ? <Pause size={28} fill="currentColor"/> : <Play size={28} fill="currentColor"/>}
                         </button>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 bg-brand-surface border-t border-slate-800 z-50 pb-safe">
                    <Button fullWidth size="lg" onClick={handleFinishDrill} variant="primary">
                        Finish Drill <CheckCircle className="ml-2" size={20}/>
                    </Button>
                </div>
            </div>
        );
    }

    if (viewState === 'FEEDBACK' && drill) {
        return (
            <div className="min-h-screen bg-brand-dark p-6 flex flex-col justify-center items-center text-center animate-in zoom-in duration-300">
                <h2 className="text-3xl font-bold text-white mb-2">Drill Complete!</h2>
                <p className="text-slate-400 mb-8">How did you do on the "{drill.name}"?</p>
                
                {drill.successCriteria && (
                    <div className="w-full max-w-sm mb-8">
                        <label className="block text-sm font-bold text-slate-400 mb-2">{drill.successCriteria.prompt} (Target: {drill.successCriteria.target})</label>
                        <input 
                            type="number"
                            value={achievedValue}
                            onChange={e => setAchievedValue(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-2xl text-center font-bold"
                            placeholder="0"
                        />
                    </div>
                )}

                <div className="w-full max-w-sm space-y-4">
                     <Button fullWidth size="lg" onClick={() => handleSubmitDrillFeedback('success')} variant="primary" className="bg-brand-success hover:bg-green-700">
                        Nailed It! 👍
                    </Button>
                    <Button fullWidth size="lg" onClick={() => handleSubmitDrillFeedback('fail')} variant="danger">
                        Needs Work 👎
                    </Button>
                </div>
            </div>
        );
    }

    if (viewState === 'SUMMARY') {
        return (
            <div className="min-h-screen bg-brand-dark p-6 flex flex-col justify-center items-center text-center animate-in slide-in-from-right duration-300">
                 <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6">
                     <Check className="text-white w-10 h-10" strokeWidth={4} />
                 </div>
                 <h1 className="text-3xl font-bold text-white mb-2">Session Complete!</h1>
                 <p className="text-slate-400 mb-8">Great work today.</p>
                 
                 <div className="w-full max-w-sm space-y-6">
                     <div>
                         <label className="block text-sm font-bold text-slate-400 mb-2">Effort Level (RPE) - {rpe}</label>
                         <input type="range" min="1" max="10" value={rpe} onChange={e => setRpe(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                         <div className="flex justify-between text-xs text-slate-500 mt-1">
                             <span>Easy</span>
                             <span>Max Effort</span>
                         </div>
                     </div>
                     <div>
                         <label className="block text-sm font-bold text-slate-400 mb-2">Notes</label>
                         <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" placeholder="How did it feel?" />
                     </div>
                     <Button fullWidth size="lg" onClick={handleFinishSession}>Save Session</Button>
                 </div>
            </div>
        );
    }

    return <div>Loading...</div>;
};

export default SessionView;