import React from 'react';
import { SessionLog, User } from '../../types';
import { Button } from '../../components/Button';
import { Clock, TrendingUp, Flame, Heart, Share2 } from 'lucide-react';

export const ShareCardModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    session: SessionLog;
    user?: User;
    programName?: string;
}> = ({ isOpen, onClose, session, user, programName }) => {
    if (!isOpen) return null;

    const handleShare = async () => {
        let shareText = `Just crushed a tennis session with setplai!\n\n`;
        if (programName) {
            shareText += `🎾 ${programName}\n`;
        }
        shareText += `\n✨ Highlights:\n`;
        shareText += `- ⏰ Duration: ${session.durationMin} minutes\n`;
        shareText += `- 💪 Effort: ${session.rpe}/10 RPE\n`;
        if (session.caloriesBurned) {
            shareText += `- 🔥 Calories: ${session.caloriesBurned} kcal\n`;
        }
        if (session.avgHeartRate) {
            shareText += `- ❤️ Avg HR: ${session.avgHeartRate} bpm\n`;
        }
        shareText += `\n#setplai #TennisTraining #Progress`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `My ${programName || 'Tennis'} Session on setplai`,
                    text: shareText,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                alert('Session details copied to clipboard!');
            }, (err) => {
                alert('Could not copy text. Please copy it manually.');
                console.error('Could not copy text: ', err);
            });
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-slate-900 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4 text-center">Share Your Session</h3>
                
                <div id="share-card" className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200 mb-6 shadow-inner">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
                         <img src={user?.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow" alt={user?.name} />
                         <div>
                             <p className="font-bold text-slate-800">{user?.name}</p>
                             <p className="text-xs text-slate-500">just completed a session on <span className="font-bold text-brand-primary">setplai</span></p>
                         </div>
                    </div>
                    
                    {programName && <h4 className="font-bold text-lg text-brand-primary mb-3 text-center">{programName}</h4>}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-2">
                           <Clock size={20} className="text-brand-secondary"/>
                           <div>
                               <div className="text-xs text-slate-500">Duration</div>
                               <div className="font-bold">{session.durationMin} min</div>
                           </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-2">
                           <TrendingUp size={20} className="text-brand-secondary"/>
                            <div>
                               <div className="text-xs text-slate-500">Effort (RPE)</div>
                               <div className="font-bold">{session.rpe}/10</div>
                           </div>
                        </div>
                        {session.caloriesBurned && (
                            <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-2">
                               <Flame size={20} className="text-brand-secondary"/>
                               <div>
                                   <div className="text-xs text-slate-500">Calories</div>
                                   <div className="font-bold">{session.caloriesBurned} kcal</div>
                               </div>
                            </div>
                        )}
                        {session.avgHeartRate && (
                           <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-2">
                               <Heart size={20} className="text-brand-secondary"/>
                               <div>
                                   <div className="text-xs text-slate-500">Avg. Heart Rate</div>
                                   <div className="font-bold">{session.avgHeartRate} bpm</div>
                               </div>
                            </div>
                        )}
                    </div>
                </div>

                <Button fullWidth onClick={handleShare} size="lg">
                    <Share2 size={16} className="mr-2"/>
                    Share Now
                </Button>
            </div>
        </div>
    );
};