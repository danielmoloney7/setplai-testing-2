
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SessionLog, ProgramItem, Drill } from '../../types';
import { ChevronLeft, Clock, TrendingUp, Flame, Heart, MessageSquare, ThumbsUp, X, Target } from 'lucide-react';

const SessionLogDetailView: React.FC<{
    users: any[];
    programs: any[];
    sessions: SessionLog[];
    drills: Drill[];
}> = ({ users, programs, sessions, drills }) => {
    const navigate = useNavigate();
    const { logId } = useParams<{ logId: string }>();

    const log = sessions.find(s => s.id === logId);

    if (!log) {
        return (
            <div className="p-6 text-slate-900">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 mb-4"><ChevronLeft size={16} /> Back</button>
                Session log not found.
            </div>
        );
    }

    const player = users.find(u => u.id === log.playerId);
    const program = programs.find(p => p.id === log.programId);
    const sessionDetails = program?.sessions.find(s => s.id === log.sessionId);

    const DrillPerformanceCard = ({ item }: { item: ProgramItem }) => {
        const drill = drills.find(d => d.id === item.drillId);
        const performance = log.drillPerformance.find(p => p.drillId === item.drillId);

        if (!drill) return null;

        const isSuccess = performance?.outcome === 'success';
        const hasCriteria = drill.successCriteria;
        const hasPerformanceData = hasCriteria && performance?.achieved !== undefined;

        return (
            <div className={`p-4 rounded-xl border ${isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-slate-800">{drill.name}</h4>
                        <p className="text-xs text-slate-500">{drill.category}</p>
                    </div>
                    {performance ? (
                        isSuccess ? 
                        <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            <ThumbsUp size={14} /> Nailed It
                        </div> :
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                            <X size={14} /> Needs Work
                        </div>
                    ) : null}
                </div>

                {hasPerformanceData && (
                    <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-4">
                        <Target size={20} className="text-slate-500 flex-shrink-0"/>
                        <div>
                            <p className="text-xs text-slate-500">Target: {hasCriteria.target} {hasCriteria.type}</p>
                            <p className="text-sm font-bold text-slate-800">Achieved: {performance.achieved} {hasCriteria.type}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-brand-dark p-6 pb-24">
            <header className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)}><ChevronLeft className="text-slate-900" /></button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900">{sessionDetails?.title || 'Session Log'}</h1>
                    <p className="text-sm text-slate-500">Completed on {new Date(log.dateCompleted).toLocaleDateString()}</p>
                </div>
            </header>

            <div className="space-y-6">
                {player && (
                    <div className="bg-brand-surface p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                        <img src={player.avatar} alt={player.name} className="w-12 h-12 rounded-full" />
                        <div>
                            <p className="text-sm text-slate-500">Player</p>
                            <h2 className="font-bold text-lg text-slate-900">{player.name}</h2>
                        </div>
                    </div>
                )}
                
                <div className="bg-brand-surface p-4 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-sm uppercase text-slate-400 mb-3">Session Stats</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <Clock size={20} className="mx-auto text-slate-500 mb-1"/>
                            <p className="font-bold text-slate-900">{log.durationMin} <span className="text-xs text-slate-500">min</span></p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <TrendingUp size={20} className="mx-auto text-slate-500 mb-1"/>
                            <p className="font-bold text-slate-900">{log.rpe}<span className="text-xs text-slate-500">/10 RPE</span></p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <Flame size={20} className="mx-auto text-slate-500 mb-1"/>
                            <p className="font-bold text-slate-900">{log.caloriesBurned || 'N/A'}<span className="text-xs text-slate-500"> cal</span></p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <Heart size={20} className="mx-auto text-slate-500 mb-1"/>
                            <p className="font-bold text-slate-900">{log.avgHeartRate || 'N/A'}<span className="text-xs text-slate-500"> bpm</span></p>
                        </div>
                    </div>
                </div>

                {log.notes && (
                    <div className="bg-brand-surface p-4 rounded-xl border border-slate-200">
                         <h3 className="font-bold text-sm uppercase text-slate-400 mb-2 flex items-center gap-2"><MessageSquare size={14}/> Player Notes</h3>
                         <p className="text-slate-600 italic bg-slate-50 p-3 rounded-md border border-slate-100">"{log.notes}"</p>
                    </div>
                )}

                <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-3">Drill Performance</h3>
                    <div className="space-y-3">
                        {sessionDetails?.items.map((item, index) => (
                            <DrillPerformanceCard key={index} item={item} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default SessionLogDetailView;
