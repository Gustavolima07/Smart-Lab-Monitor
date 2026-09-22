// src/components/ZoomCard.js
import React from 'react';
import { MotiPressable } from 'moti/interactions';

export default function ZoomCard({
  children,
  onPress,
  style,
  index = 0,
  scalePressed = 1.0,
  scaleHovered = 1.02,
  hoverBackgroundColor = '#F8FAFD00',
  defaultBackgroundColor = '#FFFFFF00',
  delayStep = 50,
  ...props
}) {
  return (
    <MotiPressable
      onPress={onPress}
      animate={({ hovered, pressed }) => {
        'worklet';
        return {
          opacity: 1,
          scale: pressed ? scalePressed : hovered ? scaleHovered : 1,
          backgroundColor:
            hovered && hoverBackgroundColor
              ? hoverBackgroundColor
              : defaultBackgroundColor,
        };
      }}
      transition={({ hovered, pressed }) => {
        'worklet';
        if (hovered || pressed) {
          return { type: 'timing', duration: 150 };
        }
        return { type: 'timing', duration: 300, delay: index * delayStep };
      }}
      style={style}
      {...props}
    >
      {children}
    </MotiPressable>
  );
}