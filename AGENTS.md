# AGENTS.md

Expo React Native app (SDK 54) with TypeScript, Expo Router v6, and pnpm.

## Commands

```bash
pnpm start            # Start dev server
pnpm ios / android    # Run on simulator/emulator
pnpm lint             # Run ESLint
```

No testing framework configured yet.

## Code Style

### Naming
- Files: kebab-case (`themed-text.tsx`, `use-theme-color.ts`)
- Platform-specific: `.ios.tsx`, `.android.tsx`, `.web.tsx` suffixes

### Imports
```typescript
// 1. External packages
import { Stack } from 'expo-router';
// 2. Internal aliases
import { ThemedText } from '@/components/themed-text';
// 3. Side-effects last
import 'react-native-reanimated';
```

### Components
- Named function exports for components, default exports for screens in `app/`
- Destructure props inline with defaults
- `StyleSheet.create()` at bottom of file

```typescript
export function MyComponent({ style, type = 'default', ...rest }: Props) { ... }
export default function HomeScreen() { ... }
```

### TypeScript
- Strict mode enabled - avoid `any`
- Export types alongside components

### Theming
- Use `useThemeColor` hook for dynamic colors
- Colors defined in `@/constants/theme`

### Platform Code
```typescript
Platform.select({ ios: 'value', android: 'value', web: 'value' })
```

## Directory Structure

```
app/           # Expo Router pages (_layout.tsx for navigation)
components/    # Reusable components (ui/ for primitives)
constants/     # Theme, colors
hooks/         # Custom hooks
assets/        # Images, fonts
```

## Error Handling

```typescript
const theme = useColorScheme() ?? 'light';  // Nullish coalescing
props.onPressIn?.(ev);                       // Optional chaining
```
