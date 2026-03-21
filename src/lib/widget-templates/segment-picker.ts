import type { WidgetTemplate } from "../types";

export const segmentPickerTemplate: WidgetTemplate = {
  id: "segment-picker",
  name: "Segment Picker",
  category: "selection",
  description:
    "Presents clickable segment options (e.g. Group Retreat, Conference) with optional branching to specific steps.",
  icon: "🧭",
  inputs: [],
  outputs: [
    {
      name: "selectedSegment",
      type: "string",
      label: "Selected Segment ID",
      description: "The ID of the single selected option",
    },
    {
      name: "selectedSegments",
      type: "array",
      label: "Selected Segment IDs",
      description: "Array of selected IDs when multi-select is enabled",
    },
  ],
  themeSlots: [
    {
      name: "cardBg",
      cssProperty: "background-color",
      defaultValue: "#ffffff",
      label: "Card Background",
    },
    {
      name: "selectedBg",
      cssProperty: "background-color",
      defaultValue: "#e0f5ee",
      label: "Selected Background",
    },
    {
      name: "selectedBorder",
      cssProperty: "border-color",
      defaultValue: "#006c4b",
      label: "Selected Border",
    },
  ],
  configFields: [
    {
      name: "title",
      type: "text",
      label: "Title",
      defaultValue: "What brings you here?",
      description: 'e.g. "What brings you to Wilderness Edge?"',
    },
    {
      name: "subtitle",
      type: "text",
      label: "Subtitle",
      defaultValue: "Select your event type to get started",
      description: "Shown below the title",
    },
    {
      name: "options",
      type: "json",
      label: "Options",
      defaultValue: JSON.stringify(
        [
          {
            id: "retreat",
            label: "Group Retreat",
            description: "Church, Corporate, Youth...",
            icon: "⛺",
            nextStep: "",
          },
          {
            id: "conference",
            label: "Group Conference",
            description: "Meetings, Seminars, Workshops",
            icon: "🏢",
            nextStep: "",
          },
          {
            id: "family",
            label: "Family Reunion",
            description: "Gatherings, Celebrations",
            icon: "👨‍👩‍👧‍👦",
            nextStep: "",
          },
          {
            id: "individual",
            label: "Individual Stay",
            description: "Personal getaway, Solo retreat",
            icon: "🏕️",
            nextStep: "",
          },
        ],
        null,
        2
      ),
      description:
        'JSON array of options. Each: { id, label, description, icon, nextStep (optional step ID for branching) }',
    },
    {
      name: "allowMultiple",
      type: "boolean",
      label: "Allow Multiple Selection",
      defaultValue: false,
      description: "Let users pick more than one segment",
    },
    {
      name: "style",
      type: "select",
      label: "Display Style",
      defaultValue: "cards",
      options: [
        { value: "cards", label: "Cards" },
        { value: "list", label: "List" },
        { value: "pills", label: "Pills" },
      ],
    },
  ],
  variants: [
    {
      id: "default",
      name: "Card List",
      description: "Vertical list of option cards with icons and descriptions",
    },
    {
      id: "pills",
      name: "Pill Buttons",
      description: "Compact horizontal pill-style selectors",
    },
  ],
  rules: [
    {
      id: "required-segment",
      description: "At least one segment must be selected to continue",
      condition: "!selectedSegment",
      action: "disable-next",
    },
  ],
};
