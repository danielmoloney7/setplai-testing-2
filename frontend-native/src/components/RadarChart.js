import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function RadarChart({ data, size }) {
  if (!data || data.length === 0) return null;

  // statsContainer paddingHorizontal (24×2=48) + chartCard padding (24×2=48) = 96px total
  const canvasSize = size || (width - 96);
  const center = canvasSize / 2;

  // Reserve enough space for the longest label ("MOVEMENT"/"BACKHAND") at font-size 11
  // on diagonal axes with textAnchor start/end — 72px prevents SVG viewport overflow on
  // all current iPhone sizes (SE 375px → Pro Max 430px).
  const textMargin = 72;
  const radius = (canvasSize / 2) - textMargin;
  const angleStep = (Math.PI * 2) / data.length;

  const renderWeb = () => {
    const levels = 4;
    let webs = [];
    for (let level = 1; level <= levels; level++) {
      let points = [];
      const currentRadius = (radius / levels) * level;
      for (let i = 0; i < data.length; i++) {
        const x = center + currentRadius * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + currentRadius * Math.sin(i * angleStep - Math.PI / 2);
        points.push(`${x},${y}`);
      }
      webs.push(
        <Polygon
          key={`web-${level}`}
          points={points.join(' ')}
          stroke="#E2E8F0"
          strokeWidth={1}
          fill={level % 2 === 0 ? "rgba(241, 245, 249, 0.5)" : "transparent"}
        />
      );
    }
    return webs;
  };

  const renderAxes = () => {
    return data.map((_, i) => {
      const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
      const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
      return (
        <Line key={`axis-${i}`} x1={center} y1={center} x2={x} y2={y} stroke="#CBD5E1" strokeWidth={1} strokeDasharray="4 4" />
      );
    });
  };

  const renderDataPolygon = () => {
    let points = [];
    data.forEach((d, i) => {
      const valueRadius = radius * (Math.min(Math.max(d.value, 0), 100) / 100);
      const x = center + valueRadius * Math.cos(i * angleStep - Math.PI / 2);
      const y = center + valueRadius * Math.sin(i * angleStep - Math.PI / 2);
      points.push(`${x},${y}`);
    });

    return (
      <Polygon
        points={points.join(' ')}
        stroke={COLORS.primary}
        strokeWidth={3}
        fill={COLORS.primary}
        fillOpacity={0.35}
      />
    );
  };

  const renderLabels = () => {
    // Push the text 12px outside the outer ring of the web
    const labelRadius = radius + 12;
    return data.map((d, i) => {
      const x = center + labelRadius * Math.cos(i * angleStep - Math.PI / 2);
      const y = center + labelRadius * Math.sin(i * angleStep - Math.PI / 2);
      
      let anchor = "middle";
      if (Math.cos(i * angleStep - Math.PI / 2) > 0.1) anchor = "start";
      if (Math.cos(i * angleStep - Math.PI / 2) < -0.1) anchor = "end";

      return (
        <SvgText
          key={`label-${i}`}
          x={x}
          y={y} 
          fontSize={11}
          fontWeight="800"
          fill="#475569"
          textAnchor={anchor}
          alignmentBaseline="middle" // Fixes vertical clipping
        >
          {d.label.toUpperCase()}
        </SvgText>
      );
    });
  };

  return (
    <View style={styles.container}>
      <Svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`}>
        {renderWeb()}
        {renderAxes()}
        {renderDataPolygon()}
        {renderLabels()}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' }
});