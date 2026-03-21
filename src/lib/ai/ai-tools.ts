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
      "Creates an entire funnel from scratch, replacing any existing steps. Provide the funnel name, theme overrides, and an array of steps each containing widgets with their templateId, config, bindings, and variant. This is the primary tool for building a full funnel in one shot.",
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
            "Optional theme overrides: { primaryColor, secondaryColor, surfaceColor, headlineFont, bodyFont, borderRadius, cardStyle }",
          properties: {
            primaryColor: { type: "string" },
            secondaryColor: { type: "string" },
            surfaceColor: { type: "string" },
            headlineFont: { type: "string" },
            bodyFont: { type: "string" },
            borderRadius: { type: "number" },
            cardStyle: { type: "string", enum: ["flat", "elevated", "outlined"] },
          },
        },
        steps: {
          type: "array",
          description: "Array of steps to create",
          items: {
            type: "object",
            properties: {
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
];
