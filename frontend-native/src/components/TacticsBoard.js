import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Dimensions, Alert, Platform, ScrollView } from 'react-native';
import { Svg, Line, Polygon, Rect as SvgRect, Circle, Text as SvgText } from 'react-native-svg';
import ViewShot from "react-native-view-shot";
import { X, Trash2, Check, ArrowUpRight, Square, AlertOctagon, User } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';

const { width } = Dimensions.get('window');
const COURT_WIDTH = width - 48;
const COURT_HEIGHT = COURT_WIDTH * 1.8;

export default function TacticsBoard({ onSave, onClose }) {
  const viewShotRef = useRef();
  const [elements, setElements] = useState([]);
  const [arrows, setArrows] = useState([]);
  const [activeTool, setActiveTool] = useState(null); // 'ARROW' | null
  
  // Arrow Drawing State
  const [currentArrow, setCurrentArrow] = useState(null);

  // Tools to add elements
  const addElement = (type) => {
    let newEl = { id: Date.now(), type, x: COURT_WIDTH / 2 - 20, y: COURT_HEIGHT / 2 - 20, w: 40, h: 40 };
    if (type.includes('ZONE')) {
        newEl.w = 80; newEl.h = 80;
    }
    setElements([...elements, newEl]);
    setActiveTool(null);
  };

  // --- Pan Responders ---
  // For drawing arrows on the court
  const courtPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => activeTool === 'ARROW',
      onPanResponderGrant: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          setCurrentArrow({ start: { x: locationX, y: locationY }, end: { x: locationX, y: locationY } });
      },
      onPanResponderMove: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          setCurrentArrow(prev => ({ ...prev, end: { x: locationX, y: locationY } }));
      },
      onPanResponderRelease: (e, gestureState) => {
          if (gestureState.dx > 10 || gestureState.dy > 10 || gestureState.dx < -10 || gestureState.dy < -10) {
              setArrows(prev => {
                  const newArrow = { ...currentArrow, number: prev.length + 1 };
                  return [...prev, newArrow];
              });
          }
          setCurrentArrow(null);
      }
    })
  ).current;

  const handleCapture = async () => {
      try {
          const uri = await viewShotRef.current.capture();
          onSave(uri);
      } catch (e) {
          Alert.alert("Error", "Could not save diagram.");
      }
  };

  const clearBoard = () => {
      setElements([]);
      setArrows([]);
  };

  // Draggable Element Wrapper
  const Draggable = ({ el, index }) => {
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => activeTool !== 'ARROW',
            onPanResponderMove: (e, gestureState) => {
                setElements(prev => {
                    const newEls = [...prev];
                    newEls[index].x += gestureState.dx;
                    newEls[index].y += gestureState.dy;
                    return newEls;
                });
            },
            onPanResponderRelease: () => {}
        })
    ).current;

    // Resizer Pan Responder for Zones
    const resizerResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (e, gestureState) => {
                setElements(prev => {
                    const newEls = [...prev];
                    newEls[index].w = Math.max(30, newEls[index].w + gestureState.dx);
                    newEls[index].h = Math.max(30, newEls[index].h + gestureState.dy);
                    return newEls;
                });
            }
        })
    ).current;

    const isZone = el.type.includes('ZONE');

    return (
        <View style={{ position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h }} {...panResponder.panHandlers}>
            {el.type === 'P1' && <View style={[styles.playerIcon, {backgroundColor: '#2563EB'}]}><Text style={styles.pText}>P1</Text></View>}
            {el.type === 'P2' && <View style={[styles.playerIcon, {backgroundColor: '#EA580C'}]}><Text style={styles.pText}>P2</Text></View>}
            {el.type === 'TARGET' && <View style={styles.targetIcon} />}
            {el.type === 'GOOD_ZONE' && <View style={[styles.zone, {backgroundColor: 'rgba(34, 197, 94, 0.3)', borderColor: '#16A34A'}]} />}
            {el.type === 'BAD_ZONE' && <View style={[styles.zone, {backgroundColor: 'rgba(239, 68, 68, 0.3)', borderColor: '#DC2626'}]} />}
            
            {/* Resize Handle for Zones */}
            {isZone && (
                <View style={styles.resizeHandle} {...resizerResponder.panHandlers} />
            )}
        </View>
    );
  };

  return (
    <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={onClose}><X size={24} color="#0F172A" /></TouchableOpacity>
            <Text style={styles.title}>Draw Drill</Text>
            <TouchableOpacity onPress={handleCapture}><Check size={28} color={COLORS.primary} /></TouchableOpacity>
        </View>

        {/* Board Area */}
        <View style={styles.boardWrapper}>
            <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1.0 }} style={styles.shotArea}>
                <View style={styles.courtBg} {...courtPanResponder.panHandlers}>
                    {/* The Tennis Court SVG */}
                    <Svg width="100%" height="100%">
                        <SvgRect width="100%" height="100%" fill="#1E3A8A" />
                        <SvgRect x="10%" y="10%" width="80%" height="80%" fill="#3B82F6" stroke="#FFF" strokeWidth="2"/>
                        <Line x1="10%" y1="50%" x2="90%" y2="50%" stroke="#FFF" strokeWidth="4" />
                        <Line x1="50%" y1="10%" x2="50%" y2="90%" stroke="#FFF" strokeWidth="2" />
                        <Line x1="10%" y1="25%" x2="90%" y2="25%" stroke="#FFF" strokeWidth="2" />
                        <Line x1="10%" y1="75%" x2="90%" y2="75%" stroke="#FFF" strokeWidth="2" />
                    </Svg>

                    {/* Render Elements */}
                    {elements.map((el, i) => <Draggable key={el.id} el={el} index={i} />)}

                    {/* Render Arrows */}
                    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                        {[...arrows, currentArrow].filter(Boolean).map((arr, i) => (
                            <React.Fragment key={i}>
                                <Line x1={arr.start.x} y1={arr.start.y} x2={arr.end.x} y2={arr.end.y} stroke="#FDE047" strokeWidth="3" strokeDasharray="5,5" />
                                <Circle cx={arr.end.x} cy={arr.end.y} r="8" fill="#FDE047" />
                                {arr.number && <SvgText x={arr.end.x - 4} y={arr.end.y + 4} fill="#000" fontSize="10" fontWeight="bold">{arr.number}</SvgText>}
                            </React.Fragment>
                        ))}
                    </Svg>
                </View>
            </ViewShot>
        </View>

        {/* Toolbox */}
        <View style={styles.toolbox}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12, paddingHorizontal: 16}}>
                <TouchableOpacity style={styles.toolBtn} onPress={() => addElement('P1')}><User size={20} color="#2563EB"/><Text style={styles.toolText}>P1</Text></TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => addElement('P2')}><User size={20} color="#EA580C"/><Text style={styles.toolText}>P2</Text></TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => addElement('TARGET')}><AlertOctagon size={20} color="#F59E0B"/><Text style={styles.toolText}>Target</Text></TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => addElement('GOOD_ZONE')}><Square size={20} color="#16A34A"/><Text style={styles.toolText}>Zone</Text></TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => addElement('BAD_ZONE')}><Square size={20} color="#DC2626"/><Text style={styles.toolText}>No-Go</Text></TouchableOpacity>
                
                <TouchableOpacity style={[styles.toolBtn, activeTool === 'ARROW' && {backgroundColor: '#FEF08A'}]} onPress={() => setActiveTool(activeTool === 'ARROW' ? null : 'ARROW')}>
                    <ArrowUpRight size={20} color="#854D0E"/><Text style={styles.toolText}>Shot Path</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.toolBtn, {backgroundColor: '#FEE2E2'}]} onPress={clearBoard}>
                    <Trash2 size={20} color="#DC2626"/><Text style={[styles.toolText, {color: '#DC2626'}]}>Clear</Text>
                </TouchableOpacity>
            </ScrollView>
            {activeTool === 'ARROW' && <Text style={styles.hint}>Drag on court to draw shot path</Text>}
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  
  boardWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  shotArea: { width: COURT_WIDTH, height: COURT_HEIGHT, backgroundColor: '#1E3A8A', borderRadius: 8, overflow: 'hidden', ...SHADOWS.medium },
  courtBg: { flex: 1, width: '100%', height: '100%' },

  // Elements
  playerIcon: { width: '100%', height: '100%', borderRadius: 100, borderWidth: 2, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...SHADOWS.small },
  pText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  targetIcon: { width: '100%', height: '100%', backgroundColor: '#FDE047', transform: [{rotate: '45deg'}], borderWidth: 2, borderColor: '#CA8A04' },
  zone: { width: '100%', height: '100%', borderWidth: 2, borderStyle: 'dashed' },
  resizeHandle: { position: 'absolute', bottom: -10, right: -10, width: 20, height: 20, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 2, borderColor: '#94A3B8' },

  toolbox: { backgroundColor: '#FFF', paddingVertical: 16, borderTopWidth: 1, borderColor: '#E2E8F0', paddingBottom: 40 },
  toolBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12, width: 70 },
  toolText: { fontSize: 10, fontWeight: '700', color: '#475569', marginTop: 4 },
  hint: { textAlign: 'center', color: '#CA8A04', fontWeight: '700', fontSize: 12, marginTop: 12 }
});