// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING: IconMapping = {
  // Navigation icons
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  
  // Core pharmacy icons
  'pill.fill': 'medication',
  'cube.box.fill': 'inventory',
  'cart.fill': 'shopping-cart',
  'chart.bar.fill': 'bar-chart',
  
  // Medical & pharmacy specific
  'cross.fill': 'local-pharmacy',
  'heart.fill': 'favorite',
  'stethoscope': 'healing',
  'thermometer': 'device-thermostat',
  'syringe.fill': 'colorize',
  'bandage.fill': 'healing',
  
  // Business & operations
  'person.fill': 'person',
  'person.2.fill': 'people',
  'building.2.fill': 'business',
  'creditcard.fill': 'credit-card',
  'banknote.fill': 'payments',
  'receipt.fill': 'receipt',
  
  // Actions & controls
  'plus.circle.fill': 'add-circle',
  'minus.circle.fill': 'remove-circle',
  'checkmark.circle.fill': 'check-circle',
  'xmark.circle.fill': 'cancel',
  'pencil.circle.fill': 'edit',
  'trash.circle.fill': 'delete',
  'magnifyingglass': 'search',
  'camera.fill': 'camera-alt',
  'qrcode': 'qr-code-scanner',
  
  // Status & alerts
  'exclamationmark.triangle.fill': 'warning',
  'info.circle.fill': 'info',
  'bell.fill': 'notifications',
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',
  
  // Data & documents
  'doc.fill': 'description',
  'folder.fill': 'folder',
  'archivebox.fill': 'archive',
  'printer.fill': 'print',
  'square.and.arrow.up.fill': 'share',
  'square.and.arrow.down.fill': 'download',
  
  // Time & calendar
  'clock.fill': 'schedule',
  'calendar.fill': 'event',
  'hourglass.fill': 'hourglass-empty',
  
  // Settings & configuration
  'gear.fill': 'settings',
  'slider.horizontal.3': 'tune',
  'power': 'power-settings-new',
  'wifi': 'wifi',
  
  // Arrows & movement
  'arrow.up.fill': 'arrow-upward',
  'arrow.down.fill': 'arrow-downward',
  'arrow.left.fill': 'arrow-back',
  'arrow.right.fill': 'arrow-forward',
  'arrow.clockwise': 'refresh',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
