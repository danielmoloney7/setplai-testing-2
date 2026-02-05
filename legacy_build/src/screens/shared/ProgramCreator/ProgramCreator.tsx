

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole, Squad, Drill, Program, ProgramConfig, ProgramItem, ProgramSession } from '../../../types';
import { Button } from '../../../components/Button';
import { generateAIProgram } from '../../../services/geminiService';
import { PREMADE_PROGRAMS } from '../../../constants';
import { ChevronLeft, Plus, Users, Check, Wand2, Layers, ClipboardEdit, Trash2, Edit } from 'lucide-react';
import { DrillPickerModal } from './DrillPickerModal';
import { DrillCard } from '../../common/DrillCard';
import { DrillConfigModal } from './DrillConfigModal';


const ProgramCreator: React.FC<{
    user: User;
    users: User[];
    squads: Squad[];
    drills: Drill[];
    onSave: (p: Partial<Program>, recipients: string[], isSquadProgram: boolean) => void;
    programs: Program[];
}> = ({ user, users, squads, drills, onSave, programs }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // --- SHARED STATE ---
    const [isGenerating, setIsGenerating] = useState(false);
    const [programForEditing, setProgramForEditing] = useState<Partial<Program> | null>(null);
    const [prompt, setPrompt] = useState(location.state?.prompt || '');
    
    // --- PLAYER-SPECIFIC STATE ---
    const [playerStep, setPlayerStep] = useState<'SELECT' | 'AI_INPUT' | 'PREMADE_LIST' | 'VIEW_PLAN'>(location.state?.prompt ? 'AI_INPUT' : 'SELECT');
    const [aiDuration, setAiDuration] = useState(4);

    // --- COACH-SPECIFIC STATE ---
    const [coachStep, setCoachStep] = useState<'ASSIGN_TARGETS' | 'SELECT_METHOD' | 'AI_INPUT' | 'BUILDER'>(location.state?.targetIds ? 'SELECT_METHOD' : 'ASSIGN_TARGETS');
    const [creationMode, setCreationMode] = useState<'AI' | 'MANUAL' | null>(null);
    const [targetIds, setTargetIds] = useState<string[]>(location.state?.targetIds || []);
    const [numPlayers, setNumPlayers] = useState(4);
    const [numCourts, setNumCourts] = useState(1);

    const [isDrillPickerOpen, setIsDrillPickerOpen] = useState(false);
    const [activeSessionIndexForDrillAdd, setActiveSessionIndexForDrillAdd] = useState<number | null>(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<{ sessionIndex: number, itemIndex: number, item: ProgramItem } | null>(null);

    const isSquadContext = location.state?.squad;
    
    const handleGenerate = async () => {
        setIsGenerating(true);
        const programConfig: ProgramConfig = { weeks: aiDuration, frequencyPerWeek: 1 };
        const constraints = user.role === UserRole.COACH && isSquadContext ? { players: numPlayers, courts: numCourts } : undefined;
        const isSingleSession = false;

        const program = await generateAIProgram(prompt, drills, { id: user.id, name: user.name, level: user.level, goals: user.goals }, [], programConfig, false, undefined, isSingleSession, constraints);
        
        if (program) {
            setProgramForEditing(program);
            if(user.role === UserRole.PLAYER) {
                setPlayerStep('VIEW_PLAN');
            } else {
                setCoachStep('BUILDER');
            }
        } else {
            alert("Sorry, the AI coach couldn't generate a program. Please try again.");
        }
        setIsGenerating(false);
    };

    const handleSave = () => {
        if (programForEditing) {
            onSave(programForEditing, targetIds, !!isSquadContext);
            if (user.role === UserRole.PLAYER) {
                navigate('/');
            } else {
                navigate(squads.some(s => targetIds.includes(s.id)) ? `/squad/${targetIds[0]}` : '/programs');
            }
        }
    };

    const handleBack = () => {
        if (user.role === UserRole.PLAYER) {
           navigate(-1); return;
        }

        switch (coachStep) {
            case 'BUILDER':
                setCoachStep('SELECT_METHOD');
                setProgramForEditing(null);
                break;
            case 'AI_INPUT':
                setCoachStep('SELECT_METHOD');
                break;
            case 'SELECT_METHOD':
                if (location.state?.targetIds) navigate(-1);
                else setCoachStep('ASSIGN_TARGETS'); 
                break;
            case 'ASSIGN_TARGETS':
                navigate(-1); break;
            default: navigate(-1);
        }
    };
    
    // --- Program editing handlers ---
    const handleProgramMetaChange = (field: 'title' | 'description', value: string) => {
        setProgramForEditing(p => p ? { ...p, [field]: value } : null);
    };
    
    const handleAddSession = () => {
        const newSession: ProgramSession = {
            id: `s_${Date.now()}`,
            title: `Session ${ (programForEditing?.sessions?.length || 0) + 1 }`,
            items: [],
            completed: false
        };
        setProgramForEditing(p => p ? { ...p, sessions: [...(p.sessions || []), newSession] } : null);
    };
    
    const handleRemoveSession = (sessionIndex: number) => {
        if (!programForEditing?.sessions) return;
        if (window.confirm("Are you sure you want to delete this session?")) {
            const newSessions = [...programForEditing.sessions];
            newSessions.splice(sessionIndex, 1);
            setProgramForEditing(p => ({ ...p, sessions: newSessions }));
        }
    };
    
    const handleAddDrillToSession = (drill: Drill) => {
        if (activeSessionIndexForDrillAdd === null || !programForEditing?.sessions) return;
        const newItem: ProgramItem = {
            drillId: drill.id,
            targetDurationMin: drill.defaultDurationMin,
            notes: '',
            mode: 'Cooperative'
        };
        const newSessions = [...programForEditing.sessions];
        newSessions[activeSessionIndexForDrillAdd].items.push(newItem);
        setProgramForEditing(p => ({ ...p, sessions: newSessions }));
        setIsDrillPickerOpen(false);
        setActiveSessionIndexForDrillAdd(null);
    };
    
    const handleRemoveDrill = (sessionIndex: number, itemIndex: number) => {
        if (!programForEditing?.sessions) return;
        const newSessions = [...programForEditing.sessions];
        newSessions[sessionIndex].items.splice(itemIndex, 1);
        setProgramForEditing(p => ({...p, sessions: newSessions}));
    };
    
    const handleUpdateDrillConfig = (item: ProgramItem) => {
        if (!editingItem || !programForEditing?.sessions) return;
        const { sessionIndex, itemIndex } = editingItem;
        const newSessions = [...programForEditing.sessions];
        newSessions[sessionIndex].items[itemIndex] = item;
        setProgramForEditing(p => ({...p, sessions: newSessions}));
        setIsConfigModalOpen(false);
        setEditingItem(null);
    };

    const renderHeader = () => (
        <header className="p-4 flex items-center gap-4 border-b border-slate-200 sticky top-0 bg-brand-dark z-20">
            <button onClick={handleBack}><ChevronLeft className="text-slate-900"/></button>
            <h1 className="text-xl font-bold text-slate-900">Create Program</h1>
            {(coachStep === 'BUILDER' || playerStep === 'VIEW_PLAN') &&
                <div className="ml-auto"><Button size="sm" onClick={handleSave} disabled={!programForEditing?.title}>Save Program</Button></div>
            }
        </header>
    );

    const renderPlayerFlow = () => {
        if (isGenerating) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <Wand2 size={48} className="text-brand-primary animate-pulse mb-4" />
                    <h2 className="text-xl font-bold text-slate-900">Generating Program...</h2>
                    <p className="text-slate-500">Our AI coach is building a plan...</p>
                </div>
            );
        }
        
        if (playerStep === 'VIEW_PLAN' && programForEditing) {
             return (
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">{programForEditing.title}</h2>
                        <p className="text-slate-500">{programForEditing.description}</p>
                    </div>
                    
                    <div className="space-y-4">
                        {programForEditing.sessions?.map((session, sIdx) => (
                            <div key={session.id || sIdx} className="bg-brand-surface p-4 rounded-xl border border-slate-200">
                                <h3 className="font-bold text-slate-900 mb-2">{session.title}</h3>
                                <div className="space-y-3">
                                    {session.items.map((item, iIdx) => {
                                        const drill = drills.find(d => d.id === item.drillId);
                                        if (!drill) return null;
                                        return ( <DrillCard key={`${sIdx}-${iIdx}`} drill={drill} programItem={item} /> );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
               </div>
            );
        }

        switch (playerStep) {
            case 'SELECT':
                return (
                     <div className="p-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Create a New Plan</h2>
                        <div className="space-y-4">
                            <div onClick={() => setPlayerStep('AI_INPUT')} className="bg-brand-surface p-6 rounded-2xl border-2 border-slate-200 cursor-pointer hover:border-brand-primary">
                                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4"><Wand2 size={24}/></div>
                                <h3 className="font-bold text-lg text-slate-900">AI Generator</h3>
                                <p className="text-sm text-slate-500">Describe your goals and let Setplai build a custom plan.</p>
                            </div>
                            <div onClick={() => setPlayerStep('PREMADE_LIST')} className="bg-brand-surface p-6 rounded-2xl border-2 border-slate-200 cursor-pointer hover:border-brand-primary">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4"><Layers size={24}/></div>
                                <h3 className="font-bold text-lg text-slate-900">From Library</h3>
                                <p className="text-sm text-slate-500">Choose from pre-made programs designed by experts.</p>
                            </div>
                        </div>
                    </div>
                );
            case 'AI_INPUT':
                return (
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">AI Program Generator</h2>
                        <p className="text-slate-500 mb-6">What would you like to work on?</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-1">Prompt</label>
                                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g. 'A 4-week program to improve my backhand slice and net game'" className="w-full h-32 p-3 bg-brand-surface border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-brand-primary focus:border-brand-primary"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-1">Duration (weeks)</label>
                                <input type="number" value={aiDuration} onChange={e => setAiDuration(parseInt(e.target.value))} className="w-full p-3 bg-brand-surface border border-slate-200 rounded-lg text-sm text-slate-900"/>
                            </div>
                            <Button fullWidth size="lg" onClick={handleGenerate} disabled={!prompt || isGenerating} isLoading={isGenerating}>Generate Plan</Button>
                        </div>
                    </div>
                );
            case 'PREMADE_LIST':
                 return (
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Program Library</h2>
                        <div className="space-y-4">
                            {PREMADE_PROGRAMS.map((p, i) => (
                                <div key={i} className="bg-brand-surface p-4 rounded-xl border border-slate-200">
                                    <h3 className="font-bold text-lg text-slate-900">{p.title}</h3>
                                    <p className="text-sm text-slate-500 mb-4">{p.description}</p>
                                    <Button fullWidth variant="secondary" onClick={() => { onSave(p, [user.id], false); navigate('/'); }}>Add to My Plans</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    const renderAssignTargets = () => {
        const myPlayers = users.filter(u => user.linkedPlayerIds?.includes(u.id));
        const mySquads = squads.filter(s => s.coachId === user.id);

        const toggleTarget = (id: string) => {
            setTargetIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
        };

        return (
            <div className="p-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Assign Program To...</h2>
                <div className="space-y-4">
                    <h3 className="font-bold text-sm uppercase text-slate-400">Squads</h3>
                    {mySquads.map(s => (
                        <div key={s.id} onClick={() => toggleTarget(s.id)} className={`p-4 rounded-xl border-2 flex items-center gap-4 cursor-pointer ${targetIds.includes(s.id) ? 'border-brand-primary bg-brand-primary/10' : 'border-slate-200 bg-brand-surface'}`}>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${targetIds.includes(s.id) ? 'bg-brand-primary border-brand-primary' : 'border-slate-300'}`}>
                                {targetIds.includes(s.id) && <Check size={16} className="text-white"/>}
                            </div>
                            <div>
                                <div className="font-bold text-slate-900">{s.name}</div>
                                <div className="text-xs text-slate-500">{s.memberIds.length} members</div>
                            </div>
                        </div>
                    ))}
                    {!isSquadContext && (
                        <>
                            <h3 className="font-bold text-sm uppercase text-slate-400 pt-4">Individual Players</h3>
                            {myPlayers.map(p => (
                                <div key={p.id} onClick={() => toggleTarget(p.id)} className={`p-4 rounded-xl border-2 flex items-center gap-4 cursor-pointer ${targetIds.includes(p.id) ? 'border-brand-primary bg-brand-primary/10' : 'border-slate-200 bg-brand-surface'}`}>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${targetIds.includes(p.id) ? 'bg-brand-primary border-brand-primary' : 'border-slate-300'}`}>
                                        {targetIds.includes(p.id) && <Check size={16} className="text-white"/>}
                                    </div>
                                    <img src={p.avatar} className="w-10 h-10 rounded-full" alt={p.name} />
                                    <div>
                                        <div className="font-bold text-slate-900">{p.name}</div>
                                        <div className="text-xs text-slate-500">{p.level}</div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
                <div className="mt-8 sticky bottom-0 py-4 bg-brand-dark">
                     <Button fullWidth size="lg" disabled={targetIds.length === 0} onClick={() => setCoachStep('SELECT_METHOD')}>
                         Next
                     </Button>
                </div>
            </div>
        );
    };

    const renderSelectMethod = () => (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">How to Create?</h2>
            <div className="space-y-4">
                <div onClick={() => { setCreationMode('AI'); setCoachStep('AI_INPUT'); }} className="bg-brand-surface p-6 rounded-2xl border-2 border-slate-200 cursor-pointer hover:border-brand-primary">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4"><Wand2 size={24}/></div>
                    <h3 className="font-bold text-lg text-slate-900">AI Generator</h3>
                    <p className="text-sm text-slate-500">Describe your goals and let Setplai build a custom plan.</p>
                </div>
                <div onClick={() => { 
                    setCreationMode('MANUAL'); 
                    setProgramForEditing({ title: 'New Custom Program', description: '', sessions: [{ id: `s_${Date.now()}`, title: 'Session 1', items: [], completed: false }]});
                    setCoachStep('BUILDER'); 
                }} className="bg-brand-surface p-6 rounded-2xl border-2 border-slate-200 cursor-pointer hover:border-brand-primary">
                    <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center mb-4"><ClipboardEdit size={24}/></div>
                    <h3 className="font-bold text-lg text-slate-900">Create from Scratch</h3>
                    <p className="text-sm text-slate-500">Manually build a program session by session, drill by drill.</p>
                </div>
            </div>
        </div>
    );

    const renderAiInput = () => (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">AI Program Generator</h2>
            <p className="text-slate-500 mb-6">{isSquadContext ? "Describe the session for this squad." : "What would you like this athlete to work on?"}</p>
            <div className="space-y-4">
                 {isSquadContext && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-1">Players</label>
                            <input type="number" value={numPlayers} onChange={e => setNumPlayers(parseInt(e.target.value))} className="w-full p-3 bg-brand-surface border border-slate-200 rounded-lg text-sm text-slate-900"/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-1">Courts</label>
                            <input type="number" value={numCourts} onChange={e => setNumCourts(parseInt(e.target.value))} className="w-full p-3 bg-brand-surface border border-slate-200 rounded-lg text-sm text-slate-900"/>
                        </div>
                    </div>
                )}
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-1">Prompt</label>
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g. 'A 4-week program to improve my backhand slice and net game'" className="w-full h-32 p-3 bg-brand-surface border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-brand-primary focus:border-brand-primary"></textarea>
                </div>
                {!isSquadContext && (
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-1">Duration (weeks)</label>
                        <input type="number" value={aiDuration} onChange={e => setAiDuration(parseInt(e.target.value))} className="w-full p-3 bg-brand-surface border border-slate-200 rounded-lg text-sm text-slate-900"/>
                    </div>
                )}
                <Button fullWidth size="lg" onClick={handleGenerate} disabled={!prompt || isGenerating} isLoading={isGenerating}>Generate Plan</Button>
            </div>
        </div>
    );
    
    const renderBuilder = () => {
        if (!programForEditing) return <div className="p-6 text-slate-500">Loading builder...</div>;

        return (
            <div className="p-6 space-y-6">
                <div className="space-y-4">
                    <input value={programForEditing.title || ''} onChange={e => handleProgramMetaChange('title', e.target.value)} placeholder="Program Title" className="w-full text-2xl font-bold bg-transparent border-b-2 border-slate-200 focus:border-brand-primary focus:outline-none py-2 text-slate-900"/>
                    <textarea value={programForEditing.description || ''} onChange={e => handleProgramMetaChange('description', e.target.value)} placeholder="Program description..." className="w-full bg-brand-surface border border-slate-200 rounded-lg p-3 text-sm text-slate-900 focus:ring-brand-primary focus:border-brand-primary" />
                </div>
                
                <div className="space-y-4">
                    {programForEditing.sessions?.map((session, sIdx) => (
                        <div key={session.id || sIdx} className="bg-brand-surface p-4 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-900">{session.title}</h3>
                                <button onClick={() => handleRemoveSession(sIdx)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                            <div className="space-y-3">
                                {session.items.map((item, iIdx) => {
                                    const drill = drills.find(d => d.id === item.drillId);
                                    if (!drill) return null;
                                    return (
                                        <div key={`${sIdx}-${iIdx}`} className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <DrillCard 
                                                    drill={drill}
                                                    programItem={item}
                                                    isEditable
                                                    onSwap={(e) => { e.stopPropagation(); setActiveSessionIndexForDrillAdd(sIdx); handleRemoveDrill(sIdx, iIdx); setIsDrillPickerOpen(true); }}
                                                    onToggleMode={() => {}}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                 <button onClick={() => setEditingItem({ sessionIndex: sIdx, itemIndex: iIdx, item })} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-brand-primary hover:text-white"><Edit size={16}/></button>
                                                 <button onClick={() => handleRemoveDrill(sIdx, iIdx)} className="p-2 bg-slate-100 text-red-500 rounded-lg hover:bg-red-200"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <Button fullWidth variant="outline" onClick={() => { setActiveSessionIndexForDrillAdd(sIdx); setIsDrillPickerOpen(true); }}>
                                    <Plus size={16} className="mr-2"/> Add Drill
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
                <Button fullWidth variant="secondary" onClick={handleAddSession}>Add Session</Button>
           </div>
        );
    }

    const renderCoachFlow = () => {
        if (isGenerating) return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Wand2 size={48} className="text-brand-primary animate-pulse mb-4" />
                <h2 className="text-xl font-bold text-slate-900">Generating Program...</h2>
                <p className="text-slate-500">Our AI coach is building a plan...</p>
            </div>
        );
        switch (coachStep) {
            case 'ASSIGN_TARGETS': return renderAssignTargets();
            case 'SELECT_METHOD': return renderSelectMethod();
            case 'AI_INPUT': return renderAiInput();
            case 'BUILDER': return renderBuilder();
        }
    }

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col">
            {renderHeader()}
            <main className="flex-1 overflow-y-auto">
                {user.role === UserRole.PLAYER ? renderPlayerFlow() : renderCoachFlow()}
            </main>
            <DrillPickerModal 
                isOpen={isDrillPickerOpen}
                onClose={() => setIsDrillPickerOpen(false)}
                drills={drills}
                onSelectDrill={handleAddDrillToSession}
            />
            <DrillConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                item={editingItem?.item}
                onSave={handleUpdateDrillConfig}
            />
        </div>
    );
};

export default ProgramCreator;
