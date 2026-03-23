import type { WidgetTemplate } from "../types";

export const siteVisitSchedulerTemplate: WidgetTemplate = {
  id: "site-visit-scheduler",
  name: "Site Visit Scheduler",
  icon: "📅",
  category: "data-collection",
  description: "Schedule a venue tour or site visit. Shows available dates/times and collects visitor details.",
  aiDescription: "Use site-visit-scheduler when the business wants to offer venue tours, site visits, or in-person consultations as part of the quotation process. This widget shows a calendar with available tour dates, time slot selection, and collects visitor details (name, phone, group size, questions). It integrates with the booking system to reserve tour slots. Place this NEAR THE END of the funnel — after the customer has seen pricing and before or alongside the contact form. Customers who book site visits convert at 3-5x the rate of those who don't.",
  aiConfusionNotes: "Do NOT use date-picker for site visits — date-picker is for event dates, not tour scheduling. Do NOT use contact-form for tour requests — site-visit-scheduler combines calendar selection with contact collection in one purpose-built widget. Do NOT use time-block-picker — that's for event duration, not appointment booking.",
  bestFor: ["venue tour", "site visit", "showround", "consultation booking", "property viewing", "walk-through"],
  notFor: ["event date selection", "general appointments", "online meetings"],
  tags: ["tour", "site-visit", "appointment", "calendar", "scheduling", "venue-tour", "showround", "wedding", "events", "venue"],
  industries: ["wedding-venue", "event-venue", "hotel", "resort", "conference-center", "banquet-hall", "estate"],
  complexity: "moderate",
  inputs: [
    { name: "eventDate", type: "string", label: "Planned Event Date", description: "So the tour can be scheduled before the event" },
    { name: "contactInfo", type: "object", label: "Contact Info", description: "Pre-fill visitor details if already collected" },
  ],
  outputs: [
    { name: "tourBooking", type: "object", label: "Tour Booking", description: "Selected tour date, time, and visitor details" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Schedule a Venue Tour" },
    { name: "subtitle", type: "text", label: "Subtitle", defaultValue: "See the space in person — tours are complimentary and take about 45 minutes" },
    { name: "tourDuration", type: "number", label: "Tour Duration (minutes)", defaultValue: 45 },
    { name: "availableDays", type: "json", label: "Available Days of Week", defaultValue: JSON.stringify([
      { day: "monday", enabled: true },
      { day: "tuesday", enabled: true },
      { day: "wednesday", enabled: true },
      { day: "thursday", enabled: true },
      { day: "friday", enabled: true },
      { day: "saturday", enabled: true },
      { day: "sunday", enabled: false },
    ]) },
    { name: "timeSlots", type: "json", label: "Available Time Slots", defaultValue: JSON.stringify([
      { id: "morning", label: "Morning Tour", startTime: "10:00", endTime: "10:45" },
      { id: "midday", label: "Midday Tour", startTime: "12:00", endTime: "12:45" },
      { id: "afternoon", label: "Afternoon Tour", startTime: "14:00", endTime: "14:45" },
      { id: "evening", label: "Evening Tour", startTime: "16:00", endTime: "16:45" },
    ]) },
    { name: "leadTimeDays", type: "number", label: "Minimum Lead Time (days)", defaultValue: 2 },
    { name: "maxAdvanceDays", type: "number", label: "Max Advance Booking (days)", defaultValue: 60 },
    { name: "collectPhone", type: "boolean", label: "Collect Phone Number", defaultValue: true },
    { name: "collectGroupSize", type: "boolean", label: "Ask How Many Visiting", defaultValue: true },
    { name: "collectQuestions", type: "boolean", label: "Ask for Questions/Notes", defaultValue: true },
    { name: "confirmationMessage", type: "text", label: "Confirmation Message", defaultValue: "Your tour is scheduled! We'll send a confirmation email with directions and parking info." },
    { name: "optional", type: "boolean", label: "Make Tour Optional (show Skip button)", defaultValue: true },
  ],

  themeSlots: [],
  rules: [],
  variants: [
    { id: "default", name: "Calendar + Time Slots", description: "Full calendar with available slots" },
    { id: "compact", name: "Quick Pick", description: "Next 5 available slots as cards" },
  ],
};
