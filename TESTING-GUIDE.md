# Testing Guide

> Strategy, patterns, and example tests for the Hybrid Funnel Editor.
> No test framework is currently installed — start with `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`.

## Setup

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
```

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

## Test Categories

### 1. Unit Tests — Pure Logic (No React)

**Priority: HIGH — test these first.**

#### Widget Template Validation
```typescript
// src/lib/widget-templates/__tests__/registry.test.ts
import { widgetTemplateRegistry } from '../index';

describe('Widget Template Registry', () => {
  const templates = Object.values(widgetTemplateRegistry);

  test('all templates have required fields', () => {
    for (const t of templates) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(t.configFields).toBeInstanceOf(Array);
      expect(t.inputs).toBeInstanceOf(Array);
      expect(t.outputs).toBeInstanceOf(Array);
    }
  });

  test('all configField defaultValues match their type', () => {
    for (const t of templates) {
      for (const f of t.configFields) {
        if (f.defaultValue === undefined) continue;
        switch (f.type) {
          case 'text': case 'textarea': case 'json': case 'color':
            expect(typeof f.defaultValue).toBe('string');
            break;
          case 'number':
            expect(typeof f.defaultValue).toBe('number');
            break;
          case 'boolean':
            expect(typeof f.defaultValue).toBe('boolean');
            break;
          case 'select':
            expect(f.options?.some(o => o.value === f.defaultValue)).toBe(true);
            break;
        }
      }
    }
  });

  test('meal-picker has meals JSON configField with valid default', () => {
    const meal = widgetTemplateRegistry['meal-picker'];
    const mealsField = meal.configFields.find(f => f.name === 'meals');
    expect(mealsField).toBeTruthy();
    expect(mealsField!.type).toBe('json');
    const parsed = JSON.parse(mealsField!.defaultValue as string);
    expect(parsed).toHaveLength(4);
    expect(parsed[0].id).toBe('breakfast');
    expect(parsed[0].allowCheckIn).toBe('unselectable');
  });

  test('segment-picker has options JSON configField', () => {
    const seg = widgetTemplateRegistry['segment-picker'];
    const optionsField = seg.configFields.find(f => f.name === 'options');
    expect(optionsField).toBeTruthy();
    expect(optionsField!.type).toBe('json');
  });
});
```

#### Schema Factory Functions
```typescript
// src/lib/__tests__/schemas.test.ts
import { createEmptyFunnel, createEmptyStep, createWidgetInstance } from '../schemas';

describe('Schema Factories', () => {
  test('createEmptyFunnel produces valid structure', () => {
    const funnel = createEmptyFunnel('Test');
    expect(funnel.name).toBe('Test');
    expect(funnel.id).toBeTruthy();
    expect(funnel.steps).toEqual([]);
    expect(funnel.theme.primaryColor).toBeTruthy();
  });

  test('createEmptyStep produces valid structure', () => {
    const step = createEmptyStep('My Step');
    expect(step.title).toBe('My Step');
    expect(step.id).toBeTruthy();
    expect(step.widgets).toEqual([]);
    expect(step.navigation).toBeDefined();
  });

  test('createWidgetInstance populates config defaults from template', () => {
    const widget = createWidgetInstance('date-picker');
    expect(widget.templateId).toBe('date-picker');
    expect(widget.config.minStay).toBe(1);
    expect(widget.config.maxStay).toBe(14);
  });
});
```

#### JSX Generator
```typescript
// src/lib/__tests__/jsx-generator.test.ts
import { generateFunnelJSX } from '../jsx-generator';
import { createEmptyFunnel, createEmptyStep, createWidgetInstance } from '../schemas';

describe('JSX Generator', () => {
  test('generates valid JSX for empty funnel', () => {
    const funnel = createEmptyFunnel('Test');
    const jsx = generateFunnelJSX(funnel);
    expect(jsx).toContain('export default function Funnel');
    expect(jsx).not.toContain('import { useState }'); // bundler auto-injects
  });

  test('generates date picker component', () => {
    const funnel = createEmptyFunnel('Test');
    const step = createEmptyStep('Dates');
    step.widgets.push(createWidgetInstance('date-picker'));
    funnel.steps.push(step);
    const jsx = generateFunnelJSX(funnel);
    expect(jsx).toContain('startDate');
    expect(jsx).toContain('endDate');
  });

  test('generates meal picker with timeslot support', () => {
    const funnel = createEmptyFunnel('Test');
    const step = createEmptyStep('Meals');
    step.widgets.push(createWidgetInstance('meal-picker'));
    funnel.steps.push(step);
    const jsx = generateFunnelJSX(funnel);
    expect(jsx).toContain('mealProducts');
    expect(jsx).toContain('selectedMeals');
  });

  test('escapes single quotes in step titles', () => {
    const funnel = createEmptyFunnel('Test');
    const step = createEmptyStep("You're All Set!");
    funnel.steps.push(step);
    const jsx = generateFunnelJSX(funnel);
    expect(jsx).not.toMatch(/[^\\]'[^']*'[^']*You're/); // no broken strings
  });

  test('does not hardcode category ID 39', () => {
    const funnel = createEmptyFunnel('Test');
    const step = createEmptyStep('Meals');
    const meal = createWidgetInstance('meal-picker');
    meal.config.meetingMealCategoryId = 42;
    step.widgets.push(meal);
    funnel.steps.push(step);
    const jsx = generateFunnelJSX(funnel);
    expect(jsx).not.toContain('c.id === 39');
  });

  test('includes timeslot in buildProductEntries for meal products', () => {
    const funnel = createEmptyFunnel('Test');
    const jsx = generateFunnelJSX(funnel);
    expect(jsx).toContain('bookingUnit');
    expect(jsx).toContain('timeslot');
  });
});
```

#### AI Executor
```typescript
// src/lib/ai/__tests__/ai-executor.test.ts
import { executeAiTool } from '../ai-executor';
import { useFunnelStore } from '@/stores/funnel-store';
import { createEmptyFunnel, createEmptyStep, createWidgetInstance } from '@/lib/schemas';

// Mock the store
const mockStore = () => {
  const funnel = createEmptyFunnel('Test');
  const step = createEmptyStep('Welcome');
  step.widgets.push(createWidgetInstance('segment-picker'));
  funnel.steps.push(step);
  useFunnelStore.setState({ funnel, funnels: [funnel] });
  return funnel;
};

describe('AI Executor', () => {
  test('add_step creates a new step', () => {
    mockStore();
    const result = executeAiTool('add_step', { title: 'New Step' });
    expect(result.success).toBe(true);
    const { funnel } = useFunnelStore.getState();
    expect(funnel!.steps.length).toBe(2);
  });

  test('update_widget_config merges config', () => {
    mockStore();
    const result = executeAiTool('update_widget_config', {
      stepIndex: 0, widgetIndex: 0, config: { title: 'Updated!' }
    });
    expect(result.success).toBe(true);
    const { funnel } = useFunnelStore.getState();
    expect(funnel!.steps[0].widgets[0].config.title).toBe('Updated!');
  });

  test('configure_meal_widget sets meals JSON', () => {
    const funnel = mockStore();
    const step = createEmptyStep('Meals');
    step.widgets.push(createWidgetInstance('meal-picker'));
    useFunnelStore.getState().addStep(step);

    const result = executeAiTool('configure_meal_widget', {
      stepIndex: 1, widgetIndex: 0,
      meals: [{ id: 'lunch', name: 'Lunch', adultPrice: 20 }],
      kidsEnabled: true,
    });
    expect(result.success).toBe(true);
    const updated = useFunnelStore.getState().funnel!;
    const mealsJson = JSON.parse(updated.steps[1].widgets[0].config.meals as string);
    expect(mealsJson[0].name).toBe('Lunch');
  });

  test('remove_step out of range returns error', () => {
    mockStore();
    const result = executeAiTool('remove_step', { stepIndex: 99 });
    expect(result.success).toBe(false);
  });
});
```

### 2. Store Tests

```typescript
// src/stores/__tests__/funnel-store.test.ts
import { useFunnelStore } from '../funnel-store';

describe('Funnel Store', () => {
  beforeEach(() => {
    useFunnelStore.setState({ funnels: [], funnel: null, initialized: true });
  });

  test('createFunnel adds to list and returns id', () => {
    const id = useFunnelStore.getState().createFunnel('My Funnel');
    expect(id).toBeTruthy();
    expect(useFunnelStore.getState().funnels).toHaveLength(1);
  });

  test('cloneFunnel deep copies with new IDs', () => {
    const id = useFunnelStore.getState().createFunnel('Original');
    const cloneId = useFunnelStore.getState().cloneFunnel(id, 'Clone');
    expect(cloneId).not.toBe(id);
    expect(useFunnelStore.getState().funnels).toHaveLength(2);
  });

  test('undo/redo restores state', () => {
    const id = useFunnelStore.getState().createFunnel('Test');
    useFunnelStore.getState().loadFunnel(id);
    const step = { id: 's1', title: 'Step 1', layout: 'single' as const, widgets: [], navigation: { nextLabel: 'Next', backLabel: 'Back' } };
    useFunnelStore.getState().addStep(step);
    expect(useFunnelStore.getState().funnel!.steps).toHaveLength(1);
    useFunnelStore.getState().undo();
    expect(useFunnelStore.getState().funnel!.steps).toHaveLength(0);
    useFunnelStore.getState().redo();
    expect(useFunnelStore.getState().funnel!.steps).toHaveLength(1);
  });
});
```

### 3. Component Tests (React Testing Library)

```typescript
// src/components/preview/__tests__/ImageCarousel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageCarousel, PriceDisplay, AvailabilityBadge } from '../ImageCarousel';

describe('ImageCarousel', () => {
  test('shows placeholder when no images', () => {
    render(<ImageCarousel images={[]} />);
    // Should show emoji placeholder
  });

  test('shows navigation arrows with multiple images', () => {
    render(<ImageCarousel images={['img1.jpg', 'img2.jpg', 'img3.jpg']} />);
    // Should have left/right buttons
  });
});

describe('PriceDisplay', () => {
  test('shows sale badge when salePrice < price', () => {
    render(<PriceDisplay price={200} salePrice={150} />);
    expect(screen.getByText(/SALE/)).toBeInTheDocument();
  });

  test('no sale badge when no salePrice', () => {
    render(<PriceDisplay price={200} />);
    expect(screen.queryByText(/SALE/)).not.toBeInTheDocument();
  });
});

describe('AvailabilityBadge', () => {
  test('shows green for high availability', () => {
    render(<AvailabilityBadge available={10} total={10} />);
    expect(screen.getByText('10/10 Available')).toBeInTheDocument();
  });

  test('shows unavailable date', () => {
    render(<AvailabilityBadge unavailableUntil="Mar 26, 2026" />);
    expect(screen.getByText(/Unavailable until Mar 26/)).toBeInTheDocument();
  });
});
```

### 4. Integration / E2E Tests

For full E2E with Playwright:
```bash
npm install -D @playwright/test
npx playwright install
```

```typescript
// e2e/funnel-creation.spec.ts
import { test, expect } from '@playwright/test';

test('create funnel and add step via AI', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="password"]', process.env.EDITOR_PASSWORD!);
  await page.click('button[type="submit"]');

  // Create new funnel
  await page.click('text=New Funnel');
  await page.fill('input[placeholder="Funnel name..."]', 'E2E Test');
  await page.click('text=Create');

  // Should be in editor
  await expect(page).toHaveURL(/\/editor\//);

  // Open AI chat
  await page.click('[title="AI Assistant"]');
  await page.fill('textarea', 'Add a welcome step with a headline');
  await page.click('button[title="Send"]');

  // Wait for AI response
  await expect(page.locator('.step-list')).toContainText('Welcome', { timeout: 30000 });
});
```

## What To Test First (Priority Order)

1. **JSX Generator** — most critical, produces the actual output
   - String escaping (apostrophes in titles)
   - Category ID collection from widget configs
   - Timeslot data in buildProductEntries
   - No hardcoded IDs (category 39, etc.)
   - Valid JSX syntax (no unclosed tags, proper imports)

2. **AI Executor** — maps AI decisions to store actions
   - All 13 tool handlers
   - Edge cases: out-of-range indices, wrong widget type, missing funnel
   - Meal widget configuration
   - Segment picker option updates

3. **Funnel Store** — CRUD + undo/redo
   - Create, clone, rename, delete funnels
   - Add/remove/reorder steps
   - Widget config updates
   - Undo/redo stack integrity

4. **Widget Templates** — validation
   - All templates have valid structure
   - Config defaults parse correctly
   - JSON defaults (options, meals) are valid JSON

5. **Flow Layout** — orphan detection, branching
   - Linear funnel → single column
   - Segment picker → parallel columns
   - Conditional navigation → path tracing
   - Orphan step detection

## Coverage Goals

| Area | Target |
|------|--------|
| JSX Generator | 90%+ |
| AI Executor | 85%+ |
| Funnel Store | 80%+ |
| Widget Templates | 100% (validation) |
| Flow Layout | 75% |
| React Components | 50% (visual, hard to test) |
