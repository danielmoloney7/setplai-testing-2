import React, { useState, useEffect } from 'react';
import { ProgramItem } from '../../../types';
import { Button } from '../../../components/Button';

export const DrillConfigModal: React.FC<{ isOpen: boolean, onClose: () => void, item?: ProgramItem, onSave: (item: ProgramItem) => void }> = ({isOpen, onClose, item, onSave}) => {
    const [config, setConfig] = useState<ProgramItem | null>(null);
    useEffect(() => { if (item) setConfig(item); }, [item]);

    if (!isOpen || !config) return null;
    
    const updateField = (field: keyof ProgramItem, value: any) => {
        if (!config) return;
        const newConfig = {...config};
        if (field === 'targetDurationMin' || field === 'sets' || field === 'reps') {
            (newConfig[field] as number) = parseInt(value, 10) || 0;
        } else {
            (newConfig[field] as string) = value;
        }
        setConfig(newConfig);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-brand-surface w-full max-w-sm rounded-2xl p-6 border border-slate-700" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-white mb-4">Configure Drill</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase font-bold text-slate-400">Duration (min)</label>
                        <input type="number" value={config.targetDurationMin} onChange={e => updateField('targetDurationMin', e.target.value)} className="w-full p-2 mt-1 rounded-lg bg-slate-800 border border-slate-700 text-white"/>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs uppercase font-bold text-slate-400">Sets</label>
                            <input type="number" value={config.sets || ''} onChange={e => updateField('sets', e.target.value)} className="w-full p-2 mt-1 rounded-lg bg-slate-800 border border-slate-700 text-white"/>
                        </div>
                        <div>
                            <label className="block text-xs uppercase font-bold text-slate-400">Reps</label>
                            <input type="number" value={config.reps || ''} onChange={e => updateField('reps', e.target.value)} className="w-full p-2 mt-1 rounded-lg bg-slate-800 border border-slate-700 text-white"/>
                        </div>
                    </div>
                     <div>
                        <label className="block text-xs uppercase font-bold text-slate-400">Mode</label>
                        <select value={config.mode} onChange={e => updateField('mode', e.target.value)} className="w-full p-2 mt-1 rounded-lg bg-slate-800 border border-slate-700 text-white">
                            <option value="Cooperative">Cooperative</option>
                            <option value="Competitive">Competitive</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs uppercase font-bold text-slate-400">Coach Notes</label>
                        <textarea value={config.notes} onChange={e => updateField('notes', e.target.value)} className="w-full p-2 mt-1 rounded-lg bg-slate-800 border border-slate-700 text-white" />
                    </div>
                    <Button fullWidth onClick={() => onSave(config)}>Save Changes</Button>
                </div>
            </div>
        </div>
    );
};
