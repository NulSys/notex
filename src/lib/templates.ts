export interface Template {
  id: string;
  name: string;
  content: () => string;
}

/** Built-in new-note templates surfaced in the command palette. */
export const TEMPLATES: Template[] = [
  {
    id: "meeting",
    name: "Meeting notes",
    content: () =>
      `# Meeting — \n\n**Attendees:** \n\n## Agenda\n\n- \n\n## Notes\n\n- \n\n## Action items\n\n- [ ] `,
  },
  {
    id: "todo",
    name: "To-do list",
    content: () => `# To-do\n\n- [ ] \n- [ ] \n- [ ] `,
  },
  {
    id: "journal",
    name: "Journal entry",
    content: () => `# Journal\n\n## Today\n\n\n\n## Grateful for\n\n- `,
  },
  {
    id: "project",
    name: "Project plan",
    content: () =>
      `# Project: \n\n## Goal\n\n\n\n## Milestones\n\n- [ ] \n\n## Notes\n\n- `,
  },
];
