import React, { useState, useEffect } from 'react';
import { User } from '../../../types';
import { Button } from '../../../components/Button';
import { Check } from 'lucide-react';

export const SquadModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (name: string, members: string[], level: string) => void; 
    users: User[]; 
    initialName?: string;
    initialMembers?: string[];
    initialLevel?: string;
    title: string;
}> = ({ isOpen, onClose, onSave, users, initialName, initialMembers, initialLevel, title }) => {
    const [name, setName] = useState(initialName || '');
    const [level, setLevel] = useState(initialLevel || 'Intermediate');
    const [selectedMembers, setSelectedMembers] = useState<string[]>(initialMembers || []);

    useEffect(() => {
        if (isOpen) {
            setName(initialName || '');
            setLevel(initialLevel || 'Intermediate');
            setSelectedMembers(initialMembers || []);
        }
    }, [isOpen, initialName, initialMembers, initialLevel]);

    if (!isOpen) return null;

    const toggleMember = (id: string) => {
        setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={onClose}>
            <div className="bg-brand-surface w-full max-w-sm rounded-2xl p-6 border border-slate-700" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">{title}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Squad Name</label>
                        <input className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Elite Juniors" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Level</label>
                        <select className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white" value={level} onChange={e => setLevel(e.target.value)}>
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Select Athletes</label>
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                            {users.map(u => (
                                <div key={u.id} onClick={() => toggleMember(u.id)} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${selectedMembers.includes(u.id) ? 'bg-brand-primary/10 border-brand-primary' : 'bg-slate-800 border-slate-700'}`}>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedMembers.includes(u.id) ? 'bg-brand-primary border-brand-primary' : 'border-slate-500'}`}>
                                        {selectedMembers.includes(u.id) && <Check size={14} className="text-white"/>}
                                    </div>
                                    <span className="text-sm font-bold text-white">{u.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Button fullWidth onClick={() => { onSave(name, selectedMembers, level); onClose(); }} disabled={!name}>Save Squad</Button>
                </div>
            </div>
        </div>
    );
};