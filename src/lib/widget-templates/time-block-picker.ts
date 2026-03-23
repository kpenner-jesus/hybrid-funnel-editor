import type { WidgetTemplate } from "../types";

export const timeBlockPickerTemplate: WidgetTemplate = {
  id: "time-block-picker",
  name: "Time Block Picker",
  icon: "⏱️",
  category: "selection",
  description: "Select event start/end times or duration blocks. Supports overtime rates and minimum hours.",
  aiDescription: "Use time-block-picker when the business prices services by the hour or needs to capture event timing (ceremony start, reception duration, rental hours). This widget lets customers select start time, end time, or duration from configurable time slots. It supports minimum hours, overtime rates (e.g., $500/hour after 5 hours), and time-of-day pricing tiers. ALWAYS use this instead of text-input for time/duration collection — it validates times and calculates hour-based pricing automatically.",
  aiConfusionNotes: "Do NOT use date-picker for time selection — date-picker is for dates, not hours. Do NOT use option-picker for time slots — time-block-picker has built-in duration math and overtime calculation. Do NOT use text-input for 'how many hours' — time-block-picker validates and prices automatically.",
  bestFor: ["event duration", "ceremony time", "reception hours", "rental period", "overtime calculation", "hourly pricing"],
  notFor: ["date selection", "check-in/check-out dates", "meal timeslots"],
  tags: ["time", "duration", "hours", "schedule", "overtime", "hourly-rate", "wedding", "events", "rental", "venue"],
  industries: ["wedding-venue", "event-venue", "equipment-rental", "studio", "conference-center", "photography"],
  complexity: "moderate",
  inputs: [
    { name: "eventDate", type: "string", label: "Event Date", description: "Date for time selection (from date-picker)" },
  ],
  outputs: [
    { name: "startTime", type: "string", label: "Start Time", description: "Selected start time (HH:MM)" },
    { name: "endTime", type: "string", label: "End Time", description: "Selected end time (HH:MM)" },
    { name: "totalHours", type: "number", label: "Total Hours", description: "Duration in hours" },
    { name: "timeTotal", type: "number", label: "Time-Based Total", description: "Cost based on hours × rate + overtime" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Event Schedule" },
    { name: "mode", type: "select", label: "Selection Mode", defaultValue: "start-end", options: [
      { value: "start-end", label: "Start & End Time" },
      { value: "start-duration", label: "Start Time + Duration" },
      { value: "duration-only", label: "Duration Only" },
    ]},
    { name: "minHours", type: "number", label: "Minimum Hours", defaultValue: 4 },
    { name: "maxHours", type: "number", label: "Maximum Hours", defaultValue: 12 },
    { name: "timeSlotInterval", type: "number", label: "Time Slot Interval (minutes)", defaultValue: 30 },
    { name: "earliestStart", type: "text", label: "Earliest Start Time", defaultValue: "08:00" },
    { name: "latestEnd", type: "text", label: "Latest End Time", defaultValue: "23:00" },
    { name: "hourlyRate", type: "number", label: "Hourly Rate", defaultValue: 0 },
    { name: "overtimeRate", type: "number", label: "Overtime Rate (per hour after minimum)", defaultValue: 0 },
    { name: "overtimeAfterHours", type: "number", label: "Overtime Kicks In After (hours)", defaultValue: 5 },
    { name: "showPricing", type: "boolean", label: "Show Pricing to Customer", defaultValue: true },
    { name: "timeBlocks", type: "json", label: "Pre-defined Time Blocks", defaultValue: JSON.stringify([
      { id: "morning", label: "Morning", startTime: "08:00", endTime: "12:00", description: "8 AM - 12 PM" },
      { id: "afternoon", label: "Afternoon", startTime: "12:00", endTime: "17:00", description: "12 PM - 5 PM" },
      { id: "evening", label: "Evening", startTime: "17:00", endTime: "23:00", description: "5 PM - 11 PM" },
      { id: "full-day", label: "Full Day", startTime: "08:00", endTime: "23:00", description: "8 AM - 11 PM" },
    ]) },
  ],

  themeSlots: [],
  rules: [],
  variants: [
    { id: "default", name: "Time Picker", description: "Dropdown start/end time selection" },
    { id: "blocks", name: "Time Blocks", description: "Pre-defined time block cards" },
    { id: "slider", name: "Time Slider", description: "Visual slider for duration" },
  ],
};
