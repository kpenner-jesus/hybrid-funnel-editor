// Tool definitions in Anthropic's tool format

export interface AiToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const aiTools: AiToolDefinition[] = [
  {
    name: "create_complete_funnel",
    description:
      "Creates an entire funnel from scratch, replacing any existing steps. Provide the funnel name, theme overrides, and an array of steps each containing widgets with their templateId, config, bindings, and variant. This is the primary tool for building a full funnel in one shot. Most funnels have 20-30 steps (max 60). Each step should contain 1-3 widgets.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The funnel name",
        },
        theme: {
          type: "object",
          description:
            "Optional theme overrides: { primaryColor, secondaryColor, accentColor, surfaceColor, headlineFont, bodyFont, borderRadius, cardStyle, logoUrl, timezone }",
          properties: {
            primaryColor: { type: "string" },
            secondaryColor: { type: "string" },
            accentColor: { type: "string", description: "Accent/highlight color, e.g. amber/gold" },
            surfaceColor: { type: "string" },
            headlineFont: { type: "string" },
            bodyFont: { type: "string" },
            borderRadius: { type: "number" },
            cardStyle: { type: "string", enum: ["flat", "elevated", "outlined"] },
            logoUrl: { type: "string", description: "URL to the venue/account logo" },
            timezone: { type: "string", description: "e.g. America/Chicago" },
          },
        },
        steps: {
          type: "array",
          description: "Array of steps to create",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Optional step ID for cross-referencing in branching funnels. Use short kebab-case IDs like 'retreat-type', 'group-dates', 'contact'. Other steps and segment-picker nextStep can reference these IDs." },
              title: { type: "string", description: "Step title" },
              layout: {
                type: "string",
                enum: ["single", "two-column", "stacked"],
                description: "Step layout",
              },
              navigation: {
                type: "object",
                properties: {
                  nextLabel: { type: "string" },
                  backLabel: { type: "string" },
                  next: { type: "string", description: "Default step ID to navigate to. Used as fallback when no conditionalNext rule matches." },
                  conditionalNext: {
                    type: "array",
                    description: "Conditional navigation rules. Evaluated in order — first match wins. Use this to route to different steps based on a variable value (e.g., eventSegment). Example: [{variable:'eventSegment', operator:'equals', value:'wedding', targetStepId:'venue-space'}]",
                    items: {
                      type: "object",
                      properties: {
                        variable: { type: "string", description: "Variable name to check (e.g., 'eventSegment')" },
                        operator: { type: "string", enum: ["equals", "not_equals", "contains"], description: "Comparison operator" },
                        value: { type: "string", description: "Value to compare against" },
                        targetStepId: { type: "string", description: "Step ID to navigate to if condition matches" },
                        label: { type: "string", description: "Optional label for flow visualization" },
                      },
                      required: ["variable", "operator", "value", "targetStepId"],
                    },
                  },
                },
              },
              widgets: {
                type: "array",
                description: "Widgets to add to this step",
                items: {
                  type: "object",
                  properties: {
                    templateId: {
                      type: "string",
                      description:
                        "Widget template ID (e.g. date-picker, guest-counter, guest-rooms, meal-picker, activity-picker, contact-form, invoice, segment-picker, option-picker)",
                    },
                    variant: { type: "string", description: "Widget variant ID" },
                    config: {
                      type: "object",
                      description: "Widget configuration key-value pairs",
                    },
                    bindings: {
                      type: "object",
                      description: "Variable bindings: { inputs: { widgetInput: varName }, outputs: { widgetOutput: varName } }",
                      properties: {
                        inputs: { type: "object" },
                        outputs: { type: "object" },
                      },
                    },
                  },
                  required: ["templateId"],
                },
              },
            },
            required: ["title", "widgets"],
          },
        },
      },
      required: ["name", "steps"],
    },
  },
  {
    name: "add_step",
    description:
      "Adds a new step to the funnel at the specified position. If position is not specified, appends to the end.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Step title" },
        position: {
          type: "number",
          description: "Zero-based index to insert the step at. Omit to append.",
        },
        layout: {
          type: "string",
          enum: ["single", "two-column", "stacked"],
          description: "Step layout. Defaults to single.",
        },
        navigation: {
          type: "object",
          properties: {
            nextLabel: { type: "string" },
            backLabel: { type: "string" },
          },
        },
      },
      required: ["title"],
    },
  },
  {
    name: "remove_step",
    description: "Removes a step from the funnel by its zero-based index.",
    input_schema: {
      type: "object",
      properties: {
        stepIndex: {
          type: "number",
          description: "Zero-based index of the step to remove",
        },
      },
      required: ["stepIndex"],
    },
  },
  {
    name: "reorder_steps",
    description: "Moves a step from one position to another.",
    input_schema: {
      type: "object",
      properties: {
        fromIndex: {
          type: "number",
          description: "Current zero-based index of the step",
        },
        toIndex: {
          type: "number",
          description: "Target zero-based index to move the step to",
        },
      },
      required: ["fromIndex", "toIndex"],
    },
  },
  {
    name: "add_widget",
    description:
      "Adds a widget to a specific step. Specify the step by index, then the widget template ID, optional config, bindings, and variant.",
    input_schema: {
      type: "object",
      properties: {
        stepIndex: {
          type: "number",
          description: "Zero-based index of the step to add the widget to",
        },
        templateId: {
          type: "string",
          description:
            "Widget template ID (date-picker, guest-counter, guest-rooms, meal-picker, activity-picker, contact-form, invoice, segment-picker, option-picker)",
        },
        variant: {
          type: "string",
          description: "Widget variant ID. Defaults to 'default'.",
        },
        config: {
          type: "object",
          description: "Widget configuration key-value pairs",
        },
        bindings: {
          type: "object",
          description:
            "Variable bindings: { inputs: { widgetInput: varName }, outputs: { widgetOutput: varName } }",
          properties: {
            inputs: { type: "object" },
            outputs: { type: "object" },
          },
        },
      },
      required: ["stepIndex", "templateId"],
    },
  },
  {
    name: "update_widget_config",
    description:
      "Updates the configuration of an existing widget. Provide the step index, widget index within that step, and the config fields to update (merged with existing config).",
    input_schema: {
      type: "object",
      properties: {
        stepIndex: {
          type: "number",
          description: "Zero-based index of the step",
        },
        widgetIndex: {
          type: "number",
          description: "Zero-based index of the widget within the step",
        },
        config: {
          type: "object",
          description: "Config fields to update (merged with existing)",
        },
      },
      required: ["stepIndex", "widgetIndex", "config"],
    },
  },
  {
    name: "remove_widget",
    description: "Removes a widget from a step by step index and widget index.",
    input_schema: {
      type: "object",
      properties: {
        stepIndex: {
          type: "number",
          description: "Zero-based index of the step",
        },
        widgetIndex: {
          type: "number",
          description: "Zero-based index of the widget to remove",
        },
      },
      required: ["stepIndex", "widgetIndex"],
    },
  },
  {
    name: "set_theme",
    description:
      "Updates the funnel theme. Provide any combination of: primaryColor, secondaryColor, surfaceColor, headlineFont, bodyFont, borderRadius, cardStyle.",
    input_schema: {
      type: "object",
      properties: {
        primaryColor: { type: "string", description: "Primary brand color (hex)" },
        secondaryColor: { type: "string", description: "Secondary brand color (hex)" },
        surfaceColor: { type: "string", description: "Surface/background color (hex)" },
        headlineFont: { type: "string", description: "Headline font family" },
        bodyFont: { type: "string", description: "Body font family" },
        borderRadius: { type: "number", description: "Border radius in pixels" },
        cardStyle: {
          type: "string",
          enum: ["flat", "elevated", "outlined"],
          description: "Card style",
        },
      },
      required: [],
    },
  },
  {
    name: "configure_segment_picker",
    description:
      "Configures a segment picker widget's options array. Each option has id, label, description, icon, and optional nextStep for branching.",
    input_schema: {
      type: "object",
      properties: {
        stepIndex: {
          type: "number",
          description: "Zero-based index of the step containing the segment picker",
        },
        widgetIndex: {
          type: "number",
          description: "Zero-based index of the segment picker widget",
        },
        options: {
          type: "array",
          description: "Segment options array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              description: { type: "string" },
              icon: { type: "string" },
              nextStep: { type: "string", description: "Optional step ID for branching" },
            },
            required: ["id", "label"],
          },
        },
      },
      required: ["stepIndex", "widgetIndex", "options"],
    },
  },
  {
    name: "configure_meal_widget",
    description:
      "Configures a meal-picker widget with meal definitions, pricing, kids settings, and cascade rules. " +
      "This is a convenience tool — it sets the 'meals' config field as a properly structured JSON string, " +
      "plus kids pricing and other settings. Use this instead of manually building the meals JSON in update_widget_config.",
    input_schema: {
      type: "object",
      properties: {
        stepIndex: {
          type: "number",
          description: "Zero-based index of the step containing the meal widget",
        },
        widgetIndex: {
          type: "number",
          description: "Zero-based index of the meal widget within the step",
        },
        meals: {
          type: "array",
          description: "Array of meal definitions",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Unique meal ID (e.g., 'breakfast', 'lunch', 'supper', 'night-snack', 'brunch', 'afternoon-tea')" },
              name: { type: "string", description: "Display name" },
              sortOrder: { type: "number", description: "Order in the grid (1=first column)" },
              adultPrice: { type: "number", description: "Price per adult per timeslot" },
              timeslots: {
                type: "array",
                description: "Timeslot windows (most meals have 1, some have 2 for early/late)",
                items: {
                  type: "object",
                  properties: {
                    startTime: { type: "string", description: "24h format, e.g., '07:00'" },
                    endTime: { type: "string", description: "24h format, e.g., '09:00'" },
                  },
                  required: ["startTime", "endTime"],
                },
              },
              timeslotLocked: { type: "boolean", description: "If true, time shown but not changeable (buffet style). Default false." },
              allowCheckIn: { type: "string", enum: ["selectable", "unselectable", "preselected"], description: "Availability on check-in day. Breakfast is usually 'unselectable' on check-in." },
              allowMiddle: { type: "string", enum: ["selectable", "unselectable", "preselected"], description: "Availability on middle days. Usually 'selectable' for all meals." },
              allowCheckOut: { type: "string", enum: ["selectable", "unselectable", "preselected"], description: "Availability on check-out day. Supper/snack usually 'unselectable' on checkout." },
              cascadeFrom: {
                type: "array",
                items: { type: "string" },
                description: "IDs of other meals to auto-select when this meal is picked. E.g., selecting Lunch cascades to ['supper','night-snack'].",
              },
            },
            required: ["id", "name", "adultPrice"],
          },
        },
        kidsEnabled: { type: "boolean", description: "Enable kids meals (default true)" },
        kidsPricingModel: { type: "string", enum: ["percentage", "age-based"], description: "How kids meals are priced" },
        kidsPercentage: { type: "number", description: "Kids meal price as % of adult (default 10)" },
        kidsAgeMultiplier: { type: "number", description: "Kids meal price per year of age in $ (default 1.50)" },
        title: { type: "string", description: "Widget title (e.g., 'Select Catered Meals for Your Group')" },
        subtitle: { type: "string", description: "Optional subtitle text" },
        currency: { type: "string", description: "Currency code (default: CAD)" },
        singleDate: { type: "boolean", description: "True for single-date events (no check-in/out logic)" },
      },
      required: ["stepIndex", "widgetIndex", "meals"],
    },
  },
  {
    name: "suggest_improvements",
    description:
      "Returns text-only suggestions for improving the funnel. Does not make any changes. Use this when the user asks for feedback or 'what am I missing'.",
    input_schema: {
      type: "object",
      properties: {
        focus: {
          type: "string",
          enum: ["conversion", "ux", "completeness", "design", "general"],
          description: "What aspect to focus suggestions on",
        },
      },
      required: [],
    },
  },
  {
    name: "set_venue_products",
    description:
      "Populates the venue product catalog with real data (rooms, meals, activities) so the preview shows actual venue products instead of generic mock data. Call this FIRST when the user provides venue-specific product information (room names, prices, meal options, activities, images). This data persists across sessions. IMPORTANT: Always call this when the user provides venue inventory data — without it, the preview shows fake placeholder products.",
    input_schema: {
      type: "object",
      properties: {
        venueName: { type: "string", description: "Venue name" },
        currency: { type: "string", description: "Currency code (e.g., CAD, USD, EUR)" },
        taxRates: {
          type: "array",
          description: "Tax rates to apply",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Tax name (e.g., GST, PST)" },
              rate: { type: "number", description: "Tax rate as percentage (e.g., 5 for 5%)" },
            },
            required: ["name", "rate"],
          },
        },
        rooms: {
          type: "array",
          description: "Room/accommodation products",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              imageUrl: { type: "string" },
              pricePerNight: { type: "number" },
              tags: { type: "array", items: { type: "string" } },
              maxAdults: { type: "number" },
              maxChildren: { type: "number" },
              stock: { type: "number" },
            },
            required: ["id", "name", "pricePerNight"],
          },
        },
        meals: {
          type: "array",
          description: "Meal products",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              pricePerPerson: { type: "number" },
              category: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
              dietaryOptions: { type: "array", items: { type: "string" } },
            },
            required: ["id", "name", "pricePerPerson", "category"],
          },
        },
        activities: {
          type: "array",
          description: "Activity products",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              imageUrl: { type: "string" },
              pricePerPerson: { type: "number" },
              durationMinutes: { type: "number" },
              maxParticipants: { type: "number" },
            },
            required: ["id", "name", "pricePerPerson"],
          },
        },
      },
      required: ["venueName", "currency"],
    },
  },
];
