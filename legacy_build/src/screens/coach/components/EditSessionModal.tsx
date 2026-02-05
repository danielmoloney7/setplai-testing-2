import React, { useState } from 'react';
import { ProgramSession, Squad } from '../../../types';
import { Button } from '../../../components/Button';
import { Wand2 } from 'lucide-react';
import { generateAIProgram } from '../../../services/geminiService';
import { MOCK_DRILLS } from '../../../constants';

export const EditSessionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    session: ProgramSession;
    squad: Squad;
    onSave: (newSession: ProgramSession) => void;
}> = ({ isOpen, onClose, session, squad, onSave }) => {
    const [players, setPlayers] = useState(squad.memberIds.length);
    const [courts, setCourts] = useState(1);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegenerate = async () => {
        setIsLoading(true);
        const result = await generateAIProgram(
            prompt || `Regenerate drills for ${session.title}`,
            MOCK_DRILLS,
            { id: squad.coachId, name: 'Coach' },
            [],
            undefined,
            false,
            undefined,
            true, // single session
            { players, courts }
        );
        setIsLoading(false);
        if (result && result.sessions && result.sessions.length > 0) {
            onSave(result.sessions[0]);
        } else {
            alert("Failed to generate new session.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={onClose}>
            <div className="bg-brand-surface w-full max-w-md rounded-2xl p-6 border border-slate-700" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4 text-slate-900">Adapt Session: {session.title}</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Players</label>
                            <input type="number" value={players} onChange={e => setPlayers(parseInt(e.target.value) || 0)} className="w-full p-2 rounded-lg bg-slate-100 border border-slate-300" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Courts</label>
                            <input type="number" value={courts} onChange={e => setCourts(parseInt(e.target.value) || 0)} className="w-full p-2 rounded-lg bg-slate-100 border border-slate-300" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">New Focus (Optional)</label>
                        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., Focus more on defensive drills..." className="w-full h-24 p-2 rounded-lg bg-slate-100 border border-slate-300"></textarea>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                        <Button onClick={handleRegenerate} isLoading={isLoading} disabled={isLoading} className="flex-1">
                            <Wand2 size={16} className="mr-2"/> Adapt with AI
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}