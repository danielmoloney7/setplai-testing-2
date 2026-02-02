import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, SessionLog, ConsultationLog } from '../../types';
import { Button } from '../../components/Button';
import { FeedCard } from '../common/FeedCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { BrainCircuit, Shield, Activity, RefreshCw, Grid, Star, Flame } from 'lucide-react';

const PlayerProgressView: React.FC<{ user: User; sessions: SessionLog[]; consultationLogs: ConsultationLog[] }> = ({ user, sessions, consultationLogs }) => {
    const navigate = useNavigate();
    const [showHistory, setShowHistory] = useState(false);
    const mySessions = sessions.filter(s => s.playerId === user.id);

    const hasCompletedSession = mySessions.length > 0;
    const hasCompletedAssessment = consultationLogs.length > 0;
    const canShowGamestyle = hasCompletedSession || hasCompletedAssessment;

    const data = mySessions.slice(-7).map(s => ({
        date: new Date(s.dateCompleted).toLocaleDateString(undefined, {weekday: 'short'}),
        duration: s.durationMin
    }));

    const baseScore = user.level === 'Advanced' ? 80 : user.level === 'Intermediate' ? 60 : 40;
    const skillsData = [
      { subject: 'Serve', A: baseScore + Math.floor(Math.random() * 10), fullMark: 100 },
      { subject: 'Forehand', A: baseScore + 10, fullMark: 100 },
      { subject: 'Backhand', A: baseScore - 5, fullMark: 100 },
      { subject: 'Volley', A: baseScore - 10, fullMark: 100 },
      { subject: 'Physical', A: baseScore + 5, fullMark: 100 },
      { subject: 'Mental', A: baseScore, fullMark: 100 },
    ];

    const myConsultations = consultationLogs.filter(c => c.playerId === user.id).sort((a,b) => new Date(a.dateCompleted).getTime() - new Date(b.dateCompleted).getTime());

    const consultationChartData = myConsultations.map(c => ({
        date: new Date(c.dateCompleted).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        score: c.totalScore,
    }));

    const getGamestyle = () => {
        const serveVolley = (skillsData.find(s => s.subject === 'Serve')?.A || 0) + (skillsData.find(s => s.subject === 'Volley')?.A || 0);
        const baseline = (skillsData.find(s => s.subject === 'Forehand')?.A || 0) + (skillsData.find(s => s.subject === 'Backhand')?.A || 0);
        const physical = (skillsData.find(s => s.subject === 'Physical')?.A || 0);

        if (serveVolley > baseline && serveVolley > physical * 1.8) {
            return {
                name: 'Serve & Volleyer',
                icon: Shield,
                description: 'You excel at the net, using your powerful serve to set up winning volleys. Your aggressive, forward-moving game keeps opponents on their back foot.'
            };
        }
        if (baseline > serveVolley && baseline > physical * 1.8) {
             return {
                name: 'Aggressive Basliner',
                icon: Activity,
                description: 'Your strength lies in powerful groundstrokes from the back of the court. You dictate points with your forehand and backhand, looking for opportunities to hit winners.'
            };
        }
        if (physical > 85) {
            return {
                name: 'Counter-Puncher',
                icon: RefreshCw,
                description: 'With excellent speed and court coverage, you turn defense into offense. You frustrate opponents by getting every ball back and waiting for the perfect moment to strike.'
            };
        }
        return {
            name: 'All-Court Player',
            icon: Grid,
            description: 'You have a well-rounded game with no major weaknesses. You are comfortable at the baseline and the net, adapting your strategy to exploit your opponent\'s game.'
        };
    };

    const gamestyle = getGamestyle();

    return (
        <div className="p-6 pb-24 space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">Your Progress</h1>

            {canShowGamestyle ? (
                <div className="bg-brand-surface p-6 rounded-2xl border border-slate-200">
                    <h3 className="font-bold mb-4 text-sm uppercase text-slate-400 flex items-center gap-2"><BrainCircuit size={16}/> Gamestyle Analysis</h3>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                            <gamestyle.icon size={32} />
                        </div>
                        <div>
                            <h4 className="font-bold text-xl text-brand-primary">{gamestyle.name}</h4>
                            <p className="text-sm text-slate-500 mt-1">{gamestyle.description}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-brand-surface p-6 rounded-2xl border border-slate-200">
                    <h3 className="font-bold mb-2 text-sm uppercase text-slate-400 flex items-center gap-2"><BrainCircuit size={16}/> Gamestyle Analysis</h3>
                    <p className="text-sm text-slate-500 mb-4">Complete your first session or take a skills assessment to unlock your gamestyle profile.</p>
                    <Button size="sm" onClick={() => navigate('/consultation')}>Take Assessment</Button>
                </div>
            )}
            
             <div className="bg-brand-surface p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-sm uppercase text-slate-400">Assessment History</h3>
                     {myConsultations.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
                            {showHistory ? 'Hide' : 'View'}
                        </Button>
                     )}
                 </div>
                 {showHistory && myConsultations.length > 0 && (
                    <div className="h-48 w-full animate-in fade-in">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={consultationChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a'}}
                                    itemStyle={{color: '#15803D'}}
                                />
                                <Line type="monotone" dataKey="score" name="Total Score" stroke="#15803D" strokeWidth={3} dot={{r: 4, fill: '#15803D'}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                 )}
                 {myConsultations.length === 0 ? (
                    <div className="text-center py-6">
                        <p className="text-slate-500 mb-4">No assessments taken yet.</p>
                        <Button onClick={() => navigate('/consultation')}>Take First Assessment</Button>
                    </div>
                 ) : !showHistory ? (
                    <div className="text-center py-4">
                        <p className="text-sm text-slate-500">You've completed {myConsultations.length} assessment{myConsultations.length > 1 ? 's' : ''}.</p>
                        <p className="text-sm text-slate-500">Your last score was <span className="font-bold text-brand-primary">{myConsultations[myConsultations.length - 1].totalScore}</span>.</p>
                    </div>
                 ) : null}
            </div>

            {myConsultations.length > 0 && (
                <div className="bg-brand-surface p-6 rounded-2xl border border-slate-200 text-center">
                    <h3 className="font-bold text-lg text-slate-900 mb-2">Track Your Growth</h3>
                    <p className="text-sm text-slate-500 mb-4">Completed a program? Retake the assessment to see how much you've improved.</p>
                    <Button onClick={() => navigate('/consultation')} variant="secondary">
                        Retake Assessment
                    </Button>
                </div>
            )}

            <div className="bg-brand-surface p-4 rounded-2xl border border-slate-200">
                 <h3 className="font-bold mb-4 text-sm uppercase text-slate-400">Skills Breakdown</h3>
                 <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={skillsData}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar
                                name="Skills"
                                dataKey="A"
                                stroke="#15803D"
                                strokeWidth={2}
                                fill="#15803D"
                                fillOpacity={0.3}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                 </div>
            </div>

            <div className="bg-brand-surface p-4 rounded-2xl border border-slate-200">
                <h3 className="font-bold mb-4 text-sm uppercase text-slate-400">Activity (Last 7 Sessions)</h3>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a'}}
                                itemStyle={{color: '#15803D'}}
                            />
                            <Line type="monotone" dataKey="duration" stroke="#15803D" strokeWidth={3} dot={{r: 4, fill: '#15803D'}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-surface p-4 rounded-xl border border-slate-200">
                     <div className="text-2xl font-bold text-slate-900 mb-1">{user.xp || 0}</div>
                     <div className="text-xs text-slate-400 uppercase font-bold">Total XP</div>
                </div>
                 <div className="bg-brand-surface p-4 rounded-xl border border-slate-200">
                     <div className="text-2xl font-bold text-slate-900 mb-1">{mySessions.length}</div>
                     <div className="text-xs text-slate-400 uppercase font-bold">Sessions Completed</div>
                </div>
            </div>

            <section>
                <h3 className="font-bold mb-4 text-xl">History</h3>
                <div className="space-y-4">
                     {mySessions.sort((a,b) => new Date(b.dateCompleted).getTime() - new Date(a.dateCompleted).getTime()).map(s => (
                         <FeedCard key={s.id} session={s} user={user} />
                     ))}
                </div>
            </section>
        </div>
    );
};

export default PlayerProgressView;