import React, { createContext, useContext, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export type ViewStyle = Record<string, any>;
export type TextStyle = Record<string, any>;
export type ViewProps = Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'onClick'> & { style?: any; children?: React.ReactNode; onPress?: (...args: any[]) => void; onClick?: (...args: any[]) => void };
export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'style' | 'onChange' | 'value' | 'size'> & { onChangeText?: (value: string) => void; style?: any; multiline?: boolean; numberOfLines?: number; value?: any; placeholderTextColor?: string; secureTextEntry?: boolean; keyboardType?: string };
const SafeContext = createContext({ top: 0, right: 0, bottom: 0, left: 0 });
export const useSafeAreaInsets = () => useContext(SafeContext);
export const SafeAreaProvider = ({ children }: { children: React.ReactNode }) => <SafeContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}>{children}</SafeContext.Provider>;
export const Platform = { OS: 'web', select: <T,>(options: Record<string, T>) => options.web ?? options.default };

const css = (style: any): CSSProperties => {
  const merged: Record<string, any> = {};
  const visit = (part: any) => {
    if (!part) return;
    if (Array.isArray(part)) return part.forEach(visit);
    if (typeof part !== 'object') return;
    for (const [key, value] of Object.entries(part)) {
      if (value === undefined || value === null) continue;
      if (key === 'paddingHorizontal') { merged.paddingLeft = value; merged.paddingRight = value; }
      else if (key === 'paddingVertical') { merged.paddingTop = value; merged.paddingBottom = value; }
      else if (key === 'marginHorizontal') { merged.marginLeft = value; merged.marginRight = value; }
      else if (key === 'marginVertical') { merged.marginTop = value; merged.marginBottom = value; }
      else if (key === 'elevation') merged.boxShadow = `0 ${Math.max(1, Number(value) || 1)}px ${Math.max(3, (Number(value) || 1) * 3)}px rgba(35,45,62,.12)`;
      else if (key === 'textShadowColor') merged.textShadow = `0 1px 2px ${value}`;
      else if (key === 'textShadowRadius') continue;
      else if (key === 'fontWeight' && typeof value === 'number') merged[key] = String(value);
      else if (key === 'fontFamily' && typeof value === 'string') merged[key] = value.startsWith('Nunito_') ? 'Nunito' : value;
      else merged[key] = value;
    }
  };
  visit(style);
  if (merged.display === undefined && ('flex' in merged || 'flexDirection' in merged || 'alignItems' in merged || 'justifyContent' in merged || 'gap' in merged)) merged.display = 'flex';
  return merged as CSSProperties;
};
export const StyleSheet = { create: <T extends Record<string, any>>(styles: T): T => styles, flatten: css, hairlineWidth: 1, absoluteFill: { position: 'absolute', inset: 0 } };
export const LayoutAnimation = { configureNext: (_config?: any) => undefined, create: (..._args: any[]) => ({}), Presets: { easeInEaseOut: {}, linear: {}, spring: {} } };

export function View({ children, style, onPress, onClick, ...props }: any) {
  return <div {...props} onClick={onClick ?? onPress} style={{ display: 'flex', flexDirection: 'column', ...css(style) }}>{children}</div>;
}
export function Text({ children, style, onPress, onClick, numberOfLines, ...props }: any) {
  return <span {...props} onClick={onClick ?? onPress} style={{ ...css(style), ...(numberOfLines ? { display: '-webkit-box', WebkitLineClamp: numberOfLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}) }}>{children}</span>;
}
type PressableProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style' | 'onClick'> & { children?: React.ReactNode; style?: Record<string, any> | ((state: { pressed: boolean }) => Record<string, any>); onPress?: (...args: any[]) => void; onClick?: (...args: any[]) => void; accessibilityRole?: string; accessibilityLabel?: string; hitSlop?: number };
export function Pressable({ children, style, onPress, disabled, accessibilityRole, accessibilityLabel, hitSlop, ...props }: PressableProps) {
  const [pressed, setPressed] = useState(false);
  const computed = typeof style === 'function' ? style({ pressed }) : style;
  return <button type="button" {...props} role={accessibilityRole} aria-label={accessibilityLabel} disabled={disabled} aria-disabled={disabled} onClick={onPress} onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)} style={{ display: 'flex', flexDirection: 'column', appearance: 'none', font: 'inherit', color: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer', border: 0, padding: 0, background: 'transparent', textAlign: 'inherit', ...css(computed) }}>{children}</button>;
}
export type ScrollView = { scrollToEnd: (options?: { animated?: boolean }) => void };
export const ScrollView = React.forwardRef<ScrollView, any>(function ScrollView({ children, style, contentContainerStyle, horizontal, showsVerticalScrollIndicator, showsHorizontalScrollIndicator, keyboardShouldPersistTaps, onContentSizeChange, ...props }, ref) {
  const element = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => ({ scrollToEnd: () => element.current?.scrollTo({ top: element.current.scrollHeight, behavior: 'smooth' }) }));
  React.useEffect(() => { onContentSizeChange?.(element.current?.scrollWidth ?? 0, element.current?.scrollHeight ?? 0); }, [children, onContentSizeChange]);
  return <div {...props} ref={element} style={{ overflowX: horizontal ? 'auto' : 'hidden', overflowY: horizontal ? 'hidden' : 'auto', WebkitOverflowScrolling: 'touch', ...css(style) }}><div style={{ display: 'flex', flexDirection: horizontal ? 'row' : 'column', minHeight: horizontal ? undefined : '100%', ...css(contentContainerStyle) }}>{children}</div></div>;
});
export function TextInput({ style, onChangeText, multiline, numberOfLines, secureTextEntry, placeholderTextColor, keyboardType, ...props }: TextInputProps) {
  const common = { ...props, inputMode: keyboardType === 'numeric' ? 'numeric' as const : keyboardType === 'email-address' ? 'email' as const : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChangeText?.(event.target.value), style: { font: 'inherit', color: 'inherit', ...css(style), ...(placeholderTextColor ? { ['--placeholder-color' as any]: placeholderTextColor } : {}) } };
  return multiline ? <textarea {...common as any} rows={numberOfLines} /> : <input {...common as any} type={secureTextEntry ? 'password' : props.type ?? 'text'} />;
}
export function Switch({ value, onValueChange, disabled, style, ...props }: any) {
  return <button {...props} type="button" role="switch" aria-checked={!!value} disabled={disabled} onClick={() => onValueChange?.(!value)} style={{ width: 46, height: 26, border: 0, borderRadius: 20, padding: 3, background: value ? 'var(--teal, #28bd9f)' : '#ccd2d9', cursor: 'pointer', ...css(style) }}><span style={{ display: 'block', width: 20, height: 20, borderRadius: '50%', background: 'white', transform: value ? 'translateX(20px)' : 'translateX(0)', transition: 'transform .15s' }} /></button>;
}
export function Modal({ visible, children, onRequestClose, transparent = true, animationType, ...props }: any) {
  if (!visible) return null;
  return <div {...props} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onRequestClose?.()} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 20, background: transparent ? 'rgba(23,31,43,.48)' : 'white' }}><div role="dialog" aria-modal="true" style={{ maxWidth: 'min(640px, 100%)', maxHeight: '90vh', overflow: 'auto' }}>{children}</div></div>;
}
export function ActivityIndicator({ size = 'small', color = '#28bd9f', style }: any) { const px = size === 'large' ? 38 : typeof size === 'number' ? size : 22; return <span aria-label="Загрузка" style={{ display: 'inline-block', width: px, height: px, border: `3px solid ${color}33`, borderTopColor: color, borderRadius: '50%', animation: 'spin .8s linear infinite', ...css(style) }} />; }
export function KeyboardAvoidingView({ children, style, ...props }: any) { return <div {...props} style={css(style)}>{children}</div>; }
export const SafeAreaView = View;
export const Alert = { alert: (title: string, message?: string, buttons?: Array<{ text?: string; onPress?: () => void; style?: string }>) => { const ok = typeof window === 'undefined' ? true : window.confirm([title, message].filter(Boolean).join('\n\n')); if (buttons?.length) (ok ? buttons[buttons.length - 1] : buttons[0])?.onPress?.(); } };
